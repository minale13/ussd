import crypto from 'node:crypto';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { pool } from '../db.js';
import { MockPaymentProvider, TemporaryProviderError, type PaymentProvider } from '../payments/payment-provider.js';
import { transitionWithdrawal } from '../services/withdrawal.service.js';

export async function processWithdrawal(withdrawalId: string, provider: PaymentProvider): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE', [withdrawalId]);
    const withdrawal = result.rows[0];
    if (!withdrawal || ['COMPLETED', 'FAILED', 'CANCELLED'].includes(withdrawal.status)) { await client.query('ROLLBACK'); return; }
    if (withdrawal.status === 'PENDING') await transitionWithdrawal(client, withdrawal.id, 'PENDING', 'PROCESSING');
    const attempt = await client.query(
      `INSERT INTO withdrawal_attempts (withdrawal_id, attempt_number, status)
       SELECT $1, COALESCE(MAX(attempt_number), 0) + 1, 'PROCESSING' FROM withdrawal_attempts WHERE withdrawal_id = $1
       RETURNING attempt_number`, [withdrawal.id]
    );
    await client.query('COMMIT');

    let providerResult;
    try {
      providerResult = withdrawal.provider_transaction_id
        ? await provider.checkWithdrawalStatus(withdrawal.provider_transaction_id)
        : await provider.initiateWithdrawal({ transactionId: withdrawal.transaction_id, amount: withdrawal.amount, currency: withdrawal.currency, destinationType: withdrawal.destination_type, destination: withdrawal.destination });
    } catch (error) {
      const providerTransactionId = error instanceof TemporaryProviderError ? error.providerTransactionId : undefined;
      await pool.query('UPDATE withdrawal_attempts SET status = $1, provider_transaction_id = $2, response = $3 WHERE withdrawal_id = $4 AND attempt_number = $5', ['RETRYABLE_FAILURE', providerTransactionId ?? null, { message: error instanceof Error ? error.message : 'unknown' }, withdrawal.id, attempt.rows[0].attempt_number]);
      if (providerTransactionId) await pool.query('UPDATE withdrawals SET provider_transaction_id = COALESCE(provider_transaction_id, $1), updated_at = now() WHERE id = $2', [providerTransactionId, withdrawal.id]);
      throw error;
    }

    const updateClient = await pool.connect();
    try {
      await updateClient.query('BEGIN');
      await updateClient.query(
        'UPDATE withdrawals SET provider_transaction_id = COALESCE(provider_transaction_id, $1), updated_at = now() WHERE id = $2',
        [providerResult.providerTransactionId, withdrawal.id]
      );
      await updateClient.query('UPDATE withdrawal_attempts SET status = $1, provider_transaction_id = $2, response = $3 WHERE withdrawal_id = $4 AND attempt_number = $5', [providerResult.status, providerResult.providerTransactionId, providerResult, withdrawal.id, attempt.rows[0].attempt_number]);
      if (providerResult.status === 'COMPLETED' || providerResult.status === 'FAILED') {
        const transition = providerResult.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED';
        const changed = await transitionWithdrawal(updateClient, withdrawal.id, 'PROCESSING', transition);
        if (changed) {
          const wallet = await updateClient.query('SELECT id, available_balance, reserved_balance FROM wallets WHERE user_id = $1 FOR UPDATE', [withdrawal.user_id]);
          const updatedWallet = await updateClient.query(
            `UPDATE wallets
             SET available_balance = available_balance + CASE WHEN $1 = 'FAILED' THEN $2::numeric ELSE 0::numeric END,
                 reserved_balance = reserved_balance - $2::numeric,
                 updated_at = now()
             WHERE id = $3
             RETURNING available_balance`,
            [transition, withdrawal.amount, wallet.rows[0].id]
          );
          if (!updatedWallet.rows[0]) throw new Error('WALLET_NOT_FOUND');
          await updateClient.query(
            `INSERT INTO wallet_transactions
             (id, user_id, withdrawal_id, type, amount, balance_before, balance_after, status, reference)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'POSTED',$8)`,
            [crypto.randomUUID(), withdrawal.user_id, withdrawal.id, transition === 'FAILED' ? 'WITHDRAWAL_RELEASE' : 'WITHDRAWAL_COMPLETION', withdrawal.amount, wallet.rows[0].available_balance, updatedWallet.rows[0].available_balance, `${withdrawal.transaction_id}-${transition}`]
          );
        }
      }
      await updateClient.query('COMMIT');
    } catch (error) { await updateClient.query('ROLLBACK'); throw error; } finally { updateClient.release(); }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally { client.release(); }
}

export async function recoverStaleProcessing(): Promise<number> {
  const result = await pool.query(
    `UPDATE withdrawals SET status = 'PENDING', updated_at = now()
     WHERE status = 'PROCESSING'
       AND updated_at < now() - ($1 * interval '1 second')
     RETURNING id`,
    [env.PROCESSING_TIMEOUT_SECONDS]
  );
  return result.rowCount ?? 0;
}

export function createWithdrawalWorker(provider: PaymentProvider = new MockPaymentProvider()) {
  const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  return new Worker<{ withdrawalId: string }>('withdrawals', async (job) => {
    await processWithdrawal(job.data.withdrawalId, provider);
  }, { connection, concurrency: env.WORKER_CONCURRENCY });
}

createWithdrawalWorker();
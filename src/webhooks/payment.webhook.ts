import { createHmac, timingSafeEqual } from 'node:crypto';
import { pool } from '../db.js';
import { canTransition, type WithdrawalStatus } from '../types/withdrawal.js';
import { env } from '../config/env.js';

export interface PaymentWebhookPayload {
  eventId: string;
  eventType: string;
  providerTransactionId: string;
  status: 'COMPLETED' | 'FAILED';
  failureReason?: string;
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const expected = createHmac('sha256', env.PAYMENT_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const provided = signature.startsWith('sha256=') ? signature.slice(7) : signature;
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export async function processPaymentWebhook(provider: string, payload: PaymentWebhookPayload, rawBody: string, signature: string) {
  if (!verifyWebhookSignature(rawBody, signature)) throw new Error('INVALID_WEBHOOK_SIGNATURE');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const event = await client.query(
      `INSERT INTO webhook_events (provider, event_id, event_type, payload, signature_valid)
       VALUES ($1,$2,$3,$4,true) ON CONFLICT (provider, event_id) DO NOTHING RETURNING id`,
      [provider, payload.eventId, payload.eventType, payload]
    );
    if (!event.rows[0]) {
      await client.query('ROLLBACK');
      return { duplicate: true };
    }

    const withdrawalResult = await client.query(
      'SELECT * FROM withdrawals WHERE provider_transaction_id = $1 FOR UPDATE', [payload.providerTransactionId]
    );
    const withdrawal = withdrawalResult.rows[0];
    if (!withdrawal) throw new Error('UNKNOWN_WITHDRAWAL');
    if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(withdrawal.status)) {
      await client.query('UPDATE webhook_events SET processed_at = now() WHERE id = $1', [event.rows[0].id]);
      await client.query('COMMIT');
      return { duplicate: true };
    }
    if (withdrawal.status === 'PENDING') {
      await client.query("UPDATE withdrawals SET status = 'PROCESSING', updated_at = now() WHERE id = $1", [withdrawal.id]);
    }
    const nextStatus = payload.status as WithdrawalStatus;
    if (!canTransition('PROCESSING', nextStatus)) throw new Error('INVALID_STATE_TRANSITION');
    const wallet = await client.query('SELECT id, available_balance, reserved_balance FROM wallets WHERE user_id = $1 FOR UPDATE', [withdrawal.user_id]);
    if (!wallet.rows[0]) throw new Error('WALLET_NOT_FOUND');
    await client.query(
      'UPDATE withdrawals SET status = $1, failure_reason = $2, updated_at = now() WHERE id = $3 AND status = $4',
      [nextStatus, payload.failureReason ?? null, withdrawal.id, 'PROCESSING']
    );
    const updatedWallet = await client.query(
      `UPDATE wallets
       SET available_balance = available_balance + CASE WHEN $1 = 'FAILED' THEN $2::numeric ELSE 0::numeric END,
           reserved_balance = reserved_balance - $2::numeric,
           updated_at = now()
       WHERE id = $3
       RETURNING available_balance`,
      [nextStatus, withdrawal.amount, wallet.rows[0].id]
    );
    if (!updatedWallet.rows[0]) throw new Error('WALLET_NOT_FOUND');
    await client.query(
      `INSERT INTO wallet_transactions
       (id, user_id, withdrawal_id, type, amount, balance_before, balance_after, status, reference)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,'POSTED',$7)`,
      [withdrawal.user_id, withdrawal.id, nextStatus === 'FAILED' ? 'WITHDRAWAL_RELEASE' : 'WITHDRAWAL_COMPLETION', withdrawal.amount, wallet.rows[0].available_balance, updatedWallet.rows[0].available_balance, `${withdrawal.transaction_id}-WEBHOOK-${nextStatus}`]
    );
    await client.query('UPDATE webhook_events SET processed_at = now() WHERE id = $1', [event.rows[0].id]);
    await client.query('COMMIT');
    return { duplicate: false, status: nextStatus, transactionId: withdrawal.transaction_id };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
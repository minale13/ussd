import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from '../db.js';
import { canTransition, type WithdrawalStatus } from '../types/withdrawal.js';
import { ANY_TARGET_DEVICE, normalizeTargetDeviceId } from '../utils/target-device.js';

export interface CreateWithdrawalInput {
  userId: string;
  amount: string;
  currency: string;
  destinationType: string;
  destination: string;
  idempotencyKey: string;
}

export interface CreateWithdrawalResult {
  withdrawal: Record<string, unknown>;
  existing: boolean;
}

function transactionId(): string {
  return `WD-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
}

export async function createWithdrawal(input: CreateWithdrawalInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT id, transaction_id, status, amount, currency, created_at FROM withdrawals WHERE user_id = $1 AND idempotency_key = $2',
      [input.userId, input.idempotencyKey]
    );
    if (existing.rows[0]) {
      await client.query('ROLLBACK');
      return { withdrawal: existing.rows[0], existing: true };
    }

    const wallet = await client.query(
      'SELECT id, available_balance, reserved_balance FROM wallets WHERE user_id = $1 FOR UPDATE', [input.userId]
    );
    if (!wallet.rows[0]) throw new Error('WALLET_NOT_FOUND');
    if (wallet.rows[0].available_balance === undefined) throw new Error('WALLET_NOT_FOUND');
    const balanceCheck = await client.query(
      'SELECT 1 FROM wallets WHERE id = $1 AND available_balance >= $2::numeric',
      [wallet.rows[0].id, input.amount]
    );
    if (!balanceCheck.rows[0]) throw new Error('INSUFFICIENT_BALANCE');

    const id = randomUUID();
    const txId = transactionId();
    const before = wallet.rows[0].available_balance;
    const withdrawal = await client.query(
      `INSERT INTO withdrawals
       (id, transaction_id, user_id, idempotency_key, amount, currency, destination_type, destination, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')
       RETURNING id, transaction_id, status, amount, currency, created_at`,
      [id, txId, input.userId, input.idempotencyKey, input.amount, input.currency, input.destinationType, input.destination]
    );
    const updatedWallet = await client.query(
      `UPDATE wallets
       SET available_balance = available_balance - $1::numeric,
           reserved_balance = reserved_balance + $1::numeric,
           updated_at = now()
       WHERE id = $2 AND available_balance >= $1::numeric
       RETURNING available_balance, reserved_balance`,
      [input.amount, wallet.rows[0].id]
    );
    if (!updatedWallet.rows[0]) throw new Error('INSUFFICIENT_BALANCE');
    const after = updatedWallet.rows[0].available_balance;
    await client.query(
      `INSERT INTO wallet_transactions
       (id, user_id, withdrawal_id, type, amount, balance_before, balance_after, status, reference)
       VALUES ($1,$2,$3,'WITHDRAWAL_RESERVATION',$4,$5,$6,'POSTED',$7)`,
      [randomUUID(), input.userId, id, input.amount, before, after, txId]
    );
    await client.query(
      `INSERT INTO idempotency_keys (key, user_id, withdrawal_id) VALUES ($1,$2,$3)`,
      [input.idempotencyKey, input.userId, id]
    );
    await client.query(
      `INSERT INTO outbox_events (id, event_type, aggregate_id, payload)
       VALUES ($1, 'WITHDRAWAL_CREATED', $2, $3)`,
      [randomUUID(), id, JSON.stringify({ withdrawalId: id })]
    );
    await client.query('COMMIT');
    return { withdrawal: withdrawal.rows[0], existing: false };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof Error && 'code' in error && error.code === '23505') {
      const existing = await pool.query(
        'SELECT id, transaction_id, status, amount, currency, created_at FROM withdrawals WHERE user_id = $1 AND idempotency_key = $2',
        [input.userId, input.idempotencyKey]
      );
      if (existing.rows[0]) return { withdrawal: existing.rows[0], existing: true };
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function getWithdrawal(id: string, userId: string) {
  const result = await pool.query(
    'SELECT id, transaction_id, user_id, amount, currency, destination_type, status, provider_transaction_id, failure_reason, created_at, updated_at FROM withdrawals WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows[0];
}

export async function cancelWithdrawal(id: string, userId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT * FROM withdrawals WHERE id = $1 AND user_id = $2 FOR UPDATE', [id, userId]);
    const withdrawal = result.rows[0];
    if (!withdrawal) throw new Error('NOT_FOUND');
    if (!canTransition(withdrawal.status as WithdrawalStatus, 'CANCELLED')) throw new Error('INVALID_STATE_TRANSITION');
    const wallet = await client.query('SELECT id, available_balance, reserved_balance FROM wallets WHERE user_id = $1 FOR UPDATE', [userId]);
    const before = wallet.rows[0].available_balance;
    await client.query("UPDATE withdrawals SET status = 'CANCELLED', updated_at = now() WHERE id = $1", [id]);
    const updatedWallet = await client.query(
      `UPDATE wallets
       SET available_balance = available_balance + $1::numeric,
           reserved_balance = reserved_balance - $1::numeric,
           updated_at = now()
       WHERE id = $2
       RETURNING available_balance`,
      [withdrawal.amount, wallet.rows[0].id]
    );
    const after = updatedWallet.rows[0].available_balance;
    await client.query(
      `INSERT INTO wallet_transactions
       (id, user_id, withdrawal_id, type, amount, balance_before, balance_after, status, reference)
       VALUES ($1,$2,$3,'WITHDRAWAL_RELEASE',$4,$5,$6,'POSTED',$7)`,
      [randomUUID(), userId, id, withdrawal.amount, before, after, `${withdrawal.transaction_id}-CANCEL`]
    );
    await client.query('COMMIT');
    return { ...withdrawal, status: 'CANCELLED' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function transitionWithdrawal(client: PoolClient, id: string, from: WithdrawalStatus, to: WithdrawalStatus) {
  if (!canTransition(from, to)) throw new Error('INVALID_STATE_TRANSITION');
  const result = await client.query(
    'UPDATE withdrawals SET status = $1, updated_at = now() WHERE id = $2 AND status = $3 RETURNING *', [to, id, from]
  );
  return result.rows[0];
}

export async function claimPendingWithdrawals(deviceId: string, phoneModel: string, limit = 1) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const device = await client.query(
      `INSERT INTO mobile_devices (device_id, phone_model) VALUES ($1, $2)
       ON CONFLICT (device_id) DO UPDATE SET phone_model = $2, last_seen_at = now(), updated_at = now()
       RETURNING active_status`,
      [deviceId, phoneModel]
    );
    if (!device.rows[0].active_status) {
      await client.query('ROLLBACK');
      throw new Error('DEVICE_BLOCKED');
    }
    const result = await client.query(
    `UPDATE withdrawals
     SET status = 'PROCESSING',
         provider_transaction_id = COALESCE(provider_transaction_id, 'USSD-' || transaction_id),
         updated_at = now()
     WHERE id IN (
       SELECT id FROM withdrawals
       WHERE status = 'PENDING'
         AND (target_device_id IS NULL OR target_device_id = $3 OR target_device_id = $2)
       ORDER BY created_at
       FOR UPDATE SKIP LOCKED
       LIMIT $1
     )
    RETURNING id, transaction_id, amount, currency, destination_type, destination,
        status, provider_transaction_id, channel, target_device_id, created_at`,
      [limit, deviceId, ANY_TARGET_DEVICE]
    );
    await client.query('COMMIT');
    return result.rows;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface CreateManualWithdrawalInput {
  userId: string;
  destinationPhone: string;
  amount: string;
  channel: 'TELEBIRR' | 'CBE';
  notes?: string;
  /** Device that may claim the withdrawal. `'ANY'`, blank or omitted lets any active device claim it. */
  targetDeviceId?: string | null;
}

export async function createManualWithdrawal(input: CreateManualWithdrawalInput) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const targetDeviceId = normalizeTargetDeviceId(input.targetDeviceId);
    if (targetDeviceId) {
      const target = await client.query('SELECT active_status FROM mobile_devices WHERE device_id = $1', [targetDeviceId]);
      if (!target.rows[0]) throw new Error('TARGET_DEVICE_NOT_FOUND');
      if (!target.rows[0].active_status) throw new Error('TARGET_DEVICE_BLOCKED');
    }
    const wallet = await client.query('SELECT id, available_balance FROM wallets WHERE user_id = $1 FOR UPDATE', [input.userId]);
    if (!wallet.rows[0]) throw new Error('WALLET_NOT_FOUND');
    const withdrawalId = randomUUID();
    const transaction = transactionId();
    const reserved = await client.query(
      `UPDATE wallets SET available_balance = available_balance - $1::numeric,
       reserved_balance = reserved_balance + $1::numeric, updated_at = now()
       WHERE id = $2 AND available_balance >= $1::numeric RETURNING available_balance`,
      [input.amount, wallet.rows[0].id]
    );
    if (!reserved.rows[0]) throw new Error('INSUFFICIENT_BALANCE');
    const withdrawal = await client.query(
      `INSERT INTO withdrawals
       (id, transaction_id, user_id, idempotency_key, amount, currency, destination_type, destination, status, channel, notes, target_device_id)
       VALUES ($1, $2, $3, $4, $5, 'ETB', 'PHONE', $6, 'PENDING', $7, $8, $9)
       RETURNING id, transaction_id, status, amount, currency, destination_type, destination, channel, notes, target_device_id, created_at`,
      [withdrawalId, transaction, input.userId, `ADMIN-${withdrawalId}`, input.amount, input.destinationPhone, input.channel, input.notes ?? null, targetDeviceId]
    );
    await client.query(
      `INSERT INTO wallet_transactions
       (id, user_id, withdrawal_id, type, amount, balance_before, balance_after, status, reference)
       VALUES ($1, $2, $3, 'WITHDRAWAL_RESERVATION', $4, $5, $6, 'POSTED', $7)`,
      [randomUUID(), input.userId, withdrawalId, input.amount, wallet.rows[0].available_balance, reserved.rows[0].available_balance, transaction]
    );
    await client.query(
      `INSERT INTO outbox_events (id, event_type, aggregate_id, payload) VALUES ($1, 'WITHDRAWAL_CREATED', $2, $3)`,
      [randomUUID(), withdrawalId, JSON.stringify({ withdrawalId, source: 'ADMIN_MANUAL', channel: input.channel, targetDeviceId })]
    );
    await client.query('COMMIT');
    return withdrawal.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
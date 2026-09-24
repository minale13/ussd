import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import { describe, expect, it } from 'vitest';
import { integrationServicesAvailable } from './integration-availability.js';

const enabled = await integrationServicesAvailable();
const suite = enabled ? describe : describe.skip;

suite('targeted device withdrawal claims', () => {
  it('only lets the assigned device claim a targeted withdrawal', async () => {
    const { pool } = await import('../src/db.js');
    const { claimPendingWithdrawals, createManualWithdrawal } = await import('../src/services/withdrawal.service.js');
    const userId = randomUUID();
    const targetDevice = `test-target-${userId}`;
    const otherDevice = `test-other-${userId}`;
    let withdrawalId: string | null = null;
    try {
      await pool.query('INSERT INTO users (id, email) VALUES ($1, $2)', [userId, `${userId}@test.invalid`]);
      await pool.query('INSERT INTO wallets (user_id, available_balance, reserved_balance, currency) VALUES ($1, 500, 0, $2)', [userId, 'ETB']);
      await pool.query(
        `INSERT INTO mobile_devices (device_id, phone_model, active_status) VALUES ($1, 'Target Device', true), ($2, 'Other Device', true)
         ON CONFLICT (device_id) DO UPDATE SET active_status = true, last_seen_at = now()`,
        [targetDevice, otherDevice]
      );

      const withdrawal = await createManualWithdrawal({
        userId,
        destinationPhone: '251900000000',
        amount: '100.00',
        channel: 'TELEBIRR',
        targetDeviceId: targetDevice
      });
      withdrawalId = withdrawal.id as string;
      expect(withdrawal.target_device_id).toBe(targetDevice);

      const otherDeviceClaims = await claimPendingWithdrawals(otherDevice, 'Other Device', 5);
      expect(otherDeviceClaims.filter((row) => row.id === withdrawalId)).toHaveLength(0);

      const targetDeviceClaims = await claimPendingWithdrawals(targetDevice, 'Target Device', 5);
      const claimed = targetDeviceClaims.find((row) => row.id === withdrawalId);
      expect(claimed?.target_device_id).toBe(targetDevice);
      expect(claimed?.status).toBe('PROCESSING');
    } finally {
      if (withdrawalId) {
        await pool.query('DELETE FROM wallet_transactions WHERE withdrawal_id = $1', [withdrawalId]);
        await pool.query('DELETE FROM outbox_events WHERE aggregate_id = $1', [withdrawalId]);
        await pool.query('DELETE FROM withdrawals WHERE id = $1', [withdrawalId]);
      }
      await pool.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await pool.query('DELETE FROM mobile_devices WHERE device_id IN ($1, $2)', [targetDevice, otherDevice]);
    }
  }, 30000);

  it('leaves an ANY withdrawal claimable by any active device', async () => {
    const { pool } = await import('../src/db.js');
    const { claimPendingWithdrawals, createManualWithdrawal } = await import('../src/services/withdrawal.service.js');
    const userId = randomUUID();
    const anyDevice = `test-any-${userId}`;
    let withdrawalId: string | null = null;
    try {
      await pool.query('INSERT INTO users (id, email) VALUES ($1, $2)', [userId, `${userId}@test.invalid`]);
      await pool.query('INSERT INTO wallets (user_id, available_balance, reserved_balance, currency) VALUES ($1, 500, 0, $2)', [userId, 'ETB']);

      const withdrawal = await createManualWithdrawal({
        userId,
        destinationPhone: '251900000001',
        amount: '25.00',
        channel: 'CBE',
        targetDeviceId: 'ANY'
      });
      withdrawalId = withdrawal.id as string;
      expect(withdrawal.target_device_id).toBeNull();

      const claimed = (await claimPendingWithdrawals(anyDevice, 'Any Device', 5)).find((row) => row.id === withdrawalId);
      expect(claimed?.status).toBe('PROCESSING');
      expect(claimed?.target_device_id).toBeNull();
    } finally {
      if (withdrawalId) {
        await pool.query('DELETE FROM wallet_transactions WHERE withdrawal_id = $1', [withdrawalId]);
        await pool.query('DELETE FROM outbox_events WHERE aggregate_id = $1', [withdrawalId]);
        await pool.query('DELETE FROM withdrawals WHERE id = $1', [withdrawalId]);
      }
      await pool.query('DELETE FROM wallets WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await pool.query('DELETE FROM mobile_devices WHERE device_id = $1', [anyDevice]);
    }
  }, 30000);
});

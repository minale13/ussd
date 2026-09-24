import { pool } from '../db.js';

export async function getFinancialOverview() {
  const result = await pool.query(`
    SELECT
      COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE type IN ('CASH_IN', 'DEPOSIT') AND status = 'POSTED'), 0)::text AS total_cash_in,
      COALESCE((SELECT SUM(amount) FROM withdrawals WHERE status = 'COMPLETED'), 0)::text AS total_withdrawals,
      COALESCE((SELECT SUM(available_balance) FROM wallets), 0)::text AS remaining_balance`);
  return result.rows[0];
}

export async function listDevices() {
  const result = await pool.query('SELECT device_id, phone_model, active_status, last_seen_at, created_at, updated_at FROM mobile_devices ORDER BY last_seen_at DESC');
  return result.rows;
}

export async function setDeviceStatus(deviceId: string, activeStatus: boolean) {
  const result = await pool.query(
    `UPDATE mobile_devices SET active_status = $2, updated_at = now()
     WHERE device_id = $1
     RETURNING device_id, phone_model, active_status, last_seen_at, created_at, updated_at`,
    [deviceId, activeStatus]
  );
  return result.rows[0];
}
import { pool } from '../db.js';

/**
 * Headline settlement figures for the admin console.
 *
 * The three lifetime totals are the numbers an operator reconciles against, so
 * they are cast to text to hand back NUMERIC without JS float rounding. The
 * `*_today` columns are the same measures restricted to the current gateway
 * day; they are additive, so an older deployment that has not been migrated
 * simply reports null and the UI shows 0.00 rather than inventing a value.
 */
export async function getFinancialOverview() {
  const result = await pool.query(`
    SELECT
      COALESCE((SELECT SUM(amount) FROM wallet_transactions WHERE type IN ('CASH_IN', 'DEPOSIT') AND status = 'POSTED'), 0)::text AS total_cash_in,
      COALESCE((SELECT SUM(amount) FROM withdrawals WHERE status = 'COMPLETED'), 0)::text AS total_withdrawals,
      COALESCE((SELECT SUM(available_balance) FROM wallets), 0)::text AS remaining_balance,
      COALESCE((SELECT SUM(amount) FROM wallet_transactions
        WHERE type IN ('CASH_IN', 'DEPOSIT') AND status = 'POSTED'
          AND created_at >= date_trunc('day', now())), 0)::text AS cash_in_today,
      COALESCE((SELECT SUM(amount) FROM withdrawals
        WHERE status = 'COMPLETED' AND created_at >= date_trunc('day', now())), 0)::text AS withdrawals_today,
      COALESCE((SELECT SUM(available_balance) FROM wallets), 0)::text AS balance_today`);
  return result.rows[0];
}

/**
 * How long a device may go without polling before the console shows it as
 * offline. The Android client polls every 5s, so this is a generous window
 * that only trips when a phone is genuinely gone (offline, app killed,
 * gateway stopped) rather than between two ticks.
 */
export const DEVICE_ONLINE_WINDOW_SECONDS = 90;

/**
 * Fleet columns the console renders. `online` is derived from `last_seen_at`
 * in SQL so the API and the dashboard can never disagree about it.
 */
const DEVICE_COLUMNS = `device_id, phone_model, active_status, sim_slot, channel, carrier,
  battery_level, network_type, app_version, last_seen_at, created_at, updated_at,
  (last_seen_at > now() - make_interval(secs => $1)) AS online`;

/**
 * Every registered Android device, most recently seen first, with the fleet
 * telemetry it last reported: active SIM and channel, battery and network.
 */
export async function listDevices(onlineWindowSeconds = DEVICE_ONLINE_WINDOW_SECONDS) {
  const result = await pool.query(
    `SELECT ${DEVICE_COLUMNS} FROM mobile_devices ORDER BY last_seen_at DESC`,
    [onlineWindowSeconds]
  );
  return result.rows;
}

export async function setDeviceStatus(deviceId: string, activeStatus: boolean) {
  const result = await pool.query(
    `UPDATE mobile_devices SET active_status = $2, updated_at = now()
     WHERE device_id = $1
     RETURNING ${DEVICE_COLUMNS}`,
    [deviceId, activeStatus, DEVICE_ONLINE_WINDOW_SECONDS]
  );
  return result.rows[0];
}

/**
 * Centralized payout history for the console, newest first. This is the
 * server's own record, so it covers every device in the fleet at once rather
 * than whatever one phone happened to keep locally.
 *
 * A payout that names a target device is attributed to that device. An
 * auto-assigned payout has no stored owner, so `device_id` stays NULL and the
 * console labels the row "unassigned" rather than guessing a phone.
 */
export async function listTransactions(limit = 50) {
  const result = await pool.query(
    `SELECT
       w.id,
       w.transaction_id,
       w.amount::text AS amount,
       w.currency,
       w.destination,
       w.status,
       w.channel,
       w.target_device_id,
       w.provider_transaction_id,
       w.created_at,
       w.updated_at,
       d.device_id,
       d.phone_model AS device_model
     FROM withdrawals w
     LEFT JOIN mobile_devices d ON d.device_id = w.target_device_id
     ORDER BY w.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}
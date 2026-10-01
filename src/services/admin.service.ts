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

/** Clamps a caller-supplied page size so a crafted value cannot ask for everything. */
function clampLimit(value: unknown, fallback = 25, max = 200): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
}

/** Clamps an offset to a non-negative integer. */
function clampOffset(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

export type WithdrawalFilter = { status?: string; channel?: string };

/**
 * Looks up just enough of a withdrawal for an admin action to act on it.
 *
 * The owning user is required because `cancelWithdrawal` releases the reserved
 * balance against that wallet, so an admin cancel still runs through the owner
 * scoped code path rather than a parallel admin-only one.
 */
export async function findWithdrawalOwner(id: string) {
  const result = await pool.query(
    'SELECT id, transaction_id, user_id, status, amount::text AS amount FROM withdrawals WHERE id = $1',
    [id]
  );
  return result.rows[0];
}

/**
 * The withdrawal queue: every payout with the operational detail an operator
 * needs to decide what to do next - why it failed, which device owns it, how
 * many provider attempts it took, and whether it can still be acted on.
 *
 * Filters are parameterised rather than interpolated so the console cannot be
 * used to smuggle SQL through the query string.
 */
export async function listWithdrawals(
  filter: WithdrawalFilter = {},
  limit?: unknown,
  offset?: unknown
) {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filter.status) {
    params.push(filter.status);
    where.push(`w.status = $${params.length}`);
  }
  if (filter.channel) {
    params.push(filter.channel);
    where.push(`w.channel = $${params.length}`);
  }

  params.push(clampLimit(limit));
  params.push(clampOffset(offset));

  const result = await pool.query(
    `SELECT
       w.id,
       w.transaction_id,
       w.amount::text AS amount,
       w.currency,
       w.destination,
       w.destination_type,
       w.status,
       w.channel,
       w.notes,
       w.failure_reason,
       w.provider_transaction_id,
       w.target_device_id,
       w.user_id,
       w.created_at,
       w.updated_at,
       d.device_id,
       d.phone_model AS device_model,
       (SELECT COUNT(*)::int FROM withdrawal_attempts a WHERE a.withdrawal_id = w.id) AS attempt_count
     FROM withdrawals w
     LEFT JOIN mobile_devices d ON d.device_id = w.target_device_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY w.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  return result.rows;
}

/**
 * Users with their wallet balance and payout activity.
 *
 * There is no role column in the schema, so the console does not invent one:
 * it derives operator authority from the configured admin withdrawal user.
 */
export async function listUsers(limit?: unknown, offset?: unknown) {
  const result = await pool.query(
    `SELECT
       u.id,
       u.email,
       u.created_at,
       u.updated_at,
       COALESCE(w.available_balance, 0)::text AS available_balance,
       COALESCE(w.reserved_balance, 0)::text AS reserved_balance,
       COALESCE(w.currency, 'ETB') AS currency,
       (w.id IS NOT NULL) AS has_wallet,
       (SELECT COUNT(*)::int FROM withdrawals x WHERE x.user_id = u.id) AS withdrawal_count,
       (SELECT MAX(x.created_at) FROM withdrawals x WHERE x.user_id = u.id) AS last_withdrawal_at
     FROM users u
     LEFT JOIN wallets w ON w.user_id = u.id
     ORDER BY u.created_at DESC
     LIMIT $1 OFFSET $2`,
    [clampLimit(limit), clampOffset(offset)]
  );
  return result.rows;
}

/**
 * Operational activity, merged from the three tables that record what the
 * gateway actually did: inbound provider webhooks, per-attempt payout results
 * and the outbox backlog.
 *
 * `level` is derived, not stored: a webhook that failed signature validation or
 * a provider attempt that did not succeed is what an operator means by an
 * error, and there is no log table that says so directly.
 */
export async function listActivity(limit?: unknown, level?: string) {
  const result = await pool.query(
    `SELECT kind, created_at, title, level, detail, settled
     FROM (
       SELECT
         'webhook'::text AS kind,
         e.created_at,
         COALESCE(e.event_type, 'webhook') AS title,
         CASE WHEN e.signature_valid IS FALSE THEN 'error'
              WHEN e.processed_at IS NULL THEN 'warn'
              ELSE 'info' END AS level,
         e.provider AS detail,
         (e.processed_at IS NOT NULL) AS settled
       FROM webhook_events e
       UNION ALL
       SELECT
         'attempt'::text,
         a.created_at,
         'payout attempt ' || a.attempt_number,
         CASE WHEN upper(a.status) IN ('COMPLETED', 'SUCCESS', 'SETTLED') THEN 'info' ELSE 'error' END,
         a.status,
         (upper(a.status) IN ('COMPLETED', 'SUCCESS', 'SETTLED'))
       FROM withdrawal_attempts a
       UNION ALL
       SELECT
         'outbox'::text,
         o.created_at,
         o.event_type,
         CASE WHEN o.published_at IS NULL THEN 'warn' ELSE 'info' END,
         CASE WHEN o.published_at IS NULL THEN 'unpublished' ELSE 'published' END,
         (o.published_at IS NOT NULL)
       FROM outbox_events o
     ) activity
     ${level ? 'WHERE level = $2' : ''}
     ORDER BY created_at DESC
     LIMIT $1`,
    level ? [clampLimit(limit, 50), level] : [clampLimit(limit, 50)]
  );
  return result.rows;
}

/**
 * Live gateway health for the settings view: whether the database answers and
 * what the fleet and queue currently look like.
 */
export async function getGatewayHealth() {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM mobile_devices) AS devices_total,
      (SELECT COUNT(*)::int FROM mobile_devices
        WHERE active_status
          AND last_seen_at > now() - make_interval(secs => $1)) AS devices_online,
      (SELECT COUNT(*)::int FROM withdrawals WHERE status = 'PENDING') AS pending_withdrawals,
      (SELECT COUNT(*)::int FROM withdrawals WHERE status = 'PROCESSING') AS processing_withdrawals,
      (SELECT COUNT(*)::int FROM withdrawals WHERE status = 'FAILED') AS failed_withdrawals,
      (SELECT COUNT(*)::int FROM outbox_events WHERE published_at IS NULL) AS outbox_backlog,
      (SELECT COUNT(*)::int FROM webhook_events WHERE signature_valid IS FALSE) AS rejected_webhooks
  `, [DEVICE_ONLINE_WINDOW_SECONDS]);
  return result.rows[0];
}
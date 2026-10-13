import { pool } from '../db.js';
import { DEVICE_ONLINE_WINDOW_SECONDS, deviceColumns } from './admin.service.js';

/**
 * The identity a handset reports about itself when it registers.
 *
 * Everything except the device id is optional: the app calls this endpoint the
 * moment it starts (before onboarding has collected a phone number or a
 * channel) as well as when onboarding completes, so an early call carries only
 * the id and the model while a later one fills the rest in.
 */
export interface RegisterDeviceInput {
  deviceId: string;
  phoneModel?: string | null;
  phoneNumber?: string | null;
  channel?: 'TELEBIRR' | 'CBE' | null;
  simSlot?: number | null;
  appVersion?: string | null;
  lastIp?: string | null;
}

/**
 * Creates (or refreshes) the fleet row for a device, independent of polling.
 *
 * This is the onboarding counterpart to the upsert inside
 * `claimPendingWithdrawals`: the poll proves a phone is alive *and able to work*,
 * whereas registration only proves it was installed. Both are idempotent on
 * `device_id` so a reinstall, a restarted app or a second registration after
 * onboarding all land on the same row.
 *
 * Two invariants matter here and are deliberately different from the poll:
 *
 *  - `active_status` is never written. An operator who blocked a handset must
 *    not have it un-blocked by the phone re-registering after an uninstall.
 *  - `enabled_banks` is never written. Those toggles belong to the console; a
 *    registration reports what the phone *is*, never what it is *allowed* to do.
 *
 * Each optional value is applied with COALESCE so a sparse early call cannot
 * erase a field a later, fuller call already stored: the startup registration
 * that knows only the device id must not wipe the phone number that the
 * onboarding registration wrote a moment earlier.
 *
 * The returned row uses the console's fleet columns. The online window is `$8`
 * here because `$1`..`$7` are already the device's own values - reusing `$1`
 * for `make_interval(secs => …)` would make Postgres treat the device id as a
 * number of seconds.
 */
export async function registerDevice(input: RegisterDeviceInput): Promise<Record<string, unknown>> {
  const result = await pool.query(
    `INSERT INTO mobile_devices
       (device_id, phone_model, phone_number, channel, sim_slot, app_version, last_ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (device_id) DO UPDATE SET
       phone_model = COALESCE(EXCLUDED.phone_model, mobile_devices.phone_model),
       phone_number = COALESCE(EXCLUDED.phone_number, mobile_devices.phone_number),
       channel = COALESCE(EXCLUDED.channel, mobile_devices.channel),
       sim_slot = COALESCE(EXCLUDED.sim_slot, mobile_devices.sim_slot),
       app_version = COALESCE(EXCLUDED.app_version, mobile_devices.app_version),
       last_ip = COALESCE(EXCLUDED.last_ip, mobile_devices.last_ip),
       last_seen_at = now(),
       updated_at = now()
     RETURNING ${deviceColumns('$8')}`,
    [
      input.deviceId,
      input.phoneModel ?? null,
      input.phoneNumber ?? null,
      input.channel ?? null,
      input.simSlot ?? null,
      input.appVersion ?? null,
      input.lastIp ?? null,
      DEVICE_ONLINE_WINDOW_SECONDS
    ]
  );
  return result.rows[0] as Record<string, unknown>;
}

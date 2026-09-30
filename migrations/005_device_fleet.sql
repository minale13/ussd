-- Device fleet telemetry. The Android client reports its live SIM, channel,
-- battery and network state on every poll; the web admin dashboard at /admin
-- renders it so an operator can see which phones are actually able to work.
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS sim_slot INTEGER;
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS battery_level INTEGER;
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS network_type TEXT;
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS app_version TEXT;

ALTER TABLE mobile_devices DROP CONSTRAINT IF EXISTS mobile_devices_channel_check;
ALTER TABLE mobile_devices ADD CONSTRAINT mobile_devices_channel_check
  CHECK (channel IS NULL OR channel IN ('TELEBIRR', 'CBE'));

-- A device that has polled within this window counts as online in the console.
ALTER TABLE mobile_devices DROP CONSTRAINT IF EXISTS mobile_devices_battery_check;
ALTER TABLE mobile_devices ADD CONSTRAINT mobile_devices_battery_check
  CHECK (battery_level IS NULL OR battery_level BETWEEN 0 AND 100);

CREATE TABLE IF NOT EXISTS mobile_devices (
  device_id TEXT PRIMARY KEY,
  phone_model TEXT NOT NULL,
  active_status BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mobile_devices_active_idx ON mobile_devices(active_status, last_seen_at);
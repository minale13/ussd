-- SMS sync: inbound provider notifications forwarded by the Android gateway.
--
-- These are *bank* movements observed on a device's SIM, which are a different
-- thing from the platform ledger. `wallet_transactions` is deliberately NOT
-- reused here: it carries NOT NULL `withdrawal_id` and a foreign key to
-- `withdrawals`, so it can only record money movement that the gateway itself
-- reserved for a payout. A deposit SMS has no such payout behind it.
CREATE TABLE IF NOT EXISTS gateway_sms_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES mobile_devices(device_id) ON DELETE CASCADE,
  channel TEXT CHECK (channel IS NULL OR channel IN ('TELEBIRR', 'CBE')),
  provider TEXT,
  sender TEXT,
  body TEXT NOT NULL,
  -- SHA-256 of the raw body. Handsets re-deliver the same message (rebroadcast,
  -- app restart, retry), so the unique index is what makes ingest idempotent.
  body_hash TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (direction IN ('CREDIT', 'DEBIT', 'UNKNOWN')),
  amount NUMERIC(20,2),
  reference TEXT,
  counterparty TEXT,
  account_balance NUMERIC(20,2),
  parsed BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS gateway_sms_events_dedupe_idx
  ON gateway_sms_events(device_id, body_hash);

CREATE INDEX IF NOT EXISTS gateway_sms_events_device_time_idx
  ON gateway_sms_events(device_id, received_at DESC);

-- The balance a bank reports by SMS is the balance of the account on that SIM,
-- so it belongs to the device. It is deliberately NOT written to `wallets`:
-- that table is the platform's own ledger and is what withdrawal reservations
-- debit, so mirroring an external balance into it would desynchronise the money
-- the gateway believes it can actually pay out.
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS bank_balance NUMERIC(20,2);
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS bank_balance_at TIMESTAMPTZ;

ALTER TABLE mobile_devices DROP CONSTRAINT IF EXISTS mobile_devices_bank_balance_check;
ALTER TABLE mobile_devices ADD CONSTRAINT mobile_devices_bank_balance_check
  CHECK (bank_balance IS NULL OR bank_balance >= 0);
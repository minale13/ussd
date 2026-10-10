-- Multi-bank support.
--
-- A device may be authorised to execute payouts for more than one bank, so the
-- fleet row carries the set of banks an operator has turned on for that phone.
-- It is stored as a JSONB array of canonical bank codes (see src/utils/banks.ts):
-- TELEBIRR, CBEBIRR, AWASH, DASHEN, ABYSSINIA. Null means "not configured yet";
-- the gateway then falls back to the single legacy `channel` so an un-migrated
-- device keeps working exactly as before.
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS enabled_banks JSONB;

-- The canonical bank a payout is routed to. It supersedes `channel`, which is
-- kept for backward compatibility: every existing row and the original two-bank
-- client keep writing `channel`, and the legacy `CBE` label is treated as an
-- alias of CBEBirr. New multi-bank writes populate `bank`; the claim query
-- prefers it and falls back to `channel` when `bank` is null.
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS bank TEXT;

-- Widen the channel constraint so the original client (and any tool still
-- posting the legacy two-value channel) is accepted unchanged. New banks are
-- carried by `bank`; `channel` stays restricted to the historical set.
ALTER TABLE mobile_devices DROP CONSTRAINT IF EXISTS mobile_devices_channel_check;
ALTER TABLE mobile_devices ADD CONSTRAINT mobile_devices_channel_check
  CHECK (channel IS NULL OR channel IN ('TELEBIRR', 'CBE'));

ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_channel_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_channel_check
  CHECK (channel IS NULL OR channel IN ('TELEBIRR', 'CBE'));

-- `bank` is constrained to the canonical set. The legacy `CBE` alias is
-- normalised to CBEBIRR on write, so it never appears here; a NULL simply means
-- "older row, read it from channel".
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_bank_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_bank_check
  CHECK (bank IS NULL OR bank IN ('TELEBIRR', 'CBEBIRR', 'AWASH', 'DASHEN', 'ABYSSINIA'));

-- The pending-claim query joins withdrawals to the claiming device's enabled
-- banks, so index the two columns it filters on together.
CREATE INDEX IF NOT EXISTS withdrawals_pending_bank_idx
  ON withdrawals(bank, created_at)
  WHERE status = 'PENDING';

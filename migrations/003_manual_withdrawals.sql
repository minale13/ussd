ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_channel_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_channel_check CHECK (channel IS NULL OR channel IN ('TELEBIRR', 'CBE'));
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS target_device_id TEXT;

ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_target_device_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_target_device_check
  CHECK (target_device_id IS NULL OR target_device_id = 'ANY' OR char_length(target_device_id) BETWEEN 1 AND 128);

CREATE INDEX IF NOT EXISTS withdrawals_pending_target_idx
  ON withdrawals(target_device_id, created_at)
  WHERE status = 'PENDING';

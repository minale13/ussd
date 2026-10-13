-- Explicit device registration.
--
-- A handset used to appear in the console only as a side effect of its first
-- `GET /api/withdrawals/pending` poll, which cannot happen until onboarding has
-- finished AND the accessibility service is on AND both dangerous permissions
-- were granted. A freshly installed phone was therefore invisible to the
-- operator until every one of those steps had been completed, and a phone that
-- was never going to run payouts (an admin's test install, a device still being
-- configured) never showed up at all.
--
-- `POST /api/devices/register` closes that gap: the app reports itself the
-- moment it starts, and again the moment the phone-number onboarding completes.
--
-- `phone_number` is the number the operator entered during onboarding. It is
-- stored on the fleet row so the console can show which subscriber a device is
-- registered under; it is never used to route a payout (the withdrawal's own
-- `destination` does that) and it is not a secret - it is the same number the
-- operator typed into the phone.
ALTER TABLE mobile_devices ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- The console lists devices and an operator searches them by number, so index
-- it the same way `phone_model` is implicitly searchable via the device list.
CREATE INDEX IF NOT EXISTS mobile_devices_phone_number_idx ON mobile_devices(phone_number);

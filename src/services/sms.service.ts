import { createHash } from 'node:crypto';
import { pool } from '../db.js';
import { parseSms, type SmsChannel } from './sms-parser.js';

export type IngestInput = {
  deviceId: string;
  body: string;
  sender?: string | null;
  receivedAt?: string | null;
  channel?: SmsChannel | null;
};

export type IngestResult = {
  /** False when the same message had already been stored for this device. */
  stored: boolean;
  event: Record<string, unknown> | null;
  parsed: ReturnType<typeof parseSms>;
  /** The device's balance after ingest, when the message carried one. */
  bankBalance: string | null;
};

/** SHA-256 of the exact body; the unique index on (device_id, body_hash) is the dedupe key. */
function bodyHash(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

/**
 * Registers the device if it has never polled, mirroring the upsert the Android
 * client already performs on `GET /api/withdrawals/pending`.
 *
 * Without this an SMS arriving before the device's first poll would fail the
 * foreign key, and a handset that only ever receives SMS (never polls) could
 * not report at all.
 */
async function ensureDevice(deviceId: string): Promise<void> {
  await pool.query(
    `INSERT INTO mobile_devices (device_id, phone_model, active_status)
     VALUES ($1, 'Unknown model', true)
     ON CONFLICT (device_id) DO UPDATE SET last_seen_at = now()`,
    [deviceId]
  );
}

/**
 * Stores one inbound SMS and reconciles the device's reported balance.
 *
 * Idempotent by design: handsets re-deliver (rebroadcast, app restart, retry),
 * so a duplicate is detected by (device_id, body_hash) and reported as
 * `stored: false` rather than inserted twice or double-counted.
 *
 * The balance written is the one the *bank* reported. It is stored on the
 * device, never on `wallets`: that ledger is the platform's own money and is
 * what withdrawal reservations debit, so mirroring an external balance into it
 * would desynchronise what the gateway believes it can pay out.
 */
export async function ingestSms(input: IngestInput): Promise<IngestResult> {
  const body = String(input.body ?? '');
  const parsed = parseSms(body, input.channel ? { channel: input.channel } : undefined);
  const hash = bodyHash(body);
  const channel = parsed.channel ?? input.channel ?? null;
  const receivedAt = input.receivedAt ?? new Date().toISOString();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await ensureDevice(input.deviceId);

    const inserted = await client.query(
      `INSERT INTO gateway_sms_events
         (device_id, channel, provider, sender, body, body_hash, direction,
          amount, reference, counterparty, account_balance, parsed, received_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (device_id, body_hash) DO NOTHING
       RETURNING *`,
      [
        input.deviceId,
        channel,
        parsed.provider,
        input.sender ?? null,
        body,
        hash,
        parsed.direction,
        parsed.amount,
        parsed.reference,
        parsed.counterparty,
        parsed.balance,
        parsed.balance !== null,
        receivedAt
      ]
    );

    const event = inserted.rows[0];

    if (!event) {
      // Duplicate delivery: report the row we already hold, change nothing.
      const existing = await client.query(
        'SELECT * FROM gateway_sms_events WHERE device_id = $1 AND body_hash = $2',
        [input.deviceId, hash]
      );
      await client.query('COMMIT');
      return {
        stored: false,
        event: existing.rows[0] ?? null,
        parsed,
        bankBalance: existing.rows[0]?.account_balance ?? null
      };
    }

    let bankBalance: string | null = null;
    if (parsed.balance !== null) {
      const updated = await client.query(
        `UPDATE mobile_devices
            SET bank_balance = $2::numeric, bank_balance_at = $3, last_seen_at = now(), updated_at = now()
          WHERE device_id = $1
          RETURNING bank_balance::text AS bank_balance`,
        [input.deviceId, parsed.balance, receivedAt]
      );
      bankBalance = updated.rows[0]?.bank_balance ?? parsed.balance;
    } else {
      await client.query(
        'UPDATE mobile_devices SET last_seen_at = now(), updated_at = now() WHERE device_id = $1',
        [input.deviceId]
      );
    }

    await client.query('COMMIT');
    return { stored: true, event, parsed, bankBalance };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/** Most recent stored SMS activity for a device, newest first. */
export async function listSmsEvents(deviceId?: string, limit = 50) {
  const bounded = Math.min(Math.max(Math.trunc(Number(limit) || 50), 1), 200);
  const result = await pool.query(
    `SELECT id, device_id, channel, provider, direction, amount::text AS amount,
            reference, counterparty, account_balance::text AS account_balance,
            parsed, received_at, created_at
       FROM gateway_sms_events
      WHERE ($1::text IS NULL OR device_id = $1)
      ORDER BY received_at DESC
      LIMIT $2`,
    [deviceId ?? null, bounded]
  );
  return result.rows;
}
import { pool } from '../db.js';
import { enqueueWithdrawal } from './withdrawal.queue.js';

export async function publishOutboxBatch(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const events = await client.query(
      `SELECT id, aggregate_id FROM outbox_events
       WHERE published_at IS NULL ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 100`
    );
    for (const event of events.rows) {
      await enqueueWithdrawal(event.aggregate_id);
      await client.query('UPDATE outbox_events SET published_at = now() WHERE id = $1 AND published_at IS NULL', [event.id]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error(JSON.stringify({ event: 'outbox_publish_failed', error }));
  } finally {
    client.release();
  }
}

export function startOutboxPublisher(): NodeJS.Timeout {
  const timer = setInterval(() => { void publishOutboxBatch(); }, 1000);
  timer.unref();
  return timer;
}
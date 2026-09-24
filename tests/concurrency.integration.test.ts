import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import { describe, expect, it } from 'vitest';
import { integrationServicesAvailable } from './integration-availability.js';

const enabled = await integrationServicesAvailable();
const suite = enabled ? describe : describe.skip;

suite('withdrawal concurrency', () => {
  it('allows only ten 1,000 ETB reservations from a 10,000 ETB wallet', async () => {
    const { buildApp } = await import('../src/app.js');
    const { pool } = await import('../src/db.js');
    const app = buildApp();
    const userId = randomUUID();
    await pool.query('INSERT INTO users (id, email) VALUES ($1, $2)', [userId, `${userId}@test.invalid`]);
    await pool.query('INSERT INTO wallets (user_id, available_balance, reserved_balance, currency) VALUES ($1, 10000, 0, $2)', [userId, 'ETB']);
    try {
      const responses = await Promise.all(Array.from({ length: 20 }, (_, index) => app.inject({
        method: 'POST',
        url: '/api/withdrawals',
        headers: { 'x-user-id': userId, 'idempotency-key': `concurrency-${index}` },
        payload: { userId, amount: '1000.00', currency: 'ETB', destinationType: 'PHONE', destination: '251900000000' }
      })));
      expect(responses.filter((response) => response.statusCode === 202)).toHaveLength(10);
      expect(responses.filter((response) => response.statusCode === 409)).toHaveLength(10);
      const wallet = await pool.query('SELECT available_balance, reserved_balance FROM wallets WHERE user_id = $1', [userId]);
      expect(wallet.rows[0]).toMatchObject({ available_balance: '0.00', reserved_balance: '10000.00' });
    } finally {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      await app.close();
    }
  }, 30000);
});
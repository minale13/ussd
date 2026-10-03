import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

/**
 * The credential endpoint must never depend on the datastore.
 *
 * A sign-in happens before anyone knows whether the database is up, so the
 * endpoint that answers it cannot be allowed to need DATABASE_URL or REDIS_URL -
 * otherwise an outage presents to the operator as a rejected password. This suite
 * proves the app boots and answers login with those variables genuinely absent.
 *
 * dotenv is neutralised first. Without that, a local .env quietly refills the
 * deleted variables and the test proves nothing: an earlier draft of this check
 * reported `missing: []` while believing it had unset them.
 */

const KEY = 'Asmat1221';
let app: FastifyInstance;

beforeAll(async () => {
  process.env.DOTENV_CONFIG_PATH = './__no_such_env_file__';
  for (const name of [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'PAYMENT_WEBHOOK_SECRET',
    'ADMIN_WITHDRAWAL_USER_ID',
    'ADMIN_PASSWORD'
  ]) {
    delete process.env[name];
  }
  process.env.ADMIN_API_KEY = KEY;
  process.env.ADMIN_USERNAME = 'admin';

  const { buildApp } = await import('../src/app.js');
  app = buildApp();
}, 60_000);

describe('login without any datastore configuration', () => {
  it('boots and reports what is missing instead of throwing', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Placeholders are substituted so the schema parse cannot fail; the handler
    // names what is absent rather than dying on it.
    expect(body.database).toBe('disabled');
    expect(body.redis).toBe('disabled');
    expect(body.missing).toContain('DATABASE_URL');
    expect(body.missing).toContain('REDIS_URL');
  });

  it('still answers a correct password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'x-admin-username': 'admin', 'x-admin-key': KEY }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
  });

  it('still refuses a wrong or absent password', async () => {
    for (const headers of [
      { 'x-admin-username': 'admin', 'x-admin-key': 'wrong' },
      { 'x-admin-username': 'admin', 'x-admin-key': '' },
      { 'x-admin-username': 'admin' }
    ]) {
      const res = await app.inject({ method: 'POST', url: '/api/admin/login', headers });
      expect(res.statusCode, JSON.stringify(headers)).toBe(401);
    }
  });

  it('serves both front-end surfaces without a datastore', async () => {
    // A missing database must not take the pages down either.
    for (const url of ['/', '/admin']) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode, url).toBe(200);
    }
  });
});
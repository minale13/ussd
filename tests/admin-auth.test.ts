import { describe, expect, it } from 'vitest';
import { authenticateAdmin } from '../src/middleware/admin-auth.js';
import { envSchema, parseEnv } from '../src/config/env.js';

/**
 * The console signs in with a username *and* a password.
 *
 * Both travel as headers (see the client transport in
 * `src/admin-ui/client/01-core.ts`) and the middleware refuses anything that does
 * not match the configured `ADMIN_USERNAME` / `ADMIN_API_KEY` pair. These tests
 * pin that contract, including the short-key floor: a nine-character password
 * must be accepted, which is the length the console is configured with. The
 * fixtures below are representative values, never the real deployment secrets.
 */

/** A request carrying only the headers the client sends. */
function request(headers: Record<string, string>) {
  return { headers } as never;
}

/** A reply that records the status/body instead of writing to a socket. */
function reply() {
  const record = { status: 200, body: null as unknown };
  return {
    record,
    code(status: number) {
      record.status = status;
      return this;
    },
    async send(body: unknown) {
      record.body = body;
      return this;
    },
  } as never;
}

describe('admin authentication', () => {
  // The values come from the environment, so the test keeps working when the
  // credentials in .env are rotated.
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const key = process.env.ADMIN_API_KEY ?? '';

  it('accepts the configured username and password', async () => {
    const res = reply();
    await authenticateAdmin(request({ 'x-admin-username': username, 'x-admin-key': key }), res);
    expect((res as unknown as { record: { status: number; body: unknown } }).record.status).toBe(200);
    expect((res as unknown as { record: { body: unknown } }).record.body).toBeNull();
  });

  it('refuses a wrong password, a wrong username and no credentials at all', async () => {
    const cases: Array<[string, Record<string, string>]> = [
      ['wrong password', { 'x-admin-username': username, 'x-admin-key': `${key}-wrong` }],
      ['wrong username', { 'x-admin-username': `${username}-wrong`, 'x-admin-key': key }],
      ['key without a username', { 'x-admin-key': key }],
      ['username without a key', { 'x-admin-username': username }],
      ['nothing', {}],
    ];
    for (const [label, headers] of cases) {
      const res = reply();
      await authenticateAdmin(request(headers), res);
      const record = (res as unknown as { record: { status: number; body: unknown } }).record;
      expect(record.status, label).toBe(401);
      expect(record.body, label).toEqual({ success: false, error: 'Admin authentication required' });
    }
  });

  it('does not treat a repeated username as a match', async () => {
    const res = reply();
    await authenticateAdmin(request({ 'x-admin-username': [username, username] as never, 'x-admin-key': key }), res);
    expect((res as unknown as { record: { status: number } }).record.status).toBe(401);
  });

  it('accepts a nine-character password, which is what the console is configured with', () => {
    // A representative fixture, never the real ADMIN_API_KEY. This test exists
    // to pin the eight-character floor, so any nine-character value will do -
    // and hard-coding the deployment secret here would publish it.
    const parsed = envSchema.parse({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://withdrawal:withdrawal@localhost:5432/withdrawal',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters',
      PAYMENT_WEBHOOK_SECRET: 'test-webhook-secret',
      ADMIN_API_KEY: 'Testkey01',
      ADMIN_USERNAME: 'test-console',
      ADMIN_WITHDRAWAL_USER_ID: '11111111-1111-4111-8111-111111111111'
    });
    expect(parsed.ADMIN_USERNAME).toBe('test-console');
    expect(parsed.ADMIN_API_KEY).toBe('Testkey01');
  });

  it('still refuses a password that is too short to be one', () => {
    expect(() =>
      parseEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgres://withdrawal:withdrawal@localhost:5432/withdrawal',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters',
        PAYMENT_WEBHOOK_SECRET: 'test-webhook-secret',
        ADMIN_API_KEY: 'short',
        ADMIN_WITHDRAWAL_USER_ID: '11111111-1111-4111-8111-111111111111'
      })
    ).toThrow();
  });

  it('defaults the username when one is not configured', () => {
    const parsed = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgres://withdrawal:withdrawal@localhost:5432/withdrawal',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters',
      PAYMENT_WEBHOOK_SECRET: 'test-webhook-secret',
      ADMIN_API_KEY: 'a-long-enough-key',
      ADMIN_WITHDRAWAL_USER_ID: '11111111-1111-4111-8111-111111111111'
    });
    expect(parsed.ADMIN_USERNAME).toBe('admin');
  });
});

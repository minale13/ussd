import { beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';

/**
 * Root/App-UI separation and the credential-only sign-in endpoint.
 *
 * Two properties are pinned here:
 *
 * 1. `/`, `/app` and `/admin` are three different documents. `/` and `/app`
 *    serve the Android App Agent UI shipped in the APK assets; `/admin` serves
 *    the console. `/` used to 302 into `/admin` and `/app` was not routed at
 *    all, so there was no way to reach one without the other.
 * 2. `/api/admin/login` decides on the credentials alone. It touches no
 *    datastore, so a database outage cannot turn into a rejected password -
 *    the failure that made a correct key look broken.
 */

const KEY = 'Asmat1221';

let app: FastifyInstance;

beforeAll(async () => {
  // Set before the import so config/env.ts resolves from these values, exactly as
  // it does on a serverless start.
  process.env.DATABASE_URL = 'postgres://withdrawal:withdrawal@localhost:5432/withdrawal';
  process.env.REDIS_URL = 'redis://localhost:6379';
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters';
  process.env.PAYMENT_WEBHOOK_SECRET = 'test-webhook-secret';
  process.env.ADMIN_WITHDRAWAL_USER_ID = '11111111-1111-4111-8111-111111111111';
  process.env.ADMIN_API_KEY = KEY;
  delete process.env.ADMIN_PASSWORD;
  // Local .env supplies "Asmatking"; pin the schema default Vercel will use.
  process.env.ADMIN_USERNAME = 'admin';

  const { buildApp } = await import('../src/app.js');
  app = buildApp();
  // Deliberately no app.ready(): it blocks on the local Postgres/Redis hook, and
  // inject() primes the plugin itself. Nothing here needs a live datastore.
}, 60_000);

describe('app surfaces', () => {
  /**
   * Both the root and /app are the standalone Android App Agent UI. Neither may
   * redirect into the console: a 302 into /admin (or /admin/login) is the exact
   * bug this pins, and it is invisible to a browser that follows redirects, so
   * the Location header has to be asserted on explicitly.
   */
  for (const path of ['/', '/app', '/app/']) {
    it(`serves the App Agent UI at ${path} instead of redirecting to the console`, async () => {
      const res = await app.inject({ method: 'GET', url: path });
      expect(res.statusCode).toBe(200);
      expect(res.headers.location, `${path} must not redirect into the console`).toBeUndefined();
      expect(res.headers['content-type']).toContain('text/html');

      // The agent document has its own device-onboarding form, so "login-form"
      // does not identify it. The console sign-in button and bottom nav do:
      // neither may appear on the client UI, and the green status orb must.
      expect(res.body, `console sign-in button must not leak into ${path}`).not.toContain('id="unlock"');
      expect(res.body, `console nav must not leak into ${path}`).not.toContain('bottom-nav');
      expect(res.body, `agent page at ${path} must carry its status indicator`).toContain('pill-pulse');
    });
  }

  it('serves the console login at /admin and only there', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin' });
    expect(res.statusCode).toBe(200);
    expect(res.headers.location, '/admin must not redirect either').toBeUndefined();
    expect(res.body).toContain('id="login-form"');
    expect(res.body).toContain('id="unlock"');
    expect(res.body).toContain('bottom-nav');
  });

  it('serves the stylesheet the agent page links to', async () => {
    const res = await app.inject({ method: 'GET', url: '/tailwind.css' });
    expect(res.statusCode).toBe(200);
  });

  it('keeps /admin screens on the console and the agent UI off them', async () => {
    // The console is multi-screen, the agent UI is one document. Neither family
    // may answer for a path belonging to the other.
    const consoleScreen = await app.inject({ method: 'GET', url: '/admin/transactions' });
    expect(consoleScreen.statusCode).toBe(200);
    expect(consoleScreen.body).toContain('id="unlock"');

    for (const path of ['/', '/app']) {
      const res = await app.inject({ method: 'GET', url: path });
      expect(res.body, `${path} must not serve a console screen`).not.toContain('id="unlock"');
    }
  });
});

describe('credential-only sign-in', () => {
  it('accepts the exact configured pair', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'x-admin-username': 'admin', 'x-admin-key': KEY }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
  });

  it('answers a wrong password with 401 and the documented body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'x-admin-username': 'admin', 'x-admin-key': 'Asmat1222' }
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ success: false, error: 'Invalid credentials' });
  });

  it('never answers 500, whatever it is sent', async () => {
    for (const headers of [{}, { 'x-admin-key': KEY }, { 'x-admin-username': 'admin' }]) {
      const res = await app.inject({ method: 'POST', url: '/api/admin/login', headers });
      expect(res.statusCode, JSON.stringify(headers)).not.toBe(500);
      expect(res.statusCode, JSON.stringify(headers)).toBe(401);
    }
  });

  it('answers from the body as well as the headers', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      payload: { username: 'admin', password: KEY }
    });
    expect(res.statusCode).toBe(200);
  });

  it('treats the username case-insensitively but the password exactly', async () => {
    const loose = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'x-admin-username': '  ADMIN  ', 'x-admin-key': KEY }
    });
    expect(loose.statusCode).toBe(200);

    const wrongCase = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'x-admin-username': 'admin', 'x-admin-key': 'asmat1221' }
    });
    expect(wrongCase.statusCode).toBe(401);
  });

  it('has no hardcoded fallback credential', async () => {
    // The endpoint must not admit the value even when the environment is wrong;
    // there is no second secret to fall back to.
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'x-admin-username': 'admin', 'x-admin-key': '' }
    });
    expect(res.statusCode).toBe(401);
  });

  it('answers the empty JSON body the console client actually sends', async () => {
    // Fastify rejects a JSON content-type with no payload, so the client posts
    // "{}" with the credentials in headers. This pins that exact shape.
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'content-type': 'application/json', 'x-admin-username': 'admin', 'x-admin-key': KEY },
      payload: '{}'
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });
  });

  it('rejects a refused key without touching any datastore', async () => {
    // The whole point of the endpoint: the answer is a pure credential decision,
    // so it stays 401 even when there is no database to read.
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/login',
      headers: { 'x-admin-username': 'admin', 'x-admin-key': 'nope-nope-nope' }
    });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ success: false, error: 'Invalid credentials' });
  });
});
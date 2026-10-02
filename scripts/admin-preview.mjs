/**
 * Live preview of the standalone admin dashboard.
 *
 * Boots the real Fastify app on a port, stubs the database pool, then drives
 * /admin exactly like a browser would: fetch the page, fetch /admin/app.js,
 * unlock with the admin key, and read back what the console rendered.
 *
 * Run: node scripts/admin-preview.mjs
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';

// The env is set before the app is imported: config/env.js validates at import
// time, so a missing variable would throw before the preview could start.
process.env.DATABASE_URL ??= 'postgres://preview:preview@localhost:5432/preview';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_SECRET ??= 'preview-jwt-secret-that-is-at-least-32-characters';
process.env.ADMIN_API_KEY ??= 'preview-admin-key-that-is-long-enough';
process.env.ADMIN_USERNAME ??= 'admin';
process.env.ADMIN_WITHDRAWAL_USER_ID ??= '11111111-1111-4111-8111-111111111111';
process.env.PAYMENT_WEBHOOK_SECRET ??= 'preview-webhook-secret';

const { buildApp } = await import('../dist/src/app.js');
const { pool } = await import('../dist/src/db.js');

const DEVICES = [
  {
    device_id: 'dev-online-1', phone_model: 'Tecno Spark 8', active_status: true,
    sim_slot: 0, channel: 'TELEBIRR', carrier: 'Ethio Telecom', battery_level: 82,
    network_type: '4G', online: true, last_seen_at: new Date().toISOString(),
  },
  {
    device_id: 'dev-offline-2', phone_model: 'Samsung Galaxy A12', active_status: true,
    sim_slot: 1, channel: 'CBE', carrier: 'Safaricom', battery_level: 12,
    network_type: '2G', online: false, last_seen_at: new Date(Date.now() - 20 * 60_000).toISOString(),
  },
  {
    device_id: 'dev-blocked-3', phone_model: 'Infinix Hot 30', active_status: false,
    sim_slot: 0, channel: 'TELEBIRR', carrier: 'Ethio Telecom', battery_level: null,
    network_type: null, online: true, last_seen_at: new Date().toISOString(),
  },
];

const TRANSACTIONS = [
  { transaction_id: 'WD-AAA111', amount: '1250.00', currency: 'ETB', destination: '0911234567', status: 'COMPLETED', channel: 'TELEBIRR', device_id: 'dev-online-1', device_model: 'Tecno Spark 8', created_at: new Date().toISOString() },
  { transaction_id: 'WD-BBB222', amount: '75.50', currency: 'ETB', destination: '0934455667', status: 'FAILED', channel: 'CBE', device_id: 'dev-offline-2', device_model: 'Samsung Galaxy A12', created_at: new Date().toISOString() },
  { transaction_id: 'WD-CCC333', amount: '2100.00', currency: 'ETB', destination: '0945566778', status: 'PENDING', channel: 'CBE', device_id: null, device_model: null, created_at: new Date().toISOString() },
];

pool.query = async (sql) => {
  const text = String(sql);
  if (text.includes('total_cash_in')) {
    return { rows: [{ total_cash_in: '52000.00', total_withdrawals: '18450.25', remaining_balance: '33549.75' }] };
  }
  if (text.includes('mobile_devices') && text.startsWith('UPDATE')) return { rows: [] };
  if (text.includes('FROM mobile_devices')) return { rows: DEVICES };
  if (text.includes('FROM withdrawals')) return { rows: TRANSACTIONS };
  return { rows: [] };
};

const app = buildApp();
const port = 3177 + Math.floor(Math.random() * 400);
await app.listen({ port, host: '127.0.0.1' });
const base = `http://127.0.0.1:${port}`;
const key = process.env.ADMIN_API_KEY;
const username = process.env.ADMIN_USERNAME;
// Both halves of the sign-in travel as headers, exactly as the console sends them.
const auth = { 'x-admin-username': username, 'x-admin-key': key, 'content-type': 'application/json' };

const checks = [];
const check = (name, condition, detail = '') => {
  checks.push({ name, ok: Boolean(condition), detail });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

try {
  console.log(`\nAdmin dashboard live preview on ${base}\n`);

  const page = await (await fetch(`${base}/admin`)).text();
  check('/admin serves the console', page.includes('id="devices"'));
  check('device fleet panel present', page.includes('Device Fleet'));
  // The mobile console titles its ledger by the active filter tab; the default
  // "All" tab is what the operator lands on.
  check('transaction history panel present', page.includes('id="view-transactions"') && page.includes('All transactions'));
  check('target device dropdown present', page.includes('id="target-dropdown"'));
  check('no mobile app markup leaked in', !page.includes('listening-orb') && !page.includes('id="onboarding"'));

  const script = await (await fetch(`${base}/admin/app.js`)).text();
  check('/admin/app.js served', script.includes('renderTransactions') && script.includes('renderDevices'));
  check('client renders the fleet', script.includes('batteryCell') && script.includes('networkCell'));

  const unauthorized = await fetch(`${base}/api/admin/devices`, { headers: { 'x-admin-key': 'wrong-key' } });
  check('admin API rejects a bad key', unauthorized.status === 401, `status ${unauthorized.status}`);

  const wrongUser = await fetch(`${base}/api/admin/devices`, { headers: { 'x-admin-username': 'not-the-admin', 'x-admin-key': key } });
  check('admin API rejects a bad username', wrongUser.status === 401, `status ${wrongUser.status}`);

  const devices = await (await fetch(`${base}/api/admin/devices`, { headers: auth })).json();
  check('GET /api/admin/devices returns the fleet', devices.devices?.length === 3, `${devices.devices?.length} devices`);
  check('fleet rows carry channel + battery + network', devices.devices[0].channel === 'TELEBIRR' && devices.devices[0].battery_level === 82 && devices.devices[0].network_type === '4G');
  check('fleet exposes the online flag', devices.devices[0].online === true && devices.devices[1].online === false);

  const transactions = await (await fetch(`${base}/api/admin/transactions`, { headers: auth })).json();
  check('GET /api/admin/transactions returns history', transactions.transactions?.length === 3, `${transactions.transactions?.length} payouts`);
  check('history joins the target device', transactions.transactions[0].device_id === 'dev-online-1');
  check('auto-assigned payout stays unassigned', transactions.transactions[2].device_id === null);

  const clamped = await (await fetch(`${base}/api/admin/transactions?limit=9999`, { headers: auth })).json();
  check('history limit is clamped, not unbounded', Array.isArray(clamped.transactions) && clamped.transactions.length <= 200);

  check('no admin surface in the APK assets', !readFileSync(new URL('../android/app/src/main/assets/dashboard.html', import.meta.url), 'utf8').includes('admin-view'));
} finally {
  await app.close();
}

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} preview checks passed`);
process.exit(failed.length ? 1 : 0);

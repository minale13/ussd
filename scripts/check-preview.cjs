/**
 * Smoke-checks the running admin preview over HTTP.
 *
 * Asserts the pieces of the mobile-first app that only exist once the page and
 * the client are served together: the ten screens' anchors, the bottom nav, the
 * mocked API the client needs (including /health and the cash-in feed), and the
 * device restart endpoint.
 *
 * The admin API is credential-gated, so the checks sign in with the
 * ADMIN_USERNAME / ADMIN_API_KEY from .env and also assert that a wrong
 * username or key is refused - the same contract as the real middleware.
 *
 * Run: node scripts/check-preview.cjs [baseUrl]
 */
const fs = require('node:fs');
const path = require('node:path');

const base = process.argv[2] || 'http://127.0.0.1:3000';

// Read .env directly: this script is plain CommonJS and must not depend on the
// compiled app just to learn what the running preview expects.
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const configured = Object.fromEntries(
  envFile
    .split(/\r?\n/)
    .filter((line) => line && !line.trim().startsWith('#') && line.includes('='))
    .map((line) => {
      const at = line.indexOf('=');
      return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
    })
);
const USERNAME = configured.ADMIN_USERNAME || 'admin';
const KEY = configured.ADMIN_API_KEY || '';
const auth = { headers: { 'x-admin-username': USERNAME, 'x-admin-key': KEY } };

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const get = (path, init) => fetch(base + path, init);

(async () => {
  // Restore the seed data first: the restart check below deliberately clears a
  // device's address, so without a reset a second run would be checking mutated
  // state rather than the fixture.
  await get('/__reset').catch(() => null);

  const status = await (await get('/__status')).json();
  check('/__status reports a ready page', status.page === 'ready', JSON.stringify(status));

  const page = await (await get('/admin')).text();
  check('/admin serves the app shell', page.includes('id="app"'));
  check('splash screen present', page.includes('id="splash"') && page.includes('splash-status'));
  check('login screen present', page.includes('id="login-form"') && page.includes('id="key"'));
  check('bottom navigation present with four tabs', page.includes('id="bottom-nav"') && (page.match(/class="nav-item/g) || []).length === 4);
  check('bottom nav tabs are Home/Transactions/Devices/More', ['home', 'transactions', 'devices', 'more'].every((r) => page.includes(`data-route="${r}"`)));
  check('home screen present', page.includes('id="view-home"') && page.includes('id="balance"') && page.includes('Hello, Admin'));
  check('send money screen present', page.includes('id="view-send"') && page.includes('id="amount-chips"') && page.includes('id="target-dropdown"'));
  check('transactions screen present with filter tabs', page.includes('id="view-transactions"') && ['all', 'cash-in', 'withdrawal', 'failed'].every((f) => page.includes(`data-filter="${f}"`)));
  check('devices screen present', page.includes('id="view-devices"') && page.includes('id="device-search"') && page.includes('id="stat-online"'));
  check('quick actions screen present', page.includes('id="view-more"') && page.includes('id="quick-actions"'));
  check('device details screen present', page.includes('id="view-device"') && page.includes('id="restart-device"'));
  check('profile screen present', page.includes('id="view-profile"') && page.includes('id="logout"'));
  check('notifications panel present', page.includes('id="notif-sheet"') && page.includes('id="notif-list"'));
  check('quick amount chips are 100/500/1000/2000', ['100', '500', '1000', '2000'].every((v) => page.includes(`data-amount="${v}"`)));
  check('no inline event handlers (CSP-safe)', !/\son(click|load|submit)=/i.test(page));

  const script = await (await get('/admin/app.js')).text();
  check('/admin/app.js served', script.includes('renderHome') && script.includes('renderTransactions') && script.includes('renderDevices'));
  check('client renders the vehicle, notifications and device detail', ['renderNotifications', 'renderDeviceDetail', 'batteryCell', 'networkCell'].every((f) => script.includes(f)));
  check('client never stores the key', !/localStorage\.setItem\([^)]*key/i.test(script) && !/sessionStorage\.setItem\([^)]*key/i.test(script));

  const health = await (await get('/health')).json();
  check('/health answers for the splash check', health.status === 'ok', JSON.stringify(health));

  // The login flow depends on the preview enforcing the same credentials as the
  // real middleware, so both failure modes are asserted before the data checks.
  const anonymous = await get('/api/admin/devices');
  check('admin API refuses an unauthenticated read', anonymous.status === 401, `status ${anonymous.status}`);

  const wrongKey = await get('/api/admin/devices', { headers: { 'x-admin-username': USERNAME, 'x-admin-key': 'not-the-key' } });
  check('admin API refuses a wrong password', wrongKey.status === 401, `status ${wrongKey.status}`);

  const wrongUser = await get('/api/admin/devices', { headers: { 'x-admin-username': 'not-the-admin', 'x-admin-key': KEY } });
  check('admin API refuses a wrong username', wrongUser.status === 401, `status ${wrongUser.status}`);

  const signedIn = await get('/api/admin/devices', auth);
  check('the configured credentials unlock the API', signedIn.status === 200, `status ${signedIn.status} as "${USERNAME}"`);

  const devices = await (await get('/api/admin/devices', auth)).json();
  check('fleet endpoint returns rows', devices.devices?.length === 6, `${devices.devices?.length} devices`);
  check('fleet rows carry SIM, battery, network and address', devices.devices[0].channel === 'TELEBIRR' && devices.devices[0].battery_level === 82 && devices.devices[0].last_ip === '196.188.44.12');
  check('a device with no telemetry stays null', devices.devices[5].battery_level === null && devices.devices[5].network_type === null);

  const txns = await (await get('/api/admin/transactions?limit=200', auth)).json();
  check('transactions endpoint returns rows', txns.transactions?.length === 5, `${txns.transactions?.length} payouts`);
  check('history joins the target device', txns.transactions[0].device_id === devices.devices[0].device_id);
  check('auto-assigned payout stays unassigned', txns.transactions[4].device_id === null);

  const sms = await (await get('/api/admin/sms?limit=100', auth)).json();
  check('cash-in feed returns events', sms.events?.length === 3, `${sms.events?.length} messages`);
  check('feed carries a CREDIT direction for the cash-in tab', sms.events.filter((e) => e.direction === 'CREDIT').length === 2);

  const overview = await (await get('/api/admin/overview', auth)).json();
  check('overview carries the totals the home screen shows', Boolean(overview.overview.total_cash_in && overview.overview.remaining_balance));

  const restart = await get('/api/admin/devices/a1b2c3d4e5f60001/restart', { method: 'POST', headers: auth.headers });
  check('device restart endpoint answers', restart.status === 200, `status ${restart.status}`);

  const bad = await get('/api/admin/devices/dev-nope/restart', { method: 'POST', headers: auth.headers });
  check('restart of an unknown device is refused', bad.status === 404, `status ${bad.status}`);

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} preview checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error('preview check failed:', error.message);
  process.exit(1);
});

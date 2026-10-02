/**
 * Boots the real admin app (the page and client the server just served) in jsdom
 * against a stubbed admin API, then drives it the way an operator would: splash,
 * sign in, then the screens, filter tabs and device controls.
 *
 * This is what the HTTP smoke test cannot do: it runs the client, so a missing
 * element or a thrown error in a renderer shows up as a failure.
 *
 * Run: npm run build && node scripts/check-admin-app.cjs
 */
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:3000';
// The page prefills the configured username and the harness types the configured
// password, so this exercises the real sign-in path rather than a bypass.
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
const KEY = configured.ADMIN_API_KEY || 'preview-key-that-is-long-enough';
const ago = (ms) => new Date(Date.now() - ms).toISOString();

const DEVICES = [
  { device_id: 'DEV-001', phone_model: 'Tecno Spark 8', active_status: true, sim_slot: 0, channel: 'TELEBIRR', carrier: 'Ethio Telecom', battery_level: 78, network_type: '4G', app_version: '2.0.0', last_ip: '196.188.44.12', online: true, last_seen_at: ago(4000) },
  { device_id: 'DEV-002', phone_model: 'Samsung A12', active_status: true, sim_slot: 1, channel: 'CBE', carrier: 'Safaricom', battery_level: 12, network_type: '2G', app_version: '2.0.0', last_ip: null, online: false, last_seen_at: ago(3_600_000) },
  { device_id: 'DEV-003', phone_model: 'Nokia G11', active_status: false, sim_slot: 0, channel: 'CBE', carrier: 'Ethio Telecom', battery_level: null, network_type: null, app_version: null, last_ip: null, online: true, last_seen_at: ago(60_000) },
];

const TRANSACTIONS = [
  { transaction_id: 'WD-1001', amount: '1250.00', currency: 'ETB', destination: '0911234567', status: 'COMPLETED', channel: 'TELEBIRR', device_id: 'DEV-001', device_model: 'Tecno Spark 8', created_at: ago(1000) },
  { transaction_id: 'WD-1002', amount: '75.50', currency: 'ETB', destination: '0934455667', status: 'FAILED', channel: 'CBE', device_id: 'DEV-002', device_model: 'Samsung A12', created_at: ago(300_000) },
  { transaction_id: 'WD-1003', amount: '2100.00', currency: 'ETB', destination: '0945566778', status: 'PENDING', channel: 'CBE', device_id: null, device_model: null, created_at: ago(60_000) },
];

const SMS = [
  { id: 'sms-1', device_id: 'DEV-001', provider: 'telebirr', direction: 'CREDIT', amount: '5000.00', counterparty: '0911234567', received_at: ago(600_000) },
  { id: 'sms-2', device_id: 'DEV-002', provider: 'cbe', direction: 'DEBIT', amount: '300.00', counterparty: '0945566778', received_at: ago(900_000) },
];

const OVERVIEW = { total_cash_in: '184250.00', total_withdrawals: '42305.25', remaining_balance: '141944.75', cash_in_today: '5000.00' };

const SETTINGS = {
  read_only: true, environment: 'development', currency: 'ETB', channels: ['TELEBIRR', 'CBE'],
  min_withdrawal: '1.00', max_withdrawal: '100000.00', worker_concurrency: 10, processing_timeout_seconds: 300,
  health: { devices_total: 3, devices_online: 1, pending_withdrawals: 1, failed_withdrawals: 1, outbox_backlog: 0, rejected_webhooks: 0 },
};

const checks = [];
function check(name, condition, detail = '') {
  checks.push({ name, ok: Boolean(condition) });
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Waits for the boot overlay to finish releasing.
 *
 * The splash deliberately holds for a minimum display time (BOOT_MS in the
 * client) so the brand does not flash past, so "did it release?" cannot be
 * answered by a fixed short sleep. Polls until the class clears, and gives up
 * after a generous ceiling so a genuine failure still reports instead of
 * hanging.
 */
async function waitForBoot(ui, ceilingMs = 3000) {
  const deadline = Date.now() + ceilingMs;
  while (Date.now() < deadline) {
    if (!ui.document.body.classList.contains('is-booting')) return true;
    await sleep(50);
  }
  return !ui.document.body.classList.contains('is-booting');
}

/** Boots the served page + client in jsdom with the admin API stubbed. */
async function boot(path, options = {}) {
  const calls = [];
  const dom = new JSDOM(options.page, { runScripts: 'outside-only', url: `https://localhost${path}`, pretendToBeVisual: true });
  const { window } = dom;
  const document = window.document;

  const json = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  const denied = () => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ error: 'Admin authentication required' }) });

  window.fetch = (target, init) => {
    calls.push({ path: target, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null });
    if (options.reject) return denied();
    if (target === '/health') return json({ status: 'ok' });
    if (target === '/api/admin/overview') return json({ success: true, overview: OVERVIEW });
    if (target === '/api/admin/devices') return json({ success: true, devices: DEVICES });
    if (target.startsWith('/api/admin/transactions')) return json({ success: true, transactions: TRANSACTIONS });
    if (target.startsWith('/api/admin/sms')) return json({ success: true, events: SMS });
    if (target.startsWith('/api/admin/settings')) return json({ success: true, settings: SETTINGS });
    if (target.startsWith('/api/admin/devices/')) return json({ success: true, device: DEVICES[0] });
    if (target === '/api/admin/withdrawals') return json({ success: true, withdrawal: { transaction_id: 'WD-NEW999' } });
    if (target === '/api/admin/stream') return Promise.resolve({ ok: false, body: null });
    return json({ success: false });
  };

  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }
  window.eval(options.script);
  await sleep(30);

  return {
    window,
    document,
    calls,
    $: (id) => document.getElementById(id),
    text: (id) => (document.getElementById(id)?.textContent ?? '').trim(),
    all: (selector) => Array.from(document.querySelectorAll(selector)),
    tab: (label) => Array.from(document.querySelectorAll('#bottom-nav .nav-item')).find((a) => a.textContent.trim() === label),
  };
}

/** Types the username and password, submits, and waits for the loads to land. */
async function signIn(ui) {
  ui.$('username').value = USERNAME;
  ui.$('key').value = KEY;
  ui.$('login-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(80);
}


(async () => {
  const page = await (await fetch(`${BASE}/admin`)).text();
  const script = await (await fetch(`${BASE}/admin/app.js`)).text();

  // --- splash -> login -> home ---------------------------------------------
  {
    const ui = await boot('/admin', { page, script });
    const released = await waitForBoot(ui);
    check('splash releases after the gateway check', released, ui.document.body.className);
    // The splash must be gone from the accessibility tree too, not just faded.
    check('the splash is hidden from assistive tech once released', ui.$('splash').getAttribute('aria-hidden') === 'true');
    check('the app starts locked behind the sign-in screen', ui.document.body.classList.contains('is-locked'));
    check('the login form prefills the configured admin username', ui.$('username').value === USERNAME, ui.$('username').value);
    check('the password field starts empty', ui.$('key').value === '');
    check('the splash reports a real gateway status', ui.text('splash-status-text').includes('Gateway'), ui.text('splash-status-text'));
    check('home greets the operator', ui.text('greeting').startsWith('Hello,'), ui.text('greeting'));
    check('the clock renders East Africa Time', ui.text('clock-date').includes('(EAT)'), ui.text('clock-date'));

    await signIn(ui);
    check('signing in unlocks the app', ui.document.body.classList.contains('unlocked') && !ui.document.body.classList.contains('is-locked'));
    // The sign-in card is a fixed full-viewport layer above the app: if it were
    // not dropped, the dashboard behind it would be visible but unusable.
    check('the sign-in card is hidden once the operator is in', ui.$('login').getAttribute('aria-hidden') === 'true');
    check('the sign-in card is dropped by the unlocked stylesheet', /body\.unlocked[^{}]*\.login[^{}]*\{[^}]*display\s*:\s*none/.test(page));
    check('the balance hero is filled from the overview', ui.text('balance') === '141,944.75', ui.text('balance'));
    check('the growth chip is a percentage', /%$/.test(ui.text('balance-growth')), ui.text('balance-growth'));
    check('today cash-in is shown under the hero', ui.text('balance-trend-note').includes('5,000.00'), ui.text('balance-trend-note'));
    check('the cash-in tile is filled', ui.text('cash') === '184,250.00' && ui.text('withdrawals') === '42,305.25');
    check('the active-devices tile counts online phones', ui.text('active-devices') === '2', ui.text('active-devices'));
    check("today's-transactions tile counts today's rows", ui.text('today-txns') === '2', ui.text('today-txns'));
    check('recent activity lists the payouts', ui.all('#recent .txn').length === 3, `${ui.all('#recent .txn').length} cards`);
  }

  // --- bottom navigation ----------------------------------------------------
  {
    const ui = await boot('/admin', { page, script });
    await signIn(ui);
    check('the bottom bar has exactly four tabs', ui.all('#bottom-nav .nav-item').length === 4);
    check('Home is the active tab on /admin', ui.all('#bottom-nav .nav-item.is-active')[0]?.textContent.trim() === 'Home');

    ui.tab('Devices').click();
    await sleep(60);
    check('tapping Devices shows the fleet screen', !ui.$('view-devices').hidden && ui.$('view-home').hidden);
    check('the top bar retitles to Devices', ui.text('view-title') === 'Devices', ui.text('view-title'));
    check('the Devices tab is highlighted', ui.all('#bottom-nav .nav-item.is-active')[0]?.textContent.trim() === 'Devices');
    check('the fleet counters are filled', ui.text('stat-total') === '3' && ui.text('stat-online') === '2' && ui.text('stat-offline') === '1', `${ui.text('stat-total')}/${ui.text('stat-online')}/${ui.text('stat-offline')}`);
    check('every device is listed', ui.all('#devices .dev-row').length === 3);
    check('device rows carry SIM, battery and a status pill', ui.$('devices').textContent.includes('SIM 1') && ui.$('devices').textContent.includes('78%') && ui.$('devices').textContent.includes('Online'));
    check('a phone with no telemetry degrades to a dash', ui.all('#devices .dev-row')[2].textContent.includes('—'));

    ui.$('device-search').value = 'samsung';
    ui.$('device-search').dispatchEvent(new ui.window.Event('input', { bubbles: true }));
    await sleep(20);
    check('device search filters the list', ui.all('#devices .dev-row').length === 1, `${ui.all('#devices .dev-row').length} rows`);
  }


  // --- device details + controls -------------------------------------------
  {
    const ui = await boot('/admin/devices', { page, script });
    await signIn(ui);
    ui.all('#devices .dev-row')[0].click();
    await sleep(60);
    check('tapping a device opens its detail screen', !ui.$('view-device').hidden);
    check('the detail screen shows the device identity', ui.text('detail-name') === 'Tecno Spark 8' && ui.text('detail-id') === 'DEV-001');
    check('the detail screen shows network, SIM and last seen', ui.text('detail-network-type') === '4G' && ui.$('detail-sim').textContent.includes('SIM 1') && ui.text('detail-last-seen').length > 0);
    check('the detail screen shows the reported address', ui.text('detail-ip') === '196.188.44.12', ui.text('detail-ip'));
    check('a pushed screen shows the back arrow', !ui.$('back').hidden);
    check('the owning tab stays highlighted', ui.all('#bottom-nav .nav-item.is-active')[0]?.textContent.trim() === 'Devices');

    ui.$('restart-device').click();
    await sleep(60);
    check('Restart Device calls the restart endpoint', ui.calls.some((c) => c.path === '/api/admin/devices/DEV-001/restart' && c.method === 'POST'));

    ui.$('toggle-device').click();
    await sleep(60);
    const patch = ui.calls.find((c) => c.path === '/api/admin/devices/DEV-001' && c.method === 'PATCH');
    check('Block device patches the fleet row', patch?.body?.activeStatus === false, JSON.stringify(patch?.body));
  }

  // --- transactions tabs ----------------------------------------------------
  {
    const ui = await boot('/admin/transactions', { page, script });
    await signIn(ui);
    check('the tabs count every payout', ui.text('tab-count-all') === '3', ui.text('tab-count-all'));
    check('the Failed tab counts only failures', ui.text('tab-count-failed') === '1', ui.text('tab-count-failed'));
    check('the Cash-in tab counts credits only', ui.text('tab-count-cash-in') === '1', ui.text('tab-count-cash-in'));
    check('the ledger renders device-tagged cards', ui.all('#txns .txn').length === 3 && ui.$('txns').textContent.includes('Tecno Spark 8'));
    check('an auto-assigned payout is labelled, not guessed', ui.$('txns').textContent.includes('Auto-assigned'));
    check('cards carry status pills', ui.$('txns').textContent.includes('COMPLETED') && ui.$('txns').textContent.includes('FAILED'));

    const tabFor = (filter) => ui.all('#txn-tabs [data-filter]').find((t) => t.dataset.filter === filter);
    tabFor('failed').click();
    await sleep(20);
    check('the Failed tab shows only failed payouts', ui.all('#txns .txn').length === 1 && ui.$('txns').textContent.includes('FAILED'));

    tabFor('cash-in').click();
    await sleep(20);
    check('the Cash-in tab shows the SMS credit feed', ui.all('#txns .txn').length === 1 && ui.$('txns').textContent.includes('5,000.00'), ui.$('txns').textContent.slice(0, 48));

    tabFor('all').click();
    ui.$('txn-search').value = 'WD-1002';
    ui.$('txn-search').dispatchEvent(new ui.window.Event('input', { bubbles: true }));
    await sleep(20);
    check('transaction search narrows the list', ui.all('#txns .txn').length === 1);
  }


  // --- send money -----------------------------------------------------------
  {
    const ui = await boot('/admin/send', { page, script });
    await signIn(ui);
    check('/admin/send opens the payout form', !ui.$('view-send').hidden);

    ui.all('#amount-chips .chip').find((c) => c.dataset.amount === '500').click();
    await sleep(20);
    check('a quick amount chip fills and highlights', ui.$('amount').value === '500' && ui.all('#amount-chips .chip.is-active').length === 1);

    ui.$('phone').value = '0911234567';
    ui.$('withdrawal-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
    await sleep(80);
    const post = ui.calls.find((c) => c.path === '/api/admin/withdrawals');
    check('the payout posts with a +251 number', post?.body?.destinationPhone === '+251911234567', String(post?.body?.destinationPhone));
    check('the payout carries the chip amount', post?.body?.amount === 500, String(post?.body?.amount));
    check('the payout defaults to auto-assignment', post?.body?.targetDeviceId === 'ANY', String(post?.body?.targetDeviceId));
    check('success feedback is shown in the form', ui.$('form-feedback').classList.contains('success'));

    // Invalid input must be caught before anything is sent.
    const sent = ui.calls.filter((c) => c.path === '/api/admin/withdrawals').length;
    ui.$('phone').value = 'nope';
    ui.$('amount').value = '10';
    ui.$('withdrawal-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
    await sleep(30);
    check('an invalid phone is refused locally', ui.calls.filter((c) => c.path === '/api/admin/withdrawals').length === sent);
    check('the invalid field is flagged for the operator', ui.document.querySelector('[data-field="phone"]').classList.contains('has-error'));
  }

  // --- notifications, quick actions, profile, sign out ----------------------
  {
    const ui = await boot('/admin', { page, script });
    await signIn(ui);
    check('the bell badge counts the alerts', Number(ui.text('notif-badge')) > 0, ui.text('notif-badge'));

    ui.$('notifications').click();
    await sleep(20);
    check('the bell opens the notifications panel', ui.$('notif-sheet').classList.contains('is-open'));
    check('the panel lists real alerts', ui.all('#notif-list .notif').length > 0, `${ui.all('#notif-list .notif').length} alerts`);
    check('the alerts are timestamped', ui.$('notif-list').textContent.includes('ago'));
    ui.$('notif-close').click();
    await sleep(20);
    check('the panel closes again', !ui.$('notif-sheet').classList.contains('is-open'));

    ui.tab('More').click();
    await sleep(40);
    check('the More tab shows the quick actions', !ui.$('view-more').hidden && ui.all('#quick-actions .qa-item').length === 4);
    check('the quick actions cover the four operator tasks', ['Unlock Console', 'View Transactions', 'Device Management', 'System Settings'].every((t) => ui.$('quick-actions').textContent.includes(t)));

    ui.all('#quick-actions .qa-item').find((b) => b.textContent.includes('System Settings')).click();
    await sleep(60);
    check('a quick action navigates to its screen', !ui.$('view-profile').hidden);
    check('profile loads the read-only gateway settings', ui.$('settings-body').textContent.includes('Minimum withdrawal') && ui.text('settings-badge') === 'Read-only');
    check('no secret is rendered on the settings screen', !ui.$('settings-body').textContent.includes(KEY));

    ui.$('logout').click();
    await sleep(20);
    check('logging out locks the app and clears the key', ui.document.body.classList.contains('is-locked') && ui.$('key').value === '');
    // Signing out has to bring the card back, or the operator is locked out of a
    // login form nobody can see.
    check('the sign-in card comes back on sign out', ui.$('login').getAttribute('aria-hidden') === 'false');
  }

  // --- rejected sign-in -----------------------------------------------------
  {
    const ui = await boot('/admin', { page, script, reject: true });
    await signIn(ui);
    check('a rejected password keeps the app locked', !ui.document.body.classList.contains('unlocked'));
    check('the refusal is reported to the operator', /password|authentication/i.test(ui.$('toast').textContent), ui.$('toast').textContent.trim());
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} app checks passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((error) => {
  console.error('app check crashed:', error);
  process.exit(1);
});

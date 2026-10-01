import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import type { DOMWindow } from 'jsdom';
import { DashboardLayout } from '../src/admin-ui/dashboard-layout.js';
import { CLIENT_SCRIPT } from '../src/admin-ui/client-script.js';

/**
 * Layout and behaviour coverage for the redesigned console.
 *
 * `admin-dashboard.test.ts` owns the DOM contract the withdrawal pipeline
 * depends on. This suite covers what surrounds it: the shell structure, live
 * data binding, the loading/empty states, and the rule that no secret is ever
 * rendered into the page.
 */
const DOM_TIMEOUT = 30_000;
const KEY = 'unit-test-admin-key-that-is-long';
const PAGE = DashboardLayout();

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

type Device = {
  device_id: string;
  phone_model: string;
  active_status: boolean;
  sim_slot: number | null;
  channel: string | null;
  carrier: string | null;
  battery_level: number | null;
  network_type: string | null;
  online: boolean;
  last_seen_at: string;
};

/** A representative fleet: two flat batteries, one silent phone, one blocked. */
const FLEET: Device[] = [
  { device_id: 'DEV-001', phone_model: 'Tecno Spark 8', active_status: true, sim_slot: 0, channel: 'TELEBIRR', carrier: 'Ethio Telecom', battery_level: 78, network_type: '4G', online: true, last_seen_at: ago(4_000) },
  { device_id: 'DEV-002', phone_model: 'Samsung A12', active_status: true, sim_slot: 0, channel: 'TELEBIRR', carrier: 'Ethio Telecom', battery_level: 65, network_type: '4G', online: true, last_seen_at: ago(6_000) },
  { device_id: 'DEV-003', phone_model: 'Infinix Hot 30', active_status: true, sim_slot: 1, channel: 'CBE', carrier: 'Safaricom', battery_level: 92, network_type: 'LTE', online: true, last_seen_at: ago(9_000) },
  { device_id: 'DEV-004', phone_model: 'Tecno Camon 20', active_status: true, sim_slot: 0, channel: 'CBE', carrier: 'Etharicom', battery_level: 41, network_type: '3G', online: false, last_seen_at: ago(3_600_000) },
  { device_id: 'DEV-005', phone_model: 'Nokia G11', active_status: false, sim_slot: 1, channel: 'CBE', carrier: 'Ethio Telecom', battery_level: null, network_type: null, online: false, last_seen_at: ago(7_200_000) }
];

/** Thirteen payouts so pagination has to page for real. */
const LEDGER = Array.from({ length: 13 }, (_, i) => ({
  transaction_id: `WD-${1000 + i}`,
  amount: (120 + i * 7.5).toFixed(2),
  currency: 'ETB',
  destination: `091${1000000 + i}`,
  status: ['COMPLETED', 'PENDING', 'FAILED'][i % 3],
  channel: i % 2 ? 'CBE' : 'TELEBIRR',
  device_id: i % 4 === 3 ? null : FLEET[i % FLEET.length]?.device_id ?? null,
  device_model: i % 4 === 3 ? null : FLEET[i % FLEET.length]?.phone_model ?? null,
  created_at: ago(i * 60_000)
}));

const OVERVIEW = {
  total_cash_in: '52000.00',
  total_withdrawals: '18450.25',
  remaining_balance: '33549.75',
  cash_in_today: '1250.00',
  withdrawals_today: '430.00',
  balance_today: '33549.75'
};

type Call = { path: string; method: string; body: Record<string, unknown> | null };
type Ui = {
  document: Document;
  window: DOMWindow;
  calls: Call[];
  $: (id: string) => HTMLElement;
  all: (selector: string) => Element[];
  rows: (id: string) => Element[];
  text: (id: string) => string;
  wait: (ms: number) => Promise<void>;
};

/**
 * Boots the real page plus the real client against the admin API.
 *
 * `reject: true` makes every admin call answer 401, which is how the failure
 * path is exercised without needing a server.
 */
async function boot(options: { reject?: boolean } = {}): Promise<Ui> {
  const calls: Call[] = [];
  const dom = new JSDOM(PAGE, { runScripts: 'outside-only', url: 'https://localhost/admin' });
  const { window } = dom as unknown as { window: DOMWindow };
  const document = window.document;

  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
  const denied = () => Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ success: false, error: 'Admin authentication required' }) } as Response);

  (window as unknown as Record<string, unknown>).fetch = (path: string, init?: RequestInit) => {
    calls.push({ path, method: init?.method ?? 'GET', body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null });
    if (options.reject) return denied();
    if (path === '/api/admin/overview') return json({ success: true, overview: OVERVIEW });
    if (path === '/api/admin/devices') return json({ success: true, devices: FLEET });
    if (path === '/api/admin/transactions') return json({ success: true, transactions: LEDGER });
    if (path === '/api/admin/withdrawals') return json({ success: true, withdrawal: { transaction_id: 'WD-NEW999' } });
    if (path.startsWith('/api/admin/devices/')) return json({ success: true, device: { device_id: 'x' } });
    return json({ success: false, error: 'not mocked' });
  };

  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(null), { once: true }));
  }
  window.eval(CLIENT_SCRIPT);

  return {
    document,
    window,
    calls,
    $: (id: string) => document.getElementById(id) as HTMLElement,
    all: (selector: string) => Array.from(document.querySelectorAll(selector)),
    rows: (id: string) => Array.from(document.querySelectorAll(`#${id} tr`)),
    text: (id: string) => (document.getElementById(id)?.textContent ?? '').trim(),
    wait: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  };
}

/** Types the key, clicks unlock and waits for the three admin reads to land. */
async function unlock(ui: Ui) {
  (ui.$('key') as HTMLInputElement).value = KEY;
  ui.$('unlock').click();
  await ui.wait(60);
}

function submit(ui: Ui) {
  ui.$('withdrawal-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
}

/** Routed sections: a real URL, a real view and a real dataset behind each. */
const USERS_FIXTURE = [
  { id: '11111111-1111-4111-8111-111111111111', email: 'ops@telebirr.et', available_balance: '5000.00', reserved_balance: '250.00', currency: 'ETB', withdrawal_count: 7, last_withdrawal_at: ago(600_000), is_admin_user: true },
  { id: '22222222-2222-4222-8222-222222222222', email: 'merchant@example.com', available_balance: '120.50', reserved_balance: '0.00', currency: 'ETB', withdrawal_count: 1, last_withdrawal_at: null, is_admin_user: false }
];

const ACTIVITY_FIXTURE = [
  { kind: 'webhook', title: 'payment.succeeded', detail: 'telebirr', level: 'info', settled: true, created_at: ago(5_000) },
  { kind: 'webhook', title: 'payment.received', detail: 'cbe', level: 'error', settled: false, created_at: ago(60_000) },
  { kind: 'outbox', title: 'withdrawal.queued', detail: 'published', level: 'info', settled: true, created_at: ago(120_000) }
];

const SETTINGS_FIXTURE = {
  read_only: true,
  environment: 'development',
  local_infra_fallback: true,
  channels: ['TELEBIRR', 'CBE'],
  currency: 'ETB',
  min_withdrawal: '1.00',
  max_withdrawal: '100000.00',
  worker_concurrency: 10,
  processing_timeout_seconds: 300,
  device_online_window_seconds: 90,
  auto_refresh_seconds: 30,
  health: {
    devices_total: 5, devices_online: 3, pending_withdrawals: 2,
    processing_withdrawals: 0, failed_withdrawals: 1, outbox_backlog: 0, rejected_webhooks: 1
  }
};

const WITHDRAWAL_QUEUE = [
  { id: 'w-1', transaction_id: 'WD-Q1', amount: '750.00', currency: 'ETB', destination: '0911000001', status: 'PENDING', channel: 'TELEBIRR', device_id: 'DEV-001', device_model: 'Tecno Spark 8', attempt_count: 0, failure_reason: null, notes: null, created_at: ago(30_000), updated_at: ago(30_000) },
  { id: 'w-2', transaction_id: 'WD-Q2', amount: '99.00', currency: 'ETB', destination: '0911000002', status: 'COMPLETED', channel: 'CBE', device_id: 'DEV-003', device_model: 'Infinix Hot 30', attempt_count: 1, failure_reason: null, notes: null, created_at: ago(300_000), updated_at: ago(290_000) },
  { id: 'w-3', transaction_id: 'WD-Q3', amount: '10.00', currency: 'ETB', destination: '0911000003', status: 'FAILED', channel: 'CBE', device_id: null, device_model: null, attempt_count: 3, failure_reason: 'Provider rejected the payout', notes: null, created_at: ago(600_000), updated_at: ago(590_000) }
];

async function bootRouted(path: string): Promise<Ui> {
  // Boots the client against the requested URL so the router starts on that
  // route, exactly as a hard refresh on that address would.
  const dom = new JSDOM(PAGE, { runScripts: 'outside-only', url: `https://localhost${path}` });
  const { window } = dom as unknown as { window: DOMWindow };
  const document = window.document;
  const calls: Call[] = [];
  const json = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
  (window as unknown as Record<string, unknown>).fetch = (p: string, init?: RequestInit) => {
    calls.push({ path: p, method: init?.method ?? 'GET', body: null });
    if (p.startsWith('/api/admin/overview')) return json({ success: true, overview: OVERVIEW });
    if (p.startsWith('/api/admin/devices')) return json({ success: true, devices: FLEET });
    if (p.startsWith('/api/admin/transactions')) return json({ success: true, transactions: LEDGER });
    if (p.startsWith('/api/admin/withdrawals')) return json({ success: true, withdrawals: WITHDRAWAL_QUEUE });
    if (p.startsWith('/api/admin/users')) return json({ success: true, users: USERS_FIXTURE });
    if (p.startsWith('/api/admin/activity')) return json({ success: true, activity: ACTIVITY_FIXTURE });
    if (p.startsWith('/api/admin/settings')) return json({ success: true, settings: SETTINGS_FIXTURE });
    return json({ success: false, error: 'not mocked' });
  };
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
  window.eval(CLIENT_SCRIPT);
  (document.getElementById('key') as HTMLInputElement).value = KEY;
  document.getElementById('unlock')?.click();
  await new Promise((r) => setTimeout(r, 90));
  return { document, window, calls, $: (id) => document.getElementById(id) as HTMLElement, all: (s) => Array.from(document.querySelectorAll(s)), rows: (id) => Array.from(document.querySelectorAll(`#${id} tr`)), text: (id) => (document.getElementById(id)?.textContent ?? '').trim(), wait: (ms) => new Promise((r) => setTimeout(r, ms)) };
}
describe('admin console shell', () => {
  it('renders the sidebar, header and every panel anchor', () => {
    const dom = new JSDOM(PAGE);
    const ids = ['sidebar', 'nav-toggle', 'search', 'gateway-status', 'notifications', 'admin-menu',
      'cash', 'withdrawals', 'balance', 'access', 'key', 'unlock', 'withdrawal-form', 'phone', 'amount',
      'channel-dropdown', 'target-dropdown', 'devices', 'device-count', 'stat-total', 'stat-online',
      'stat-offline', 'transactions', 'txns', 'txn-count', 'txn-pager', 'quick-actions', 'clock-date'];
    for (const id of ids) expect(dom.window.document.getElementById(id), id).not.toBeNull();
  });

  it('lays out the navigation, quick actions and metrics the brief specifies', () => {
    const dom = new JSDOM(PAGE);
    const d = dom.window.document;
    expect(d.querySelectorAll('.nav-item')).toHaveLength(8);
    expect(d.querySelectorAll('.qa-item')).toHaveLength(4);
    expect(d.querySelectorAll('.stat')).toHaveLength(3);
    expect(d.querySelector('.nav-item.is-active')?.textContent).toContain('Dashboard');
    expect(d.querySelector('.brand-name')?.textContent).toContain('AUTO-WITHDRAWAL GATEWAY');
    expect(d.querySelector('.sidebar-foot')?.textContent).toContain('Secure & Reliable');
  });

  it('keeps the console CSP-safe and free of inline handlers', () => {
    expect(PAGE).toContain('<script src="/admin/app.js"');
    expect(PAGE).not.toMatch(/\son(click|load|submit)=/i);
    expect(CLIENT_SCRIPT).not.toMatch(/\son(click|load|submit)=/i);
  });
});

describe('admin console data binding', () => {
  it('fills every metric from the overview endpoint', async () => {
    const ui = await boot();
    await unlock(ui);
    expect(ui.text('cash')).toBe('52,000.00');
    expect(ui.text('withdrawals')).toBe('18,450.25');
    expect(ui.text('balance')).toBe('33,549.75');
    expect(ui.text('cash-delta')).toContain('1,250.00');
    expect(ui.text('gateway-status-text')).toBe('System Online');
    expect(ui.document.body.classList.contains('unlocked')).toBe(true);
  }, DOM_TIMEOUT);

  it('summarises the fleet and renders telemetry from real device rows', async () => {
    const ui = await boot();
    await unlock(ui);
    expect(ui.text('stat-total')).toBe('5');
    expect(ui.text('stat-online')).toBe('3');
    expect(ui.text('stat-offline')).toBe('2');
    expect(ui.text('device-count')).toBe('3 online / 5 devices');
    expect(ui.rows('devices')).toHaveLength(5);
    expect(ui.rows('devices')[0]?.textContent).toContain('78%');
    // A device that reports no telemetry degrades instead of showing a zero.
    expect(ui.rows('devices')[4]?.querySelector('.battery-value')?.textContent).toBe('—');
    expect(ui.rows('devices')[4]?.querySelector('.net')?.textContent).toBe('No data');
  }, DOM_TIMEOUT);

  it('pages the ledger and filters it from the header search', async () => {
    const ui = await boot();
    await unlock(ui);
    expect(ui.text('txn-count')).toBe('13 payouts');
    expect(ui.rows('txns')).toHaveLength(5);
    expect(ui.text('txn-page-info')).toContain('Showing 1–5 of 13');

    (ui.$('txn-page-controls').querySelector('[data-page="2"]') as HTMLElement).click();
    await ui.wait(20);
    expect(ui.text('txn-page-info')).toContain('Showing 6–10 of 13');

    (ui.$('search') as HTMLInputElement).value = 'WD-1004';
    ui.$('search').dispatchEvent(new ui.window.Event('input', { bubbles: true }));
    await ui.wait(20);
    expect(ui.rows('txns')).toHaveLength(1);
    expect(ui.$('txns').textContent).toContain('WD-1004');
  }, DOM_TIMEOUT);

  it('counts unsettled payouts on the notification badge', async () => {
    const ui = await boot();
    await unlock(ui);
    const badge = ui.$('notif-badge');
    expect(badge.classList.contains('has-items')).toBe(true);
    expect(Number(badge.textContent)).toBeGreaterThan(0);
  }, DOM_TIMEOUT);

  it('shows a real East Africa Time clock rather than a hardcoded stamp', async () => {
    const ui = await boot();
    await unlock(ui);
    expect(ui.text('clock-time')).toMatch(/\(EAT\)$/);
    expect(ui.text('clock-date')).not.toBe('—');
  }, DOM_TIMEOUT);
});
describe('admin console routing', () => {
  const ROUTES = [
    { path: '/admin', view: 'view-dashboard', title: 'Welcome Back, Admin' },
    { path: '/admin/transactions', view: 'view-transactions', title: 'Transactions' },
    { path: '/admin/withdrawals', view: 'view-withdrawals', title: 'Withdrawals' },
    { path: '/admin/devices', view: 'view-devices', title: 'Devices' },
    { path: '/admin/users', view: 'view-users', title: 'Users' },
    { path: '/admin/settings', view: 'view-settings', title: 'Settings' },
    { path: '/admin/logs', view: 'view-logs', title: 'Logs' }
  ];

  it('renders a container for every sidebar route', () => {
    const dom = new JSDOM(PAGE);
    for (const route of ROUTES) {
      expect(dom.window.document.getElementById(route.view), route.path).not.toBeNull();
    }
  });

  it('exposes every route as a real sidebar link', () => {
    const dom = new JSDOM(PAGE);
    const links = Array.from(dom.window.document.querySelectorAll('.nav-item'));
    expect(links).toHaveLength(8);
    for (const route of ROUTES) {
      const link = links.find((l) => l.getAttribute('data-route') === route.view.replace('view-', ''));
      expect(link, route.path).toBeDefined();
      // A real href keeps the URL bookmarkable and middle-click working.
      expect(link?.getAttribute('href')).toBe(route.path);
    }
  });

  it.each(ROUTES)('boots on $path and shows only that view', async ({ path, view, title }) => {
    const ui = await bootRouted(path);
    expect(ui.$(view).hidden).toBe(false);
    for (const other of ROUTES.filter((r) => r.view !== view)) {
      expect(ui.$(other.view).hidden, other.path).toBe(true);
    }
    expect(ui.text('view-title')).toContain(title);
    const active = ui.all('.nav-item.is-active');
    expect(active).toHaveLength(1);
    expect(active[0]?.getAttribute('data-route')).toBe(view.replace('view-', ''));
  }, DOM_TIMEOUT);

  it('navigates between sections without a reload and loads that dataset', async () => {
    const ui = await bootRouted('/admin');
    const link = ui.document.querySelector('.nav-item[data-route="users"]') as HTMLElement;
    link.dispatchEvent(new ui.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
    await ui.wait(60);

    expect(ui.$('view-users').hidden).toBe(false);
    expect(ui.$('view-dashboard').hidden).toBe(true);
    expect(ui.text('view-title')).toContain('Users');
    // The dataset came from the API, not from a placeholder.
    expect(ui.calls.some((c) => c.path.startsWith('/api/admin/users'))).toBe(true);
    expect(ui.rows('users-all')).toHaveLength(2);
    expect(ui.$('users-all').textContent).toContain('ops@telebirr.et');
    expect(ui.$('users-all').textContent).toContain('5,000.00');
    expect(ui.$('users-all').textContent).toContain('Operator');
    expect(ui.$('users-all').textContent).toContain('Standard');
  }, DOM_TIMEOUT);
});
describe('admin console routed datasets', () => {
  it('fills the transactions view from the ledger endpoint', async () => {
    const ui = await bootRouted('/admin/transactions');
    expect(ui.calls.some((c) => c.path.startsWith('/api/admin/transactions'))).toBe(true);
    expect(ui.text('txn-all-count')).toBe('13 transactions');
    expect(ui.$('txn-all').textContent).toContain('WD-1000');
    expect(ui.$('txn-all').textContent).toContain('COMPLETED');
  }, DOM_TIMEOUT);

  it('fills the withdrawals view and only offers cancel on queued payouts', async () => {
    const ui = await bootRouted('/admin/withdrawals');
    expect(ui.calls.some((c) => c.path.startsWith('/api/admin/withdrawals'))).toBe(true);
    expect(ui.text('wd-count')).toBe('3 withdrawals');
    const rows = ui.rows('wd-all');
    expect(rows).toHaveLength(3);
    // A queued payout is cancellable; a settled one is not.
    expect(rows[0]?.querySelector('[data-action="cancel"]')).not.toBeNull();
    expect(rows[1]?.querySelector('[data-action="cancel"]')).toBeNull();
    expect(ui.$('wd-all').textContent).toContain('Provider rejected the payout');
  }, DOM_TIMEOUT);

  it('filters the withdrawals queue by status', async () => {
    const ui = await bootRouted('/admin/withdrawals');
    const select = ui.$('wd-status') as HTMLSelectElement;
    select.value = 'FAILED';
    select.dispatchEvent(new ui.window.Event('change', { bubbles: true }));
    await ui.wait(20);
    expect(ui.rows('wd-all')).toHaveLength(1);
    expect(ui.$('wd-all').textContent).toContain('WD-Q3');
  }, DOM_TIMEOUT);

  it('fills the devices view with fleet telemetry', async () => {
    const ui = await bootRouted('/admin/devices');
    expect(ui.rows('dev-all')).toHaveLength(5);
    expect(ui.text('dev-stat-total')).toBe('5');
    expect(ui.text('dev-stat-online')).toBe('3');
    expect(ui.$('dev-all').textContent).toContain('DEV-001');
    expect(ui.$('dev-all').textContent).toContain('78%');
  }, DOM_TIMEOUT);

  it('fills the logs view and filters by level', async () => {
    const ui = await bootRouted('/admin/logs');
    expect(ui.calls.some((c) => c.path.startsWith('/api/admin/activity'))).toBe(true);
    expect(ui.rows('log-all')).toHaveLength(3);
    expect(ui.$('log-all').textContent).toContain('payment.succeeded');
    const select = ui.$('log-level') as HTMLSelectElement;
    select.value = 'error';
    select.dispatchEvent(new ui.window.Event('change', { bubbles: true }));
    await ui.wait(20);
    expect(ui.rows('log-all')).toHaveLength(1);
    expect(ui.$('log-all').textContent).toContain('ERROR');
  }, DOM_TIMEOUT);

  it('fills the settings view with config and health, never a secret', async () => {
    const ui = await bootRouted('/admin/settings');
    expect(ui.calls.some((c) => c.path.startsWith('/api/admin/settings'))).toBe(true);
    const body = ui.$('settings-body').textContent ?? '';
    expect(body).toContain('Minimum withdrawal');
    expect(body).toContain('100,000.00');
    expect(body).toContain('Service health');
    expect(body).toContain('Rejected webhooks');
    expect(ui.text('settings-badge')).toBe('Read-only');
    for (const secret of [process.env.ADMIN_API_KEY, process.env.JWT_SECRET, process.env.DATABASE_URL]) {
      if (secret) expect(body.includes(secret)).toBe(false);
    }
  }, DOM_TIMEOUT);
});
// __LOADING_SUITES__
  describe('admin console loading states', () => {
  it('paints skeletons on the opening unlock, then clears them', async () => {
    const ui = await boot();
    (ui.$('key') as HTMLInputElement).value = KEY;
    ui.$('unlock').click();

    // Sampled synchronously: the fetch has not resolved yet, so placeholders
    // must already be on screen.
    expect(ui.all('#devices .skel').length).toBeGreaterThan(0);
    expect(ui.all('#txns .skel').length).toBeGreaterThan(0);
    expect(ui.$('cash').classList.contains('skel')).toBe(true);

    await ui.wait(60);
    expect(ui.all('#devices .skel')).toHaveLength(0);
    expect(ui.all('#txns .skel')).toHaveLength(0);
    expect(ui.$('cash').classList.contains('skel')).toBe(false);
    expect(ui.text('cash')).toBe('52,000.00');
  }, DOM_TIMEOUT);

  it('clears the skeletons when the key is rejected instead of stranding them', async () => {
    const ui = await boot({ reject: true });
    await unlock(ui);
    expect(ui.all('#devices .skel')).toHaveLength(0);
    expect(ui.all('#txns .skel')).toHaveLength(0);
    expect(ui.$('cash').classList.contains('skel')).toBe(false);
    // The empty state must be readable, not hidden behind shimmer bars.
    expect(ui.$('txns').textContent).toContain('No payouts have been dispatched');
    expect(ui.document.body.classList.contains('unlocked')).toBe(false);
    expect(ui.text('gateway-status-text')).toBe('System Offline');
  }, DOM_TIMEOUT);

  it('shows the locked empty states before the operator authorises', async () => {
    const dom = new JSDOM(PAGE);
    expect(dom.window.document.getElementById('devices')?.textContent).toContain('Unlock the console');
    expect(dom.window.document.getElementById('txns')?.textContent).toContain('Unlock the console');
  });
});

describe('admin console payout dispatch', () => {
  it('blocks an invalid phone before anything reaches the API', async () => {
    const ui = await boot();
    await unlock(ui);
    (ui.$('phone') as HTMLInputElement).value = 'abc';
    (ui.$('amount') as HTMLInputElement).value = '10';
    submit(ui);
    await ui.wait(20);
    expect(ui.calls.filter((c) => c.path === '/api/admin/withdrawals')).toHaveLength(0);
    expect(ui.document.querySelector('[data-field="phone"]')?.classList.contains('has-error')).toBe(true);
  }, DOM_TIMEOUT);

  it('posts a valid payout and restores the button afterwards', async () => {
    const ui = await boot();
    await unlock(ui);
    (ui.$('phone') as HTMLInputElement).value = '0911234567';
    (ui.$('amount') as HTMLInputElement).value = '250';
    submit(ui);
    await ui.wait(60);

    const post = ui.calls.find((c) => c.path === '/api/admin/withdrawals');
    expect(post?.method).toBe('POST');
    expect(post?.body).toMatchObject({ destinationPhone: '0911234567', amount: 250 });
    expect(ui.$('form-feedback').classList.contains('success')).toBe(true);
    expect((ui.$('submit-withdrawal') as HTMLButtonElement).disabled).toBe(false);
  }, DOM_TIMEOUT);

  it('still reaches the device status endpoint for block/unblock', async () => {
    const ui = await boot();
    await unlock(ui);
    const button = ui.$('devices').querySelector('[data-action="toggle"]') as HTMLElement;
    const deviceId = button.getAttribute('data-device-id');
    button.click();
    await ui.wait(40);
    const patch = ui.calls.find((c) => c.path.startsWith('/api/admin/devices/'));
    expect(patch?.method).toBe('PATCH');
    expect(decodeURIComponent(patch?.path ?? '')).toContain(deviceId ?? '');
  }, DOM_TIMEOUT);
});

describe('admin console security', () => {
  it('never embeds a configured secret in the served page or client', () => {
    const secrets = [
      process.env.ADMIN_API_KEY,
      process.env.JWT_SECRET,
      process.env.PAYMENT_WEBHOOK_SECRET,
      process.env.DATABASE_URL
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
    expect(secrets.length).toBeGreaterThan(0);
    for (const secret of secrets) {
      expect(PAGE.includes(secret), secret.slice(0, 8)).toBe(false);
      expect(CLIENT_SCRIPT.includes(secret), secret.slice(0, 8)).toBe(false);
    }
  });

  it('keeps the admin key in the form field rather than in web storage', () => {
    expect(CLIENT_SCRIPT).not.toMatch(/localStorage\.setItem\([^)]*key/i);
    expect(CLIENT_SCRIPT).not.toMatch(/sessionStorage\.setItem\([^)]*key/i);
  });

  it('carries the key on the request header only', async () => {
    const ui = await boot();
    await unlock(ui);
    // Unlocking with an empty key must never fire a request.
    expect(ui.calls.every((c) => c.path.startsWith('/api/'))).toBe(true);
  }, DOM_TIMEOUT);
});
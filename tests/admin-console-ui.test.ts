import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import type { DOMWindow } from 'jsdom';
import { DashboardLayout } from '../src/admin-ui/dashboard-layout.js';
import { CLIENT_SCRIPT } from '../src/admin-ui/client-script.js';

/**
 * The mobile-first admin console, driven exactly as an operator drives it.
 *
 * The console is an app shell now: a splash, a login layer, a sticky top bar,
 * a four-destination bottom bar and eight screens the router shows one at a
 * time. These tests boot the real document from DashboardLayout() and the real
 * client from CLIENT_SCRIPT, so the assertions pin the shipped DOM rather than
 * a copy of it.
 *
 * The previous table-based suite asserted `tr` rows, a sidebar and panel anchors
 * that this layout no longer has; every assertion here targets the current
 * markup instead.
 */
const DOM_TIMEOUT = 30_000;
const KEY = 'unit-test-admin-key-that-is-long';
const PAGE = DashboardLayout('operator');

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const OVERVIEW = {
  total_cash_in: '184250.00',
  total_withdrawals: '42305.25',
  remaining_balance: '141944.75',
  cash_in_today: '5000.00'
};

const FLEET = [
  { device_id: 'DEV-001', phone_model: 'Tecno Spark 8', channel: 'TELEBIRR', carrier: 'Ethio Telecom', online: true, active_status: true, battery_level: 82, network_type: '4G', last_seen_at: ago(5_000), last_ip: '10.0.0.5', enabled_banks: ['TELEBIRR', 'CBEBIRR'] },
  { device_id: 'DEV-002', phone_model: 'Infinix Hot 30', channel: 'CBE', carrier: 'CBE', online: false, active_status: true, battery_level: 12, network_type: '3G', last_seen_at: ago(600_000), last_ip: '10.0.0.6', enabled_banks: null },
  { device_id: 'DEV-003', phone_model: 'Samsung A15', channel: 'TELEBIRR', carrier: 'Safaricom', online: false, active_status: false, battery_level: null, network_type: null, last_seen_at: ago(900_000), last_ip: null, enabled_banks: null }
];

const LEDGER = [
  { transaction_id: 'WD-1', destination: '0911000001', amount: '750.00', currency: 'ETB', status: 'COMPLETED', channel: 'TELEBIRR', device_id: 'DEV-001', device_model: 'Tecno Spark 8', created_at: ago(120_000) },
  { transaction_id: 'WD-2', destination: '0911000002', amount: '99.00', currency: 'ETB', status: 'PENDING', channel: 'CBE', device_id: 'DEV-002', device_model: 'Infinix Hot 30', created_at: ago(300_000) },
  // No device_id: an auto-assigned payout must not be attributed to a phone.
  { transaction_id: 'WD-3', destination: '0911000003', amount: '10.00', currency: 'ETB', status: 'FAILED', channel: 'CBE', device_id: null, device_model: null, created_at: ago(600_000) }
];

type Call = { path: string; method: string; body: Record<string, unknown> | null };

interface Ui {
  document: Document;
  window: DOMWindow;
  calls: Call[];
  $: (id: string) => HTMLElement;
  all: (selector: string) => Element[];
  text: (id: string) => string;
  visibleScreens: () => string[];
  wait: (ms: number) => Promise<void>;
}

/** Boots the real page and the real client with the admin API stubbed. */
async function boot(path = '/admin', options: { reject?: boolean } = {}): Promise<Ui> {
  const calls: Call[] = [];
  const dom = new JSDOM(PAGE, { runScripts: 'outside-only', url: `https://localhost${path}` });
  const { window } = dom as unknown as { window: DOMWindow };
  const document = window.document;

  const json = (body: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
  const denied = () =>
    Promise.resolve({ ok: false, status: 401, json: () => Promise.resolve({ success: false, error: 'Admin authentication required' }) } as Response);

  (window as unknown as Record<string, unknown>).fetch = (target: string, init?: RequestInit) => {
    let body: Record<string, unknown> | null = null;
    try {
      body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    } catch {
      body = null;
    }
    calls.push({ path: target, method: init?.method ?? 'GET', body });
    if (options.reject) return denied();
    // Sign-in is now its own credential-only call, made before any data is
    // loaded. It has to be stubbed or every unlock would be rejected here.
    if (target === '/api/admin/login') return json({ success: true });
    if (target === '/api/admin/overview') return json({ success: true, overview: OVERVIEW });
    if (target === '/api/admin/devices') return json({ success: true, devices: FLEET });
    if (target === '/api/admin/transactions') return json({ success: true, transactions: LEDGER });
    if (target === '/api/admin/withdrawals') return json({ success: true, withdrawal: { transaction_id: 'WD-NEW999' } });
    if (target.startsWith('/api/admin/devices/')) return json({ success: true, device: { device_id: 'DEV-001' } });
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
    $: (id) => document.getElementById(id) as HTMLElement,
    all: (selector) => Array.from(document.querySelectorAll(selector)),
    text: (id) => (document.getElementById(id)?.textContent ?? '').trim(),
    // The router shows exactly one screen; `hidden` marks the rest.
    visibleScreens: () =>
      Array.from(document.querySelectorAll<HTMLElement>('.screen'))
        .filter((node) => !node.hasAttribute('hidden'))
        .map((node) => node.id),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  };
}

/** Types the password, submits the form and waits for the admin reads to land. */
async function unlock(ui: Ui) {
  (ui.$('key') as HTMLInputElement).value = KEY;
  ui.$('login-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
  await ui.wait(80);
}

describe('admin console shell', () => {
  it('renders the splash, the login layer and the app shell', () => {
    const dom = new JSDOM(PAGE);
    const d = dom.window.document;
    for (const id of ['splash', 'splash-status', 'login', 'login-form', 'username', 'key', 'unlock', 'app', 'bottom-nav']) {
      expect(d.getElementById(id), `missing #${id}`).toBeTruthy();
    }
    expect(d.getElementById('splash')?.getAttribute('aria-hidden')).toBe('true');
    expect(d.body.className).toContain('is-locked');
  });

  it('prefills the configured username so only the password is typed', () => {
    const dom = new JSDOM(PAGE);
    expect((dom.window.document.getElementById('username') as HTMLInputElement).value).toBe('operator');
  });

  it('ships every routed screen, and only Home is visible before navigation', () => {
    const dom = new JSDOM(PAGE);
    const d = dom.window.document;
    for (const route of ['home', 'transactions', 'devices', 'more', 'send', 'device', 'profile']) {
      const screen = d.getElementById(`view-${route}`);
      expect(screen, `missing #view-${route}`).toBeTruthy();
      expect(screen?.classList.contains('screen'), `#view-${route} is not a screen`).toBe(true);
    }
    expect(d.getElementById('view-home')?.hasAttribute('hidden')).toBe(false);
    expect(d.getElementById('view-devices')?.hasAttribute('hidden')).toBe(true);
  });

  it('exposes exactly four bottom-nav destinations as real bookmarkable links', () => {
    const dom = new JSDOM(PAGE);
    const items = Array.from(dom.window.document.querySelectorAll('.nav-item[data-route]'));
    expect(items.map((i) => i.getAttribute('data-route'))).toEqual(['home', 'transactions', 'devices', 'more']);
    expect(items.map((i) => i.getAttribute('href'))).toEqual([
      '/admin',
      '/admin/transactions',
      '/admin/devices',
      '/admin/more'
    ]);
    // A real anchor, so middle-click and "open in new tab" keep working.
    expect(items.every((i) => i.tagName === 'A')).toBe(true);
  });

  it('renders the top bar with its gateway status and controls', () => {
    const dom = new JSDOM(PAGE);
    const d = dom.window.document;
    expect(d.querySelector('header.topbar')).toBeTruthy();
    for (const id of ['view-title', 'view-subtitle', 'gateway-status', 'refresh', 'notifications', 'admin-menu']) {
      expect(d.getElementById(id), `missing #${id}`).toBeTruthy();
    }
    expect(d.getElementById('back')?.hasAttribute('hidden')).toBe(true);
  });

  it('keeps the console CSP-safe and free of inline handlers', () => {
    expect(PAGE).toContain('<script src="/admin/app.js"');
    expect(PAGE).not.toMatch(/\son(click|load|submit)=/i);
    expect(CLIENT_SCRIPT).not.toMatch(/\son(click|load|submit)=/i);
  });

  it('never embeds a deployment secret in the page or the client', () => {
    const secrets = [
      process.env.ADMIN_API_KEY,
      process.env.JWT_SECRET,
      process.env.PAYMENT_WEBHOOK_SECRET,
      process.env.WEBHOOK_SECRET,
      process.env.DATABASE_URL
    ].filter((value): value is string => typeof value === 'string' && value.length > 0);
    expect(secrets.length, 'no secrets resolved from the environment to check against').toBeGreaterThan(0);
    for (const secret of secrets) {
      expect(PAGE.includes(secret), secret.slice(0, 8)).toBe(false);
      expect(CLIENT_SCRIPT.includes(secret), secret.slice(0, 8)).toBe(false);
    }
  });

  it('keeps the admin key in the form field rather than in web storage', () => {
    expect(CLIENT_SCRIPT).not.toMatch(/localStorage\.setItem\([^)]*key/i);
    expect(CLIENT_SCRIPT).not.toMatch(/sessionStorage\.setItem\([^)]*key/i);
  });
});

describe('admin console sign-in', () => {
  it('unlocks the console and hides the login layer once the key is accepted', async () => {
    const ui = await boot();
    expect(ui.document.body.className).toContain('is-locked');
    await unlock(ui);
    expect(ui.document.body.className).toContain('unlocked');
    expect(ui.$('login').getAttribute('aria-hidden')).toBe('true');
    expect(ui.calls.some((c) => c.path === '/api/admin/overview')).toBe(true);
  }, DOM_TIMEOUT);

  it('stays locked and fires no admin request when the password is empty', async () => {
    const ui = await boot();
    (ui.$('key') as HTMLInputElement).value = '';
    ui.$('login-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
    await ui.wait(60);
    expect(ui.document.body.className).not.toContain('unlocked');
    expect(ui.calls.filter((c) => c.path.startsWith('/api/'))).toHaveLength(0);
  }, DOM_TIMEOUT);

  it('surfaces the rejection and stays locked when the server refuses the key', async () => {
    const ui = await boot('/admin', { reject: true });
    (ui.$('key') as HTMLInputElement).value = 'wrong-key';
    ui.$('login-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
    await ui.wait(80);
    expect(ui.document.body.className).not.toContain('unlocked');
    // Nothing may render behind the login layer on a rejected sign-in.
    expect(ui.all('.dev-row')).toHaveLength(0);
    expect(ui.all('.txn')).toHaveLength(0);
  }, DOM_TIMEOUT);

  it('never writes the key to localStorage or sessionStorage', async () => {
    const ui = await boot();
    await unlock(ui);
    expect(ui.window.localStorage.getItem('adminKey')).toBeNull();
    expect(ui.window.sessionStorage.length).toBe(0);
  }, DOM_TIMEOUT);
});

describe('admin console data binding', () => {
  it('fills the home summary from the overview endpoint', async () => {
    const ui = await boot();
    await unlock(ui);
    // The API returns formatted strings; the client formats the totals again.
    expect(ui.text('cash')).toContain('184,250');
    expect(ui.text('withdrawals')).toContain('42,305');
    expect(ui.text('balance')).toContain('141,944');
    // Growth is today's share of lifetime cash-in, never a guess from the balance.
    expect(ui.text('balance-growth')).toMatch(/2\.71%/);
    expect(ui.text('active-devices')).toBe('1');
  }, DOM_TIMEOUT);

  it('renders the gateway as Online once the overview answers', async () => {
    const ui = await boot();
    await unlock(ui);
    expect(ui.text('gateway-status-text')).toBe('Online');
  }, DOM_TIMEOUT);

  it('summarises the fleet and renders one row per device', async () => {
    const ui = await boot();
    await unlock(ui);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);

    expect(ui.text('stat-total')).toBe('3');
    expect(ui.text('stat-online')).toBe('1');
    expect(ui.text('stat-offline')).toBe('2');

    const rows = ui.all('#devices .dev-row');
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.getAttribute('data-device-id'))).toEqual(['DEV-001', 'DEV-002', 'DEV-003']);
    // A row is a button, so the detail screen is reachable by keyboard too.
    expect(rows.every((r) => r.tagName === 'BUTTON')).toBe(true);
    expect(rows[0]!.textContent).toContain('Tecno Spark 8');
    expect(rows[0]!.textContent).toContain('DEV-001');
  }, DOM_TIMEOUT);

  it('labels blocked, online and offline phones distinctly', async () => {
    const ui = await boot();
    await unlock(ui);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);
    const rows = ui.all('#devices .dev-row');
    // Blocked outranks online so a blocked phone is never read as dispatchable.
    expect(rows[0]!.querySelector('.pill')?.className).toContain('online');
    expect(rows[1]!.querySelector('.pill')?.className).toContain('offline');
    expect(rows[2]!.querySelector('.pill')?.className).toContain('blocked');
    expect(rows[2]!.textContent).toContain('Blocked');
  }, DOM_TIMEOUT);

  it('tiers the battery and copes with a device that reports no telemetry', async () => {
    const ui = await boot();
    await unlock(ui);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);
    const rows = ui.all('#devices .dev-row');
    expect(rows[0]!.querySelector('.battery')?.textContent).toContain('82');
    // 12% is below the 15% critical floor, and a null level must not throw.
    expect(rows[1]!.querySelector('.battery')?.className).toMatch(/low|critical/);
    expect(rows[2]!.querySelector('.battery')?.textContent).toContain('—');
  }, DOM_TIMEOUT);

  it('filters the device list from the search box', async () => {
    const ui = await boot();
    await unlock(ui);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);
    const search = ui.$('device-search') as HTMLInputElement;
    search.value = 'infinix';
    search.dispatchEvent(new ui.window.Event('input', { bubbles: true }));
    await ui.wait(40);
    expect(ui.all('#devices .dev-row').map((r) => r.getAttribute('data-device-id'))).toEqual(['DEV-002']);
  }, DOM_TIMEOUT);

  it('shows an empty state rather than a blank list when no phone has polled', async () => {
    const ui = await boot();
    await unlock(ui);
    (ui.window as unknown as { fetch: unknown }).fetch = (target: string) => {
      if (target === '/api/admin/devices') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true, devices: [] }) } as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ success: true }) } as Response);
    };
    ui.$('refresh').click();
    await ui.wait(80);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);
    expect(ui.all('#devices .dev-row')).toHaveLength(0);
    expect(ui.$('devices').textContent).toMatch(/no devices/i);
  }, DOM_TIMEOUT);

  it('opens device details when a row is tapped', async () => {
    const ui = await boot();
    await unlock(ui);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);
    ui.all('#devices .dev-row')[0]!.dispatchEvent(new ui.window.Event('click', { bubbles: true }));
    await ui.wait(60);
    expect(ui.visibleScreens()).toEqual(['view-device']);
    expect(ui.text('detail-id')).toBe('DEV-001');
    expect(ui.text('detail-network-type')).toBe('4G');
  }, DOM_TIMEOUT);

  it('renders one bank switch per supported bank and reflects the device set', async () => {
    const ui = await boot();
    await unlock(ui);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);
    ui.all('#devices .dev-row')[0]!.dispatchEvent(new ui.window.Event('click', { bubbles: true }));
    await ui.wait(60);
    const switches = ui.all('#bank-toggles .bank-switch');
    // Every supported bank gets a switch.
    expect(switches.map((s) => s.getAttribute('data-bank'))).toEqual(['TELEBIRR', 'CBEBIRR', 'AWASH', 'DASHEN', 'ABYSSINIA']);
    // DEV-001 has TELEBIRR and CBEBIRR on.
    expect(switches[0]!.getAttribute('aria-checked')).toBe('true');
    expect(switches[1]!.getAttribute('aria-checked')).toBe('true');
    expect(switches[2]!.getAttribute('aria-checked')).toBe('false');
    // A bank with no USSD flow yet is rendered but disabled.
    expect((switches[2] as HTMLButtonElement).disabled).toBe(true);
    expect(ui.text('bank-count')).toBe('2 on');
  }, DOM_TIMEOUT);

  it('posts the recomputed bank set when a switch is flipped', async () => {
    const ui = await boot();
    await unlock(ui);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);
    ui.all('#devices .dev-row')[0]!.dispatchEvent(new ui.window.Event('click', { bubbles: true }));
    await ui.wait(60);
    // Turn Telebirr off: the whole set is recomputed and posted, not just a flag.
    ui.document.querySelector<HTMLElement>('#bank-toggles .bank-switch[data-bank="TELEBIRR"]')!.click();
    await ui.wait(60);
    const call = ui.calls.find((c) => c.path === '/api/admin/devices/DEV-001/banks' && c.method === 'PATCH');
    expect(call).toBeTruthy();
    expect(call!.body).toEqual({ banks: ['CBEBIRR'] });
  }, DOM_TIMEOUT);
});

describe('admin console routing', () => {
  it('lands on Home after sign-in, whichever URL the operator arrived on', async () => {
    // The login gate funnels into Home (client 09-init calls navigate('home')
    // once the console unlocks), so deep links resolve through sign-in rather
    // than stranding the operator on a screen behind the login layer.
    for (const path of ['/admin', '/admin/transactions', '/admin/devices', '/admin/more']) {
      const ui = await boot(path);
      await unlock(ui);
      expect(ui.visibleScreens(), `on ${path}`).toEqual(['view-home']);
      expect(ui.text('view-title'), `on ${path}`).toBe('Home');
    }
  }, DOM_TIMEOUT);

  it('shows exactly one screen at a time as the operator navigates', async () => {
    const ui = await boot();
    await unlock(ui);
    const stops = ['transactions', 'devices', 'more', 'home'] as const;
    for (const route of stops) {
      ui.document.querySelector<HTMLElement>(`.nav-item[data-route="${route}"]`)?.click();
      await ui.wait(60);
      expect(ui.visibleScreens(), `on ${route}`).toEqual([`view-${route}`]);
      expect(ui.all('.nav-item.is-active').map((n) => n.getAttribute('data-route'))).toEqual([route]);
    }
  }, DOM_TIMEOUT);

  it('falls back to Home for an unknown URL rather than showing nothing', async () => {
    const ui = await boot('/admin/does-not-exist');
    await unlock(ui);
    expect(ui.visibleScreens()).toEqual(['view-home']);
  }, DOM_TIMEOUT);

  it('marks the owning tab active, so a pushed screen still reads as inside its section', async () => {
    const ui = await boot();
    await unlock(ui);
    expect(ui.all('.nav-item.is-active').map((n) => n.getAttribute('data-route'))).toEqual(['home']);
    ui.document.querySelector<HTMLElement>('.nav-item[data-route="devices"]')?.click();
    await ui.wait(60);
    expect(ui.visibleScreens()).toEqual(['view-devices']);
    expect(ui.all('.nav-item.is-active').map((n) => n.getAttribute('data-route'))).toEqual(['devices']);
  }, DOM_TIMEOUT);
});
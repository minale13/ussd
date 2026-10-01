import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import type { DOMWindow } from 'jsdom';
import { dashboard, dashboardScript } from '../src/controllers/admin-dashboard.controller.js';
import { manualWithdrawalSchema } from '../src/controllers/admin.controller.js';

/**
 * jsdom rendering a full page is slow enough to brush the 5s default on a busy
 * machine, so the DOM suites get the same explicit budget the integration suites
 * in this repo already use.
 */
const DOM_TIMEOUT = 30_000;

/** A device row in the shape admin.service.listDevices returns. */
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

/** A transaction row in the shape admin.service.listTransactions returns. */
type Txn = {
  transaction_id: string;
  amount: string;
  currency: string;
  destination: string;
  status: string;
  channel: string | null;
  device_id: string | null;
  device_model: string | null;
  created_at: string;
};

const NOW = Date.UTC(2026, 8, 30, 12, 0, 0);
const ago = (ms: number) => new Date(NOW - ms).toISOString();

/** A healthy, online Telebirr phone on SIM 1 - the baseline the fleet varies from. */
const HEALTHY: Device = {
  device_id: 'dev-online-1',
  phone_model: 'Tecno Spark 8',
  active_status: true,
  sim_slot: 0,
  channel: 'TELEBIRR',
  carrier: 'Ethio Telecom',
  battery_level: 82,
  network_type: '4G',
  online: true,
  last_seen_at: ago(5_000),
};


const FLEET: Device[] = [
  HEALTHY,
  {
    device_id: 'dev-offline-2',
    phone_model: 'Samsung Galaxy A12',
    active_status: true,
    sim_slot: 1,
    channel: 'CBE',
    carrier: 'Safaricom',
    battery_level: 12,
    network_type: '2G',
    online: false,
    last_seen_at: ago(20 * 60_000),
  },
  {
    device_id: 'dev-blocked-3',
    phone_model: 'Infinix Hot 30',
    active_status: false,
    sim_slot: 0,
    channel: 'TELEBIRR',
    carrier: 'Ethio Telecom',
    // Never reported battery or network, so the console must degrade gracefully.
    battery_level: null,
    network_type: null,
    online: true,
    last_seen_at: ago(1_000),
  },
];

const TRANSACTIONS: Txn[] = [
  {
    transaction_id: 'WD-AAA111',
    amount: '1250.00',
    currency: 'ETB',
    destination: '0911234567',
    status: 'COMPLETED',
    channel: 'TELEBIRR',
    device_id: 'dev-online-1',
    device_model: 'Tecno Spark 8',
    created_at: ago(42_000),
  },
  {
    transaction_id: 'WD-BBB222',
    amount: '75.50',
    currency: 'ETB',
    destination: '0934455667',
    status: 'FAILED',
    channel: 'CBE',
    device_id: 'dev-offline-2',
    device_model: 'Samsung Galaxy A12',
    created_at: ago(6 * 60_000),
  },
  {
    // Auto-assigned: no target device, so the console must not invent one.
    transaction_id: 'WD-CCC333',
    amount: '2100.00',
    currency: 'ETB',
    destination: '0945566778',
    status: 'PENDING',
    channel: 'CBE',
    device_id: null,
    device_model: null,
    created_at: ago(60_000),
  },
];

type FakeReply = {
  headers: Record<string, string>;
  contentType: string;
  payload: string;
  header(key: string, value: string): FakeReply;
  type(value: string): FakeReply;
  send(payload: unknown): FakeReply;
};

/**
 * Minimal stand-in for a Fastify reply: the controller only chains
 * header().type().send(). Building a real app instance would drag the whole
 * plugin stack (and a database connection) into what is really a DOM test.
 */
function fakeReply(): FakeReply {
  const reply: FakeReply = {
    headers: {},
    contentType: '',
    payload: '',
    header(key, value) {
      reply.headers[key.toLowerCase()] = value;
      return reply;
    },
    type(value) {
      reply.contentType = value;
      return reply;
    },
    send(payload) {
      reply.payload = String(payload);
      return reply;
    },
  };
  return reply;
}

const pageReply = fakeReply();
const scriptReply = fakeReply();
await dashboard({} as never, pageReply as never);
await dashboardScript({} as never, scriptReply as never);
const PAGE = pageReply.payload;
const CLIENT = scriptReply.payload;

/**
 * Boots the real /admin page plus its real /admin/app.js client in jsdom with
 * fetch stubbed by the admin API, so the tests drive the console exactly as an
 * operator does: unlock, pick a target device, dispatch a payout.
 */
async function boot(options: { devices?: Device[]; transactions?: Txn[] } = {}) {
  const devices = options.devices ?? FLEET;
  const transactions = options.transactions ?? TRANSACTIONS;
  const calls: { path: string; method: string; body: Record<string, unknown> | null }[] = [];

  const dom = new JSDOM(PAGE, { runScripts: 'outside-only', url: 'https://localhost/admin' });
  const { window } = dom as unknown as { window: DOMWindow };
  const document = window.document;

  const json = (body: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

  (window as unknown as Record<string, unknown>).fetch = (path: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push({
      path,
      method,
      body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null,
    });
    if (path === '/api/admin/overview') {
      return json({ success: true, overview: { total_cash_in: '5000.00', total_withdrawals: '1200.00', remaining_balance: '3800.00' } });
    }
    if (path === '/api/admin/devices') return json({ success: true, devices });
    if (path === '/api/admin/transactions') return json({ success: true, transactions });
    if (path.startsWith('/api/admin/devices/')) return json({ success: true, device: { device_id: 'x' } });
    if (path === '/api/admin/withdrawals') return json({ success: true, withdrawal: { transaction_id: 'WD-NEW999' } });
    return json({ success: false, error: 'not mocked' });
  };

  // The client defers its own init() to DOMContentLoaded while the document is
  // still parsing, so it must only be evaluated once the page has finished
  // loading - otherwise nothing would ever bind its event listeners.
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', () => resolve(null), { once: true }));
  }

  // The client ships as a same-origin script src so it satisfies the Helmet CSP;
  // evaluating it here reproduces exactly what the browser would run.
  window.eval(CLIENT);

  const $ = (id: string) => document.getElementById(id) as HTMLElement;
  const click = (id: string) => ($(id) as unknown as HTMLElement).click();
  const rows = (id: string) => Array.from(document.querySelectorAll(`#${id} tr`));

  return {
    window,
    document,
    calls,
    $,
    click,
    rows,
    /** Cell text for one row, column by column. */
    cells: (row: Element) => Array.from(row.querySelectorAll('td')).map((td) => td.textContent ?? ''),
    /** Enters the admin key and unlocks, then waits for the three API calls. */
    async unlock() {
      ($('key') as HTMLInputElement).value = 'unit-test-admin-key';
      click('unlock');
      await new Promise((resolve) => setTimeout(resolve, 40));
    },
    /** Opens the target-device listbox and picks the option for a device id. */
    selectTarget(deviceId: string) {
      click('target-button');
      const option = document.querySelector(`#target-menu [data-value="${deviceId}"]`) as HTMLElement;
      option.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    },
  };
}

describe('admin dashboard page', () => {
  it('serves a standalone console carrying no mobile dashboard markup', () => {
    expect(pageReply.headers['cache-control']).toBe('no-store');
    expect(PAGE).toContain('id="devices"');
    expect(PAGE).toContain('id="txns"');
    expect(PAGE).toContain('id="target-dropdown"');
    // These belong to the APK only; the console must never grow them.
    expect(PAGE).not.toContain('listening-orb');
    expect(PAGE).not.toContain('id="onboarding"');
  });

  it('ships its client as a same-origin script so the CSP is satisfied', () => {
    expect(scriptReply.contentType).toContain('application/javascript');
    expect(CLIENT).toContain('renderTransactions');
  });
});

describe('admin dashboard device fleet', () => {
  it('lists every device with its channel, SIM, battery, network and state', async () => {
    const ui = await boot();
    await ui.unlock();

    const fleet = ui.rows('devices');
    expect(fleet).toHaveLength(3);
    // Column order is the operator's scan order: state first, then the phone.
    expect(ui.$('devices').closest('table')?.querySelectorAll('th')).toHaveLength(7);

    const online = ui.cells(fleet[0]!);
    expect(online[0]).toContain('Online');
    expect(online[1]).toContain('dev-online-1');
    expect(online[1]).toContain('Tecno Spark 8');
    expect(online[2]).toContain('Telebirr');
    expect(online[2]).toContain('SIM 1');
    expect(online[2]).toContain('Ethio Telecom');
    expect(online[3]).toContain('82%');
    expect(online[4]).toContain('4G');

    // An offline phone is still listed, just flagged: it can still claim work.
    const offline = ui.cells(fleet[1]!);
    expect(offline[0]).toContain('Offline');
    expect(offline[2]).toContain('CBE');
    expect(offline[2]).toContain('SIM 2');
    expect(offline[4]).toContain('2G');

    // Blocked outranks online, so nobody reads a blocked phone as ready to work.
    expect(ui.cells(fleet[2]!)[0]).toContain('Blocked');
  }, DOM_TIMEOUT);

  it('tiers the battery and copes with a device that reports no telemetry', async () => {
    const ui = await boot({
      devices: [
        { ...HEALTHY, device_id: 'weak', battery_level: 28 },
        { ...HEALTHY, device_id: 'flat', battery_level: 8 },
        { ...HEALTHY, device_id: 'healthy', battery_level: 95 },
        FLEET[2]!,
      ],
    });
    await ui.unlock();
    const rows = ui.rows('devices');

    expect(rows[0]!.querySelector('.battery')?.className).toContain('low');
    expect(rows[1]!.querySelector('.battery')?.className).toContain('critical');
    // A healthy phone carries no warning class at all.
    expect(rows[2]!.querySelector('.battery')?.className).toBe('battery');
    // The blocked device never sent battery or network, so both degrade to
    // placeholders rather than rendering "null" or a misleading zero.
    expect(rows[3]!.querySelector('.battery-value')?.textContent).toBe('—');
    expect(rows[3]!.querySelector('.net')?.textContent).toBe('No data');
  }, DOM_TIMEOUT);

  it('summarises how much of the fleet is online', async () => {
    const ui = await boot();
    await ui.unlock();
    expect(ui.$('device-count').textContent).toBe('2 online / 3 devices');
  }, DOM_TIMEOUT);

  it('shows an empty state when no device has ever polled', async () => {
    const ui = await boot({ devices: [] });
    await ui.unlock();
    expect(ui.$('device-count').textContent).toBe('0 online / 0 devices');
    expect(ui.rows('devices')[0]?.textContent).toContain('No devices have polled');
  }, DOM_TIMEOUT);
});


describe('admin dashboard payout dispatcher', () => {
  it('offers every device in the target dropdown and disables the blocked one', async () => {
    const ui = await boot();
    await ui.unlock();
    const options = Array.from(ui.document.querySelectorAll('#target-menu [role="option"]'));
    expect(options.map((option) => option.getAttribute('data-value'))).toEqual([
      'ANY',
      'dev-online-1',
      'dev-offline-2',
      'dev-blocked-3',
    ]);
    // Auto-assign is always offered, and is the default selection.
    expect(ui.$('target-value').textContent).toBe('Any available device');
    expect(ui.$('target-badge').textContent).toBe('Auto');
    // A blocked device stays visible (so it can be identified) but cannot be picked.
    const blocked = ui.document.querySelector('#target-menu [data-value="dev-blocked-3"]');
    expect(blocked?.getAttribute('aria-disabled')).toBe('true');
  }, DOM_TIMEOUT);

  it('sends the selected device id when a payout is dispatched', async () => {
    const ui = await boot();
    await ui.unlock();
    ui.selectTarget('dev-online-1');

    expect(ui.$('target-value').textContent).toBe('Tecno Spark 8');
    expect(ui.$('target-badge').textContent).toBe('Pinned');
    // The note repeats the id, which is exactly what the receiving phone matches on.
    expect(ui.$('target-note').textContent).toBe('Will run on dev-online-1');

    (ui.$('phone') as HTMLInputElement).value = '0911111111';
    (ui.$('amount') as HTMLInputElement).value = '250';
    (ui.$('withdrawal-form') as unknown as HTMLFormElement).dispatchEvent(
      new ui.window.Event('submit', { bubbles: true, cancelable: true })
    );
    await new Promise((resolve) => setTimeout(resolve, 40));

    const dispatch = ui.calls.find((call) => call.path === '/api/admin/withdrawals');
    expect(dispatch?.method).toBe('POST');
    expect(dispatch?.body).toMatchObject({
      destinationPhone: '0911111111',
      amount: 250,
      targetDeviceId: 'dev-online-1',
    });
  }, DOM_TIMEOUT);

  it('falls back to auto-assignment for the ANY sentinel', async () => {
    const ui = await boot();
    await ui.unlock();
    ui.selectTarget('dev-online-1');
    ui.selectTarget('ANY');
    expect(ui.$('target-value').textContent).toBe('Any available device');
    expect(ui.$('target-badge').textContent).toBe('Auto');
  }, DOM_TIMEOUT);
});

describe('admin dashboard transaction history', () => {
  it('renders a centralized row per payout with device, amount, channel and status', async () => {
    const ui = await boot();
    await ui.unlock();
    expect(ui.$('txn-count').textContent).toBe('3 payouts');

    const settled = ui.cells(ui.rows('txns')[0]!);
    expect(settled[0]).toContain('WD-AAA111');
    expect(settled[1]).toContain('Tecno Spark 8');
    expect(settled[1]).toContain('dev-online-1');
    expect(settled[2]).toContain('0911234567');
    expect(settled[3]).toContain('1,250.00');
    expect(settled[3]).toContain('ETB');
    expect(settled[4]).toContain('Telebirr');
    expect(settled[5]).toContain('COMPLETED');

    // Newest first, so the most recent work sits at the top.
    expect(ui.cells(ui.rows('txns')[1]!)[0]).toContain('WD-BBB222');
    expect(ui.cells(ui.rows('txns')[1]!)[5]).toContain('FAILED');
  }, DOM_TIMEOUT);

  it('labels an auto-assigned payout as unassigned instead of guessing a phone', async () => {
    const ui = await boot();
    await ui.unlock();
    const pending = ui.rows('txns')[2]!;
    expect(ui.cells(pending)[5]).toContain('PENDING');
    expect(pending.textContent).toContain('Unassigned');
    // It must not be attributed to a device that merely happens to be online.
    expect(pending.textContent).not.toContain('dev-online-1');
  }, DOM_TIMEOUT);

  it('shows an empty state when nothing has been dispatched', async () => {
    const ui = await boot({ transactions: [] });
    await ui.unlock();
    expect(ui.$('txn-count').textContent).toBe('No payouts yet');
    expect(ui.rows('txns')[0]?.textContent).toContain('No payouts have been dispatched');
  }, DOM_TIMEOUT);
});

describe('admin dashboard target device validation', () => {
  it('accepts a concrete device id, ANY and an omitted target', () => {
    const base = { destinationPhone: '0911234567', amount: 10 };
    expect(manualWithdrawalSchema.safeParse({ ...base, channel: 'TELEBIRR', targetDeviceId: 'dev-1' }).success).toBe(true);
    expect(manualWithdrawalSchema.safeParse({ ...base, channel: 'CBE', targetDeviceId: 'ANY' }).success).toBe(true);
    expect(manualWithdrawalSchema.safeParse({ ...base, channel: 'TELEBIRR' }).success).toBe(true);
    // "ANY" is a target sentinel, not a payment channel: it must not be accepted here.
    expect(manualWithdrawalSchema.safeParse({ ...base, channel: 'ANY' }).success).toBe(false);
  });
});



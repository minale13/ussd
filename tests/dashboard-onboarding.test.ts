import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import type { DOMWindow } from 'jsdom';

const HTML = readFileSync('android/app/src/main/assets/dashboard.html', 'utf8');

type Call = { method: string; args: unknown[] };

/**
 * Boots assets/dashboard.html in jsdom with a fake AndroidGateway bridge, the
 * same shape the WebView injects. This drives the real page script: channel
 * selection, the branded form, validation, and the credential hand-off to the
 * bridge plus the localStorage mirror.
 */
function boot(options: { credentials?: Record<string, unknown> | null } = {}) {
  const credentials = options.credentials === undefined ? {} : options.credentials;
  const calls: Call[] = [];
  let state: Record<string, unknown> = {
    running: false,
    channel: 'TELEBIRR',
    simSlot: 0,
    accessibility: true,
    callPermission: true,
    simPermission: true,
    sims: [{ slot: 0, label: 'SIM 1', carrier: 'Ethio Telecom', ready: true }],
    logs: [],
    credentials,
  };

  const dom = new JSDOM(HTML, {
    runScripts: 'dangerously',
    url: 'https://localhost/dashboard.html',
    beforeParse(window: DOMWindow) {
      const record =
        (method: string) =>
        (...args: unknown[]) => {
          calls.push({ method, args });
          if (method === 'setCredentials') {
            const [channel, phone, pin] = args as [string, string, string];
            state = { ...state, channel, credentials: { channel, phone, pin, savedAt: 1 } };
          }
          if (method === 'setChannel') state = { ...state, channel: args[0] };
          return JSON.stringify(state);
        };
      (window as unknown as Record<string, unknown>).AndroidGateway = {
        getState: () => JSON.stringify(state),
        setChannel: record('setChannel'),
        setCredentials: record('setCredentials'),
        clearCredentials: record('clearCredentials'),
        setSim: record('setSim'),
        startGateway: record('startGateway'),
        stopGateway: record('stopGateway'),
        openAccessibilitySettings: record('openAccessibilitySettings'),
        openAppSettings: record('openAppSettings'),
      };
    },
  });

  const { window } = dom;
  const document = window.document;
  return {
    window,
    document,
    calls,
    $: (id: string) => document.getElementById(id) as HTMLElement,
    tile: (channel: string) =>
      document.querySelector(`[data-channel-pick="${channel}"]`) as HTMLButtonElement,
    input: (id: string) => document.getElementById(id) as HTMLInputElement,
    // The onboarding overlay is driven by its own `onboarding-open` class (its
    // CSS sets display:none by default); everything else uses `hidden`.
    visible: (id: string) => {
      const el = document.getElementById(id) as HTMLElement;
      if (id === 'onboarding') return el.classList.contains('onboarding-open');
      return !el.classList.contains('hidden');
    },
  };
}

type Ui = ReturnType<typeof boot>;

/** Walks the picker -> form -> submit path for one login attempt. */
function submit(ui: Ui, channel: string, phone: string, pin: string) {
  ui.tile(channel).click();
  ui.input('login-phone').value = phone;
  ui.input('login-pin').value = pin;
  ui.$('login-form').dispatchEvent(new ui.window.Event('submit', { bubbles: true, cancelable: true }));
}

describe('onboarding channel selection', () => {
  it('starts on the picker with both channel buttons and no form visible', () => {
    const ui = boot();
    expect(ui.visible('onboarding')).toBe(true);
    expect(ui.visible('onboard-pick')).toBe(true);
    expect(ui.visible('onboard-login')).toBe(false);
    expect(ui.tile('TELEBIRR')).toBeTruthy();
    expect(ui.tile('CBE')).toBeTruthy();
  });

describe('branded login form', () => {
  it('renders a Telebirr-branded form after picking Telebirr', () => {
    const ui = boot();
    ui.tile('TELEBIRR').click();
    expect(ui.visible('onboard-login')).toBe(true);
    expect(ui.visible('onboard-pick')).toBe(false);
    expect(ui.$('login-title').textContent).toBe('Log in to Telebirr');
    expect(ui.$('login-pin-label').textContent).toBe('PIN');
    expect(ui.$('onboarding').style.getPropertyValue('--brand')).toBe('#0172bb');
    expect(ui.$('login-logo').innerHTML).toContain('Telebirr logo');
  });

  it('renders a CBE-branded form after picking CBE Birr', () => {
    const ui = boot();
    ui.tile('CBE').click();
    expect(ui.$('login-title').textContent).toBe('Log in to CBE Birr');
    expect(ui.$('login-pin-label').textContent).toBe('PIN / password');
    expect(ui.$('onboarding').style.getPropertyValue('--brand')).toBe('#007C4A');
    expect(ui.$('login-logo').innerHTML).toContain('CBE Birr logo');
  });

  it('returns to the picker from the back button', () => {
    const ui = boot();
    ui.tile('CBE').click();
    ui.$('onboard-back').click();
    expect(ui.visible('onboard-pick')).toBe(true);
    expect(ui.visible('onboard-login')).toBe(false);
  });

  it('shows a +251 prefix and masks the PIN until toggled', () => {
    const ui = boot();
    ui.tile('TELEBIRR').click();
    expect(ui.$('login-form').textContent).toContain('+251');
    expect(ui.input('login-pin').type).toBe('password');
    ui.$('login-pin-toggle').click();
    expect(ui.input('login-pin').type).toBe('text');
    expect(ui.$('login-pin-toggle').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('credential validation', () => {
  it('rejects a short PIN and does not call the bridge', () => {
    const ui = boot();
    submit(ui, 'TELEBIRR', '0911234567', '12');
    expect(ui.calls.some((c) => c.method === 'setCredentials')).toBe(false);
    expect(ui.visible('login-pin-error')).toBe(true);
    expect(ui.visible('onboarding')).toBe(true);
  });

  it('rejects a malformed phone number', () => {
    const ui = boot();
    submit(ui, 'CBE', '12345', '1234');
    expect(ui.calls.some((c) => c.method === 'setCredentials')).toBe(false);
    expect(ui.visible('login-phone-error')).toBe(true);
  });

  it('accepts +251, 251 and bare 9-prefixed numbers', () => {
    for (const typed of ['+251911234567', '251911234567', '911234567', '0911234567']) {
      const ui = boot();
      submit(ui, 'TELEBIRR', typed, '1234');
      const call = ui.calls.find((c) => c.method === 'setCredentials');
      expect(call, `expected ${typed} to be accepted`).toBeTruthy();
      expect(call?.args[1]).toBe('0911234567');
    }
  });

  it('strips non-digits typed into the phone field', () => {
    const ui = boot();
    ui.tile('TELEBIRR').click();
    const phone = ui.input('login-phone');
    phone.value = '0911-234 567';
    phone.dispatchEvent(new ui.window.Event('input', { bubbles: true }));
    expect(phone.value).toBe('0911234567');
  });

  it('rejects landline and short numbers, and accepts Ethio Telecom 07 numbers', () => {
    for (const bad of ['0111234567', '091123456', '09112345678', '', 'abc']) {
      const ui = boot();
      submit(ui, 'TELEBIRR', bad, '1234');
      expect(ui.calls.some((c) => c.method === 'setCredentials'), `expected ${bad} to be rejected`).toBe(false);
    }
    const ui = boot();
    submit(ui, 'CBE', '0712345678', '1234');
    expect(ui.calls.find((c) => c.method === 'setCredentials')?.args[1]).toBe('0712345678');
  });
});

describe('JS / Kotlin phone normalisation parity', () => {
  // Credentials.normalizePhone() in Kotlin applies the same rules. The page
  // normalises for instant feedback, but the native side is what actually
  // stores the value, so the two implementations must not drift apart.
  const KOTLIN = readFileSync(
    'android/app/src/main/java/com/example/ussdgateway/Credentials.kt',
    'utf8',
  );

  it('the Kotlin normaliser still implements every rule the page relies on', () => {
    expect(KOTLIN).toContain('startsWith("251")');
    expect(KOTLIN).toContain('digits.length == 9 && digits.startsWith("9")');
    expect(KOTLIN).toContain('digits.length != 10');
    expect(KOTLIN).toContain("digits[1] != '9' && digits[1] != '7'");
  });

  it('agrees with the page on the accepted and rejected shapes', () => {
    const shared: [string, string][] = [
      ['0911234567', '0911234567'],
      ['+251911234567', '0911234567'],
      ['251911234567', '0911234567'],
      ['911234567', '0911234567'],
      ['0712345678', '0712345678'],
      ['+251 911 234 567', '0911234567'],
      ['0111234567', ''],
      ['091123456', ''],
      ['1234567890', ''],
    ];
    for (const [typed, expected] of shared) {
      const ui = boot();
      ui.tile('TELEBIRR').click();
      ui.input('login-phone').value = typed.replace(/\D/g, '');
      ui.input('login-pin').value = '1234';
      ui.$('login-form').dispatchEvent(
        new ui.window.Event('submit', { bubbles: true, cancelable: true }),
      );
      const call = ui.calls.find((c) => c.method === 'setCredentials');
      expect(call?.args[1] ?? '', `normalising ${typed}`).toBe(expected);
    }
  });
});

describe('local storage sync', () => {
  function login(channel: string, phone: string, pin: string) {
    const ui = boot();
    submit(ui, channel, phone, pin);
    return ui;
  }

  it('persists channel, phone and PIN through the bridge', () => {
    const ui = login('CBE', '0911234567', '4821');
    const call = ui.calls.find((c) => c.method === 'setCredentials');
    expect(call?.args).toEqual(['CBE', '0911234567', '4821']);
  });

  it('mirrors channel and phone to localStorage but never the PIN', () => {
    const ui = login('TELEBIRR', '0911234567', '4821');
    const raw = ui.window.localStorage.getItem('ussd.credentials');
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw as string);
    expect(stored.channel).toBe('TELEBIRR');
    expect(stored.phone).toBe('0911234567');
    expect(raw).not.toContain('4821');
    expect(stored.pin).toBeUndefined();
  });

  it('closes the overlay and reveals the dashboard once saved', async () => {
    const ui = login('TELEBIRR', '0911234567', '4821');
    // The close is deferred so the confirmation is visible first.
    await new Promise((resolve) => ui.window.setTimeout(resolve, 600));
    expect(ui.visible('onboarding')).toBe(false);
    expect(ui.visible('dashboard-content')).toBe(true);
  });
});


  it('shows each channel name and ships an official logo for it', () => {
    const ui = boot();
    expect(ui.tile('TELEBIRR').textContent).toContain('Telebirr');
    expect(ui.tile('CBE').textContent).toContain('CBE Birr');
    expect(ui.tile('TELEBIRR').innerHTML).toContain('#0172bb');
    expect(ui.tile('CBE').innerHTML).toContain('#007C4A');
  });

  it('does not gate the dashboard when a login is already saved', () => {
    const ui = boot({ credentials: { channel: 'TELEBIRR', phone: '0911234567', savedAt: 1 } });
    expect(ui.visible('onboarding')).toBe(false);
    expect(ui.$('hero-credentials-value').textContent).toContain('0911234567');
  });
});

#!/usr/bin/env node
/**
 * Regression check: the boot/login overlays must never cover the dashboard.
 *
 * Boots the real page and the real client in jsdom, then asserts that
 *  1. the splash actually releases (body loses `is-booting`),
 *  2. the stylesheet hides the splash and the login overlay once the operator is
 *     signed in, so the app underneath is visible and clickable,
 *  3. neither overlay keeps `position:fixed` + a high z-index over the app
 *     while unlocked.
 *
 * Run: node scripts/check-admin-overlay.cjs [baseUrl]
 */
const { JSDOM } = require('jsdom');
const path = require('node:path');

// The console signs in against whatever the server under test is configured
// with, so the key comes from the environment. It is read rather than written
// here on purpose: this script is committed, and a literal would publish the
// real admin password.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const base = process.argv[2] || 'http://127.0.0.1:3000';
const adminKey = process.env.ADMIN_API_KEY;
if (!adminKey) {
  console.error('ADMIN_API_KEY is not set. Add it to .env (or export it) and re-run.');
  process.exit(1);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -> ' + detail : ''}`);
};

(async () => {
  const page = await (await fetch(`${base}/admin`)).text();
  const script = await (await fetch(`${base}/admin/app.js`)).text();

  const dom = new JSDOM(page, { runScripts: 'outside-only', url: 'https://localhost/admin' });
  const { window } = dom;
  const document = window.document;

  const json = (body) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
  window.fetch = (path) => {
    if (path === '/health') return json({ status: 'ok' });
    if (path === '/api/admin/overview') return json({ success: true, overview: { total_cash_in: '1.00', total_withdrawals: '0.00', remaining_balance: '1.00' } });
    if (path === '/api/admin/devices') return json({ success: true, devices: [] });
    if (path.startsWith('/api/admin/transactions')) return json({ success: true, transactions: [] });
    if (path.startsWith('/api/admin/sms')) return json({ success: true, events: [] });
    return json({ success: false });
  };

  if (document.readyState === 'loading') {
    await new Promise((r) => document.addEventListener('DOMContentLoaded', r, { once: true }));
  }
  window.eval(script);

  // The splash holds for a minimum display time; wait past it.
  await sleep(1500);

  check('the splash releases after boot', !document.body.classList.contains('is-booting'), document.body.className);

  // Sign in the way an operator does.
  document.getElementById('key').value = adminKey;
  document.getElementById('login-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(200);

  check('signing in unlocks the app', document.body.classList.contains('unlocked') && !document.body.classList.contains('is-locked'), document.body.className);

  // jsdom does not do layout, so read the cascade from the stylesheet itself:
  // if no rule hides an overlay for the unlocked state, it would still cover the
  // app in a real browser. The two selectors are grouped, so the rule body is
  // matched from the selector list rather than from one selector alone.
  const css = document.querySelector('style').textContent;
  const unlockedRule = /body\.unlocked[^{}]*\{([^}]*)\}/.exec(css);
  const unlockedBody = unlockedRule ? unlockedRule[1] : '';
  const unlockedSelectors = unlockedRule ? unlockedRule[0].split('{')[0] : '';
  check('the stylesheet hides the overlays once unlocked', /display\s*:\s*none/.test(unlockedBody), unlockedRule ? unlockedRule[0].trim() : 'no body.unlocked rule');
  check('the splash is one of the overlays hidden once unlocked', /\.splash/.test(unlockedSelectors), unlockedSelectors.trim());
  check('the login is one of the overlays hidden once unlocked', /\.login/.test(unlockedSelectors), unlockedSelectors.trim());
  check('the splash is a fixed overlay (so it must be hidden explicitly)', /\.splash\s*\{[^}]*position\s*:\s*fixed/.test(css));
  check('the login is a fixed overlay (so it must be hidden explicitly)', /\.login\s*\{[^}]*position\s*:\s*fixed/.test(css));

  // The overlays must also be out of the accessibility tree and unfocusable, so
  // a keyboard user cannot tab into a card that is no longer visible.
  const splash = document.getElementById('splash');
  const login = document.getElementById('login');
  check('the splash is marked hidden from assistive tech', splash.getAttribute('aria-hidden') === 'true', splash.outerHTML.slice(0, 80));
  check('the login overlay is marked hidden from assistive tech', login.getAttribute('aria-hidden') === 'true', login.outerHTML.slice(0, 80));

  // The boot sequence must not depend on an implicitly-created global: the
  // client is strict mode, so an undeclared assignment throws in a browser
  // (jsdom is sloppy about it) and would strand the splash overlay. Assert the
  // declaration exists, and that boot releases rather than leaking the timer to
  // the global object.
  check('the client declares bootTimer rather than leaking it to the global scope', /var\s+bootTimer\s*=/.test(script));
  check('the boot release is unconditional, so a failure cannot strand the splash', /Promise\.all\(\[health, release\]\)\.then\(done, done\)/.test(script));

  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} overlay checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error('overlay check crashed:', error);
  process.exit(1);
});

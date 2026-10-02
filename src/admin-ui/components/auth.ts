import { icon } from '../icons.js';

/** Escapes a value so it is safe inside a double-quoted HTML attribute. */
function escapeAttribute(value: string): string {
  return String(value).replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char,
  );
}

/**
 * Splash / loader.
 *
 * Covers the viewport only while the client checks the gateway, then it is
 * removed from the box entirely (see the `.splash` rules, keyed off
 * `body.is-booting` and `body.unlocked`, plus `aria-hidden` on this element).
 * The status pill is driven by the client so it reports a real connection result
 * rather than animating forever.
 */
export function SplashScreen() {
  return `
<div class="splash" id="splash" role="status" aria-live="polite" aria-hidden="true">
  <div class="splash-mark" aria-hidden="true">${icon('logo', 44)}</div>
  <div>
    <div class="splash-name">USSD Gateway</div>
    <div class="splash-tag">Auto-Withdrawal</div>
  </div>
  <div class="splash-status" id="splash-status">
    <span class="dot"></span>
    <span id="splash-status-text">Connecting to gateway</span>
  </div>
</div>`;
}

/**
 * Login screen.
 *
 * This is the security boundary for the console. The password field holds the
 * admin API key; it is never copied into localStorage, sessionStorage, a cookie
 * or the URL, so closing the tab discards it. The client sends the username and
 * key as the `x-admin-username` and `x-admin-key` headers on every admin call.
 *
 * The card is a fixed, full-viewport layer above the app, so the client sets
 * `aria-hidden` on it as soon as sign-in succeeds and the stylesheet drops it
 * from the box - an overlay left merely faded would keep covering the dashboard.
 *
 * @param adminUsername the configured `ADMIN_USERNAME`, prefilled so an operator
 *        only has to type the password.
 */
export function LoginScreen(adminUsername = 'admin') {
  const username = escapeAttribute(adminUsername);
  return `
<div class="login" id="login" aria-hidden="true">
  <div class="login-mark" aria-hidden="true">${icon('logo', 30)}</div>
  <div class="login-head">
    <h1 class="login-title">Welcome back</h1>
    <p class="login-sub">Sign in with your administrator credentials to monitor the USSD gateway.</p>
  </div>
  <form class="login-form" id="login-form" novalidate>
    <div class="field-group" data-field="username">
      <label class="field-label" for="username">Admin username</label>
      <div class="input-wrap has-icon">
        <span class="input-icon">${icon('user', 17)}</span>
        <input id="username" name="username" type="text" value="${username}" autocomplete="username" spellcheck="false" placeholder="${username}">
      </div>
      <span class="field-error">${icon('info', 13)}<span>Enter your administrator username.</span></span>
    </div>
    <div class="field-group" data-field="password">
      <label class="field-label" for="password">Password</label>
      <div class="input-wrap has-icon" id="key-field">
        <span class="input-icon">${icon('lock', 17)}</span>
        <input id="key" name="password" type="password" placeholder="Enter admin API key" autocomplete="current-password" spellcheck="false" aria-label="Admin password">
        <button class="icon-btn" id="key-toggle" type="button" aria-label="Show password" title="Show password" style="position:absolute;right:5px">${icon('eye', 17, 'eye-open')}${icon('eyeOff', 17, 'eye-closed')}</button>
      </div>
      <span class="field-error">${icon('info', 13)}<span>Enter your admin password.</span></span>
    </div>
    <div class="form-feedback" id="login-feedback" role="status" aria-live="polite"></div>
    <button class="btn btn-primary btn-block" id="unlock" type="submit">Sign In ${icon('arrowRight', 18)}</button>
  </form>
  <p class="login-foot">Protected by the admin API key. The key is held in this form only and is sent as a request header &mdash; never stored on the device.</p>
</div>`;
}
import { icon } from '../icons.js';

/**
 * Operator access gate.
 *
 * This is the security boundary for the console: the key is typed here, held in
 * the input element only, and sent as the x-admin-key header on every API call.
 * It is never written to localStorage or sessionStorage, so closing the tab
 * discards it.
 */
export function UnlockGate() {
  return `
<section class="card gate" id="access" aria-label="Operator access">
  <div class="gate-copy">
    <div class="gate-icon">${icon('lock', 21)}</div>
    <div>
      <h2 class="gate-title">Console locked</h2>
      <p class="gate-sub">Authorise with the admin key to stream live settlement data and device controls.</p>
    </div>
  </div>
  <div class="gate-row">
    <div class="key-field" id="key-field">
      ${icon('key', 16, 'key-icon')}
      <input id="key" type="password" placeholder="Enter admin API key" autocomplete="off" spellcheck="false" aria-label="Admin API key">
      <button class="key-toggle" id="key-toggle" type="button" aria-label="Show admin key" title="Show admin key">${icon('eye', 16, 'eye-open')}${icon('eyeOff', 16, 'eye-closed')}</button>
    </div>
    <button class="btn btn-primary" id="unlock" type="button">Unlock console ${icon('unlock', 17)}</button>
  </div>
</section>`;
}
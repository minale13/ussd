import { icon } from '../icons.js';

/** Quick amount presets, in ETB. Values are operator shortcuts, not defaults. */
const QUICK_AMOUNTS = [100, 500, 1000, 2000];

/**
 * Direct withdrawal (send money).
 *
 * Posts to the existing POST /api/admin/withdrawals route, which applies every
 * server-side check (wallet existence, balance reservation, target-device
 * eligibility). The client-side validation is purely for fast feedback and never
 * replaces those checks.
 */
export function SendMoneyScreen() {
  return `
<section class="screen" id="view-send" aria-label="Send money" hidden>
  <article class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">Direct Withdrawal</h2>
        <p class="card-sub">Queue an outbound payout and choose which phone runs it.</p>
      </div>
      <span class="count-chip" id="send-target-count">Auto</span>
    </div>
    <form class="form" id="withdrawal-form" novalidate>
      <div class="field-group" data-field="phone">
        <label class="field-label" for="phone">Phone number</label>
        <div class="input-wrap has-icon">
          <span class="input-icon">${icon('phone', 17)}</span>
          <input id="phone" type="tel" inputmode="tel" placeholder="+251 91 234 5678" autocomplete="off" spellcheck="false" aria-describedby="phone-error">
        </div>
        <span class="field-error" id="phone-error">${icon('info', 13)}<span>Enter a valid phone number.</span></span>
      </div>

      <div class="field-group">
        <label class="field-label" for="amount">Amount</label>
        <div class="input-wrap has-icon">
          <span class="input-icon">${icon('banknote', 17)}</span>
          <input id="amount" type="text" inputmode="decimal" placeholder="0.00" autocomplete="off" aria-describedby="amount-error">
          <span class="suffix">ETB</span>
        </div>
        <span class="field-error" id="amount-error">${icon('info', 13)}<span>Enter an amount above zero.</span></span>
        <div class="chips" id="amount-chips" role="group" aria-label="Quick amounts">
          ${QUICK_AMOUNTS.map(
            (value) => `<button class="chip" type="button" data-amount="${value}">${value.toLocaleString('en-US')}</button>`
          ).join('\n          ')}
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" id="channel-label">Channel</label>
        <div class="dropdown" id="channel-dropdown">
          <button class="select" id="channel-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="channel-label">
            <span class="select-value"><span class="channel-dot telebirr" id="channel-dot"></span><span id="channel-value">Telebirr</span></span>
            <span class="chevron">${icon('chevronDown', 17)}</span>
          </button>
          <ul class="select-menu" id="channel-menu" role="listbox" aria-labelledby="channel-label">
            <li class="option selected" role="option" tabindex="0" data-value="TELEBIRR" aria-selected="true">
              <span class="channel-dot telebirr"></span>
              <span class="option-copy"><strong>Telebirr</strong><small>Ethio Telecom mobile money</small></span>
              <span class="check">${icon('check', 15)}</span>
            </li>
            <li class="option" role="option" tabindex="0" data-value="CBE" aria-selected="false">
              <span class="channel-dot cbe"></span>
              <span class="option-copy"><strong>CBE</strong><small>Commercial Bank of Ethiopia</small></span>
              <span class="check">${icon('check', 15)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="field-group">
        <div class="field-label">
          <span id="target-label">Target device</span>
          <span class="field-note" id="target-note">Awaiting device data</span>
        </div>
        <div class="dropdown" id="target-dropdown">
          <button class="select" id="target-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="target-label">
            <span class="select-value"><span class="channel-dot auto" id="target-dot"></span><span id="target-value">Any available device</span></span>
            <span class="mini-badge auto" id="target-badge">Auto</span>
            <span class="chevron">${icon('chevronDown', 17)}</span>
          </button>
          <ul class="select-menu" id="target-menu" role="listbox" aria-labelledby="target-label">
            <li class="option selected" role="option" tabindex="0" data-value="ANY" aria-selected="true">
              <span class="channel-dot auto"></span>
              <span class="option-copy"><strong>Any Available Device</strong><small>Auto-assign &#183; the first device to poll claims it</small></span>
              <span class="mini-badge auto">Auto</span>
              <span class="check">${icon('check', 15)}</span>
            </li>
          </ul>
        </div>
      </div>

      <div class="field-group">
        <label class="field-label" for="notes">Notes <span class="optional">optional</span></label>
        <textarea id="notes" maxlength="512" rows="2" placeholder="Internal reference, batch id or operator note..."></textarea>
      </div>

      <div class="form-feedback" id="form-feedback" role="status" aria-live="polite"></div>
      <button class="btn btn-primary btn-block" id="submit-withdrawal" type="submit">Send Withdrawal ${icon('send', 18)}</button>
      <p class="form-hint">${icon('info', 14)}<span>Creates a <strong>PENDING</strong> withdrawal and reserves the amount from the gateway wallet. A targeted payout is claimable only by the selected device; <strong>Any</strong> is first-come, first-served.</span></p>
    </form>
  </article>
</section>`;
}
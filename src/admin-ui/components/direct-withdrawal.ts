import { icon } from '../icons.js';

/**
 * Direct withdrawal dispatcher.
 *
 * Posts to the existing POST /api/admin/withdrawals route, which applies every
 * server-side check (wallet existence, balance reservation, target device
 * eligibility). The client-side validation below is purely for fast feedback and
 * never replaces those checks.
 */
export function DirectWithdrawalCard() {
  return `
<article class="card is-interactive panel-withdrawal" id="withdrawal">
  <div class="card-head">
    <div class="panel-heading">
      <h2 class="card-title">Direct Withdrawal</h2>
      <p class="card-sub">Queue an outbound payout and route it to a specific gateway device.</p>
    </div>
    <div class="stat-icon" style="color:var(--primary);background:rgba(0,229,195,.10);box-shadow:inset 0 0 0 1px rgba(0,229,195,.22)">${icon('send', 19)}</div>
  </div>
  <form class="form" id="withdrawal-form" novalidate>
    <div class="field-group" data-field="phone">
      <label class="field-label" for="phone">Destination phone</label>
      <div class="input-wrap has-icon">
        <span class="input-icon">${icon('phone', 17)}</span>
        <input id="phone" type="text" inputmode="tel" placeholder="09XX XXX XXXX" autocomplete="off" spellcheck="false">
      </div>
      <span class="field-error" id="phone-error">${icon('info', 13)}<span>Enter a valid phone number.</span></span>
    </div>
    <div class="form-grid">
      <div class="field-group" data-field="amount">
        <label class="field-label" for="amount">Amount</label>
        <div class="input-wrap has-icon">
          <span class="input-icon">${icon('banknote', 17)}</span>
          <input id="amount" type="number" step="0.01" min="0.01" placeholder="0.00" autocomplete="off">
          <span class="suffix">ETB</span>
        </div>
        <span class="field-error" id="amount-error">${icon('info', 13)}<span>Enter an amount above zero.</span></span>
      </div>
      <div class="field-group">
        <label class="field-label" id="channel-label">Channel</label>
        <div class="dropdown" id="channel-dropdown">
          <button class="select" id="channel-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="channel-label">
            <span class="select-value"><span class="channel-dot telebirr" id="channel-dot"></span><span id="channel-value">Telebirr</span></span>
            <span class="chevron">${icon('chevronDown', 16)}</span>
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
      <div class="field-group span-2">
        <div class="field-label">
          <span id="target-label">Target device</span>
          <span class="field-note" id="target-note">Awaiting device data</span>
        </div>
        <div class="dropdown" id="target-dropdown">
          <button class="select" id="target-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="target-label">
            <span class="select-value"><span class="channel-dot auto" id="target-dot"></span><span id="target-value">Any available device</span></span>
            <span class="mini-badge auto" id="target-badge">Auto</span>
            <span class="chevron">${icon('chevronDown', 16)}</span>
          </button>
          <ul class="select-menu" id="target-menu" role="listbox" aria-labelledby="target-label">
            <li class="option selected" role="option" tabindex="0" data-value="ANY" aria-selected="true">
              <span class="channel-dot auto"></span>
              <span class="option-copy"><strong>Any Available Device</strong><small>Auto-assign &#183; the first device to poll claims it</small></span>
              <span class="option-badge auto">Auto</span>
              <span class="check">${icon('check', 15)}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="field-group span-2">
        <label class="field-label" for="notes">Notes <span class="optional">optional</span></label>
        <textarea id="notes" maxlength="512" rows="2" placeholder="Internal reference, batch id or operator note..."></textarea>
      </div>
    </div>
    <div class="form-feedback" id="form-feedback" role="status" aria-live="polite"></div>
    <div class="form-foot">
      <p class="form-hint">${icon('info', 14)}<span>Creates a <strong>PENDING</strong> withdrawal and reserves the amount from the gateway wallet. Targeted payouts are claimable only by the selected device, while <strong>Any</strong> is first-come, first-served.</span></p>
      <button class="btn btn-primary btn-block" id="submit-withdrawal" type="submit">Send Withdrawal ${icon('send', 17)}</button>
    </div>
  </form>
</article>`;
}
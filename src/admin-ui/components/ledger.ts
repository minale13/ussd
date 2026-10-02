import { icon } from '../icons.js';

/**
 * Transaction history.
 *
 * Filter tabs split the ledger by kind. "Cash-in" is not a payout, so it is fed
 * from the cash-in feed the client keeps in a separate store; the two lists can
 * therefore never be confused with one another.
 */
export function TransactionsScreen() {
  return `
<section class="screen" id="view-transactions" aria-label="Transactions" hidden>
  <div class="card" style="padding:14px 0 0">
    <div class="search" style="padding:0 16px 12px">
      ${icon('search', 17)}
      <input id="txn-search" type="search" placeholder="Search reference, phone or device" autocomplete="off" aria-label="Search transactions">
    </div>
    <div class="tabs" id="txn-tabs" role="tablist" aria-label="Filter transactions">
      <button class="tab is-active" type="button" role="tab" aria-selected="true" data-filter="all">All<span class="tab-count" id="tab-count-all">0</span></button>
      <button class="tab" type="button" role="tab" aria-selected="false" data-filter="cash-in">Cash-in<span class="tab-count" id="tab-count-cash-in">0</span></button>
      <button class="tab" type="button" role="tab" aria-selected="false" data-filter="withdrawal">Withdrawal<span class="tab-count" id="tab-count-withdrawal">0</span></button>
      <button class="tab" type="button" role="tab" aria-selected="false" data-filter="failed">Failed<span class="tab-count" id="tab-count-failed">0</span></button>
    </div>
  </div>

  <article class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title" id="txn-heading">All transactions</h2>
        <p class="card-sub">Every payout the gateway has dispatched, newest first.</p>
      </div>
      <span class="count-chip" id="txn-count">0 transactions</span>
    </div>
    <div class="list" id="txns">
      <div class="skel skel-card"></div>
      <div class="skel skel-card"></div>
      <div class="skel skel-card"></div>
    </div>
  </article>
</section>`;
}

/**
 * Device fleet.
 *
 * Total / Online / Offline counts, a search box, then one row per phone showing
 * its SIM, battery level and an Online/Offline pill. Rows are rendered
 * client-side from GET /api/admin/devices and push the device detail screen.
 */
export function DevicesScreen() {
  return `
<section class="screen" id="view-devices" aria-label="Devices" hidden>
  <div class="summary" id="fleet-stats" style="grid-template-columns:repeat(3,minmax(0,1fr))">
    <article class="tile">
      <span class="tile-icon" aria-hidden="true">${icon('devices', 17)}</span>
      <div>
        <div class="tile-label">Total</div>
        <div class="tile-value" id="stat-total">0</div>
      </div>
    </article>
    <article class="tile green">
      <span class="tile-icon" aria-hidden="true">${icon('signal', 17)}</span>
      <div>
        <div class="tile-label">Online</div>
        <div class="tile-value" id="stat-online">0</div>
      </div>
    </article>
    <article class="tile blue">
      <span class="tile-icon" aria-hidden="true">${icon('inbox', 17)}</span>
      <div>
        <div class="tile-label">Offline</div>
        <div class="tile-value" id="stat-offline">0</div>
      </div>
    </article>
  </div>

  <div class="card" style="padding:14px 0 0">
    <div class="search" style="padding:0 16px 12px">
      ${icon('search', 17)}
      <input id="device-search" type="search" placeholder="Search device id, model or carrier" autocomplete="off" aria-label="Search devices">
    </div>
  </div>

  <article class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">Device Fleet</h2>
        <p class="card-sub">Every phone running the gateway app.</p>
      </div>
      <span class="count-chip" id="device-count">0 devices</span>
    </div>
    <div class="list" id="devices">
      <div class="skel skel-card"></div>
      <div class="skel skel-card"></div>
      <div class="skel skel-card"></div>
    </div>
  </article>
</section>`;
}

/**
 * Device details.
 *
 * One phone at a time: identity, live telemetry (battery, network, SIM channel,
 * last seen, IP) and the two actions that matter - block/release and restart.
 * The values are placeholders; the client fills them from the fleet row the
 * operator tapped.
 */
export function DeviceDetailScreen() {
  return `
<section class="screen" id="view-device" aria-label="Device details" hidden>
  <article class="card">
    <div class="detail-hero">
      <div class="detail-avatar" aria-hidden="true">${icon('devices', 26)}</div>
      <div style="min-width:0">
        <div class="detail-name" id="detail-name">Unknown device</div>
        <div class="detail-id" id="detail-id">—</div>
        <div class="detail-state">
          <span class="pill offline" id="detail-pill"><span class="dot"></span>Unknown</span>
          <span class="net down" id="detail-network">No data</span>
        </div>
      </div>
    </div>
    <div class="rows">
      <div class="row">
        <span class="row-label">${icon('battery', 16)}<span>Battery</span></span>
        <div class="battery big" id="detail-battery"><div class="battery-track"><div class="battery-fill" style="width:0%"></div></div><span class="battery-value">—</span></div>
      </div>
      <div class="row">
        <span class="row-label">${icon('wifi', 16)}<span>Network type</span></span>
        <span class="row-value is-muted" id="detail-network-type">—</span>
      </div>
      <div class="row">
        <span class="row-label">${icon('sim', 16)}<span>SIM channel</span></span>
        <span class="row-value" id="detail-sim">—</span>
      </div>
      <div class="row">
        <span class="row-label">${icon('clock', 16)}<span>Last seen</span></span>
        <span class="row-value" id="detail-last-seen">—</span>
      </div>
      <div class="row">
        <span class="row-label">${icon('signal', 16)}<span>IP address</span></span>
        <span class="row-value is-muted" id="detail-ip">Not reported</span>
      </div>
      <div class="row">
        <span class="row-label">${icon('monitor', 16)}<span>App version</span></span>
        <span class="row-value is-muted" id="detail-version">—</span>
      </div>
    </div>
  </article>

  <article class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">Device controls</h2>
        <p class="card-sub">Block the phone from claiming payouts, or ask it to re-arm.</p>
      </div>
    </div>
    <div class="form" style="padding-top:0">
      <button class="btn btn-block" id="restart-device" type="button">${icon('power', 18)}<span>Restart Device</span></button>
      <button class="btn btn-block" id="toggle-device" type="button">${icon('block', 18)}<span>Block device</span></button>
    </div>
  </article>
</section>`;
}

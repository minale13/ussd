import { icon } from '../icons.js';

/**
 * Device fleet.
 *
 * The column set and order are the operator's scan order and are relied on by
 * the admin dashboard test suite: state, device, channel/SIM, battery, network,
 * last seen, action. Rows are rendered client-side from GET /api/admin/devices.
 */
export function DeviceFleetCard() {
  return `
<article class="card is-interactive panel-devices" id="devices-panel">
  <div class="card-head">
    <div>
      <h2 class="card-title">Device Fleet</h2>
      <p class="card-sub">Every phone running the app, with its channel, battery and network.</p>
    </div>
    <span class="count-chip" id="device-count">0 devices</span>
  </div>
  <div class="qa-list" id="fleet-stats" style="padding-bottom:14px">
    <div class="fleet-stat-row">
      <div class="fleet-stat"><span class="fs-label">Total Devices</span><span class="fs-value" id="stat-total">0</span></div>
      <div class="fleet-stat is-online"><span class="fs-label">Online</span><span class="fs-value" id="stat-online">0</span></div>
      <div class="fleet-stat is-offline"><span class="fs-label">Offline</span><span class="fs-value" id="stat-offline">0</span></div>
    </div>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>State</th><th>Device</th><th>Channel / SIM</th><th>Battery</th><th>Network</th><th>Last seen</th><th class="th-action"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody id="devices"><tr><td colspan="7"><div class="empty-state">${icon('devices', 34)}Unlock the console to load registered devices.</div></td></tr></tbody>
    </table>
  </div>
</article>`;
}
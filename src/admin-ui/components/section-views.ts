import { icon } from '../icons.js';

/** Shared toolbar shell: a search box plus whatever filter controls a view needs. */
function Toolbar(id: string, controls: string, placeholder = 'Search…') {
  return `
    <div class="toolbar">
      <div class="toolbar-search">
        ${icon('search', 16)}
        <input id="${id}-search" type="search" placeholder="${placeholder}" autocomplete="off" aria-label="${placeholder}">
      </div>
      ${controls}
    </div>`;
}

function select(id: string, label: string, options: Array<[string, string]>) {
  return `<label class="toolbar-field">
      <span class="sr-only">${label}</span>
      <select id="${id}" aria-label="${label}">
        ${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join('')}
      </select>
    </label>`;
}

const STATUS_OPTIONS: Array<[string, string]> = [
  ['', 'All statuses'], ['PENDING', 'Pending'], ['PROCESSING', 'Processing'],
  ['COMPLETED', 'Completed'], ['FAILED', 'Failed'], ['CANCELLED', 'Cancelled']
];

const CHANNEL_OPTIONS: Array<[string, string]> = [['', 'All channels'], ['TELEBIRR', 'Telebirr'], ['CBE', 'CBE']];

/** Full transaction ledger: every payout with filter, search and status. */
export function TransactionsView() {
  return `
<section class="card is-interactive" id="view-transactions-body">
  <div class="card-head">
    <div>
      <h2 class="card-title">All transactions</h2>
      <p class="card-sub">Search by reference, phone number or device.</p>
    </div>
    <span class="count-chip" id="txn-all-count">0 transactions</span>
  </div>
  ${Toolbar('txn-all', select('txn-all-status', 'Filter by status', STATUS_OPTIONS) + select('txn-all-channel', 'Filter by channel', CHANNEL_OPTIONS), 'Search reference, phone or device…')}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Reference</th><th>Phone</th><th>Amount</th><th>Channel</th><th>Device</th><th>Status</th><th>Created</th></tr></thead>
      <tbody id="txn-all"><tr><td colspan="7"><div class="empty-state">${icon('transactions', 34)}Unlock the console to load transactions.</div></td></tr></tbody>
    </table>
  </div>
  <div class="pager" id="txn-all-pager" hidden>
    <div class="pager-info" id="txn-all-info"></div>
    <div class="pager-controls" id="txn-all-controls"></div>
  </div>
</section>`;
}

/** Withdrawal queue with per-row processing actions. */
export function WithdrawalsView() {
  return `
<section class="card is-interactive" id="view-withdrawals-body">
  <div class="card-head">
    <div>
      <h2 class="card-title">Withdrawal queue</h2>
      <p class="card-sub">Only a pending payout can be cancelled; the rest are settled by the provider.</p>
    </div>
    <span class="count-chip" id="wd-count">0 withdrawals</span>
  </div>
  ${Toolbar('wd', select('wd-status', 'Filter by status', STATUS_OPTIONS) + select('wd-channel', 'Filter by channel', CHANNEL_OPTIONS), 'Search reference, phone or device…')}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Reference</th><th>Destination</th><th>Amount</th><th>Channel</th><th>Device</th><th>Attempts</th><th>Status</th><th class="th-action"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody id="wd-all"><tr><td colspan="8"><div class="empty-state">${icon('withdrawals', 34)}Unlock the console to load the queue.</div></td></tr></tbody>
    </table>
  </div>
  <div class="pager" id="wd-pager" hidden>
    <div class="pager-info" id="wd-info"></div>
    <div class="pager-controls" id="wd-controls"></div>
  </div>
</section>`;
}

/** Connected gateway devices with their live telemetry and block control. */
export function DevicesView() {
  return `
<section class="card is-interactive" id="view-devices-body">
  <div class="card-head">
    <div>
      <h2 class="card-title">Connected devices</h2>
      <p class="card-sub">Every phone polling the gateway, with channel, battery and network.</p>
    </div>
    <span class="count-chip" id="dev-all-count">0 devices</span>
  </div>
  <div class="qa-list" style="padding-bottom:14px">
    <div class="fleet-stat-row">
      <div class="fleet-stat"><span class="fs-label">Total Devices</span><span class="fs-value" id="dev-stat-total">0</span></div>
      <div class="fleet-stat is-online"><span class="fs-label">Online</span><span class="fs-value" id="dev-stat-online">0</span></div>
      <div class="fleet-stat is-offline"><span class="fs-label">Offline</span><span class="fs-value" id="dev-stat-offline">0</span></div>
    </div>
  </div>
  ${Toolbar('dev', '', 'Search device id, model or carrier…')}
  <div class="table-wrap">
    <table>
      <thead><tr><th>State</th><th>Device</th><th>Channel / SIM</th><th>Battery</th><th>Network</th><th>Last seen</th><th class="th-action"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody id="dev-all"><tr><td colspan="7"><div class="empty-state">${icon('devices', 34)}Unlock the console to load registered devices.</div></td></tr></tbody>
    </table>
  </div>
</section>`;
}
/** Users with wallet balances and gateway permissions. */
export function UsersView() {
  return `
<section class="card is-interactive" id="view-users-body">
  <div class="card-head">
    <div>
      <h2 class="card-title">Users &amp; wallets</h2>
      <p class="card-sub">Balance, reserved funds and payout activity per account.</p>
    </div>
    <span class="count-chip" id="users-count">0 users</span>
  </div>
  ${Toolbar('users', '', 'Search email or user id…')}
  <div class="table-wrap">
    <table>
      <thead><tr><th>User</th><th>Available</th><th>Reserved</th><th>Currency</th><th>Payouts</th><th>Last payout</th><th class="th-action"><span class="sr-only">Permissions</span></th></tr></thead>
      <tbody id="users-all"><tr><td colspan="7"><div class="empty-state">${icon('users', 34)}Unlock the console to load users.</div></td></tr></tbody>
    </table>
  </div>
</section>`;
}

/** Gateway configuration. Read-only: nothing here can be changed from the browser. */
export function SettingsView() {
  return `
<section class="card is-interactive" id="view-settings-body">
  <div class="card-head">
    <div>
      <h2 class="card-title">Gateway configuration</h2>
      <p class="card-sub">Read-only. Secrets and connection strings are never sent to the browser.</p>
    </div>
    <span class="count-chip" id="settings-badge">Loading…</span>
  </div>
  <div class="settings-grid" id="settings-body">
    <div class="empty-state">${icon('settings', 34)}Unlock the console to load gateway settings.</div>
  </div>
</section>`;
}

/** Activity and error feed across webhooks, payout attempts and the outbox. */
export function LogsView() {
  return `
<section class="card is-interactive" id="view-logs-body">
  <div class="card-head">
    <div>
      <h2 class="card-title">System logs</h2>
      <p class="card-sub">Provider webhooks, payout attempts and outbox delivery.</p>
    </div>
    <span class="count-chip" id="log-count">0 events</span>
  </div>
  ${Toolbar('log', select('log-level', 'Filter by level', [['', 'All levels'], ['error', 'Errors'], ['warn', 'Warnings'], ['info', 'Info']]), 'Search event, provider or status…')}
  <div class="table-wrap">
    <table>
      <thead><tr><th>Level</th><th>Source</th><th>Event</th><th>Detail</th><th>Created</th></tr></thead>
      <tbody id="log-all"><tr><td colspan="5"><div class="empty-state">${icon('logs', 34)}Unlock the console to load gateway activity.</div></td></tr></tbody>
    </table>
  </div>
</section>`;
}
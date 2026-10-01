import { icon } from '../icons.js';

/**
 * Recent transactions.
 *
 * Full-width ledger fed by GET /api/admin/transactions. The seven cells are the
 * order the dashboard test suite asserts: reference, device, phone, amount,
 * channel, status, created. Pagination is client-side over the fetched window.
 */
export function RecentTransactions() {
  return `
<article class="card is-interactive" id="transactions">
  <div class="card-head">
    <div>
      <h2 class="card-title">Recent Transactions</h2>
      <p class="card-sub">Transaction history across every device in the fleet.</p>
    </div>
    <span class="count-chip" id="txn-count">No payouts yet</span>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Transaction</th><th>Device</th><th>Phone</th><th>Amount</th><th>Channel</th><th>Status</th><th>Created</th></tr></thead>
      <tbody id="txns"><tr><td colspan="7"><div class="empty-state">${icon('transactions', 34)}Unlock the console to load transaction history.</div></td></tr></tbody>
    </table>
  </div>
  <div class="pager" id="txn-pager" hidden>
    <div class="pager-info" id="txn-page-info"></div>
    <div class="pager-controls" id="txn-page-controls"></div>
  </div>
</article>`;
}
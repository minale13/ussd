import { STYLESHEET } from './stylesheet.js';
import { FLEET_STATS_CSS } from './components/fleet-stats-css.js';
import { Sidebar } from './components/sidebar.js';
import { TopHeader } from './components/top-header.js';
import { UnlockGate } from './components/unlock-gate.js';
import { StatCard } from './components/stat-card.js';
import { DirectWithdrawalCard } from './components/direct-withdrawal.js';
import { DeviceFleetCard } from './components/device-fleet.js';
import { QuickActions } from './components/quick-actions.js';
import { RecentTransactions } from './components/recent-transactions.js';
import { ContentHead } from './components/views.js';
import { TransactionsView, WithdrawalsView, DevicesView, UsersView, SettingsView, LogsView } from './components/section-views.js';

/** The three headline metrics, mapped 1:1 onto GET /api/admin/overview. */
const STAT_CARDS = [
  {
    id: 'cash', label: 'Total Cash-in', field: 'total_cash_in', todayField: 'cash_in_today',
    sub: 'Settled deposits across gateway wallets', accent: 'teal', ico: 'wallet', deltaLabel: 'today'
  },
  {
    id: 'withdrawals', label: 'Total Withdrawals', field: 'total_withdrawals', todayField: 'withdrawals_today',
    sub: 'Completed payout settlements', accent: 'blue', ico: 'withdrawals', deltaLabel: 'today'
  },
  {
    id: 'balance', label: 'Remaining Balance', field: 'remaining_balance', todayField: 'balance_today',
    sub: 'Live balance across funded wallets', accent: 'purple', ico: 'banknote', deltaLabel: 'today'
  }
] as const;

/**
 * The whole console document.
 *
 * Rendered server-side as a single string because the app ships no bundler and
 * no static asset pipeline. All dynamic values are left as neutral placeholders
 * and filled in by the client from the real admin API once the operator
 * authenticates.
 */
export function DashboardLayout(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="robots" content="noindex, nofollow">
<title>USSD Gateway | Operations Console</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5C3'/%3E%3Cstop offset='1' stop-color='%231683FF'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='9' fill='%23020B1A'/%3E%3Cpath d='M7 21l6-6 4 4 8-8.5' fill='none' stroke='url(%23g)' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap">
<style>${STYLESHEET}${FLEET_STATS_CSS}</style>
</head>
<body>
<div class="scrim" id="scrim" aria-hidden="true"></div>
<div class="app">
  ${Sidebar()}
  <div class="main">
    ${TopHeader()}
    <main class="content" id="dashboard">
      ${ContentHead()}

      ${UnlockGate()}

      <div class="view" id="view-dashboard">
      <section class="stats" aria-label="Financial overview">
        ${STAT_CARDS.map((spec) => StatCard(spec)).join('')}
      </section>

      <section class="panels">
        ${DirectWithdrawalCard()}
        ${DeviceFleetCard()}
        ${QuickActions()}
      </section>

      ${RecentTransactions()}
      </div>

      <div class="view" id="view-transactions" hidden>${TransactionsView()}</div>
      <div class="view" id="view-withdrawals" hidden>${WithdrawalsView()}</div>
      <div class="view" id="view-devices" hidden>${DevicesView()}</div>
      <div class="view" id="view-users" hidden>${UsersView()}</div>
      <div class="view" id="view-settings" hidden>${SettingsView()}</div>
      <div class="view" id="view-logs" hidden>${LogsView()}</div>

      <footer class="footer">
        <span>USSD Gateway Console &middot; ETB settlement &middot; Admin API protected</span>
        <span class="live" id="last-sync"><span class="dot"></span><span>Awaiting sync</span></span>
      </footer>
    </main>
  </div>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<noscript><p style="padding:20px;text-align:center">Enable JavaScript to use the console.</p></noscript>
<script src="/admin/app.js" defer></script>
</body>
</html>`;
}
import { icon, type IconName } from '../icons.js';

/** One tile of the home summary grid, mapped onto a real API field. */
const TILES: Array<{ id: string; label: string; ico: IconName; tone: string; foot: string }> = [
  { id: 'cash', label: 'Cash-in', ico: 'cashIn', tone: 'green', foot: 'Settled deposits' },
  { id: 'withdrawals', label: 'Withdrawals', ico: 'cashOut', tone: 'blue', foot: 'Completed payouts' },
  { id: 'active-devices', label: 'Active Devices', ico: 'devices', tone: 'purple', foot: 'Polling right now' },
  { id: 'today-txns', label: "Today's Txns", ico: 'calendarCheck', tone: '', foot: 'Since midnight' }
];

/**
 * Home dashboard.
 *
 * Greeting, the total balance hero with its growth chip, a 2x2 summary grid and
 * the recent-activity list. Every figure is a placeholder here and is filled in
 * by the client from /api/admin/overview, /api/admin/devices and
 * /api/admin/transactions once the operator signs in.
 */
export function HomeScreen() {
  return `
<section class="screen" id="view-home" aria-label="Dashboard">
  <div class="greet">
    <div>
      <div class="greet-hello" id="greeting">Hello, Admin</div>
      <div class="greet-sub" id="clock-date">—</div>
    </div>
    <button class="btn btn-ghost" id="open-send" type="button">${icon('send', 16)}<span>Send</span></button>
  </div>

  <article class="card balance">
    <div class="balance-top">
      <span class="balance-label">Total Balance</span>
      <span class="balance-icon" aria-hidden="true">${icon('wallet', 19)}</span>
    </div>
    <div class="balance-value">
      <span class="balance-amount" id="balance">0.00</span>
      <span class="balance-unit">ETB</span>
    </div>
    <div class="balance-foot">
      <span class="trend" id="balance-trend">${icon('arrowUpRight', 13)}<span id="balance-growth">0.00%</span></span>
      <span id="balance-trend-note">vs. lifetime cash-in</span>
    </div>
  </article>

  <div class="summary" aria-label="Summary">
    ${TILES.map(
      (tile) => `<article class="tile ${tile.tone}">
      <span class="tile-icon" aria-hidden="true">${icon(tile.ico, 17)}</span>
      <div>
        <div class="tile-label">${tile.label}</div>
        <div class="tile-value" id="${tile.id}">—</div>
      </div>
      <div class="tile-foot">${tile.foot}</div>
    </article>`
    ).join('\n    ')}
  </div>

  <article class="card" id="activity">
    <div class="card-head">
      <div>
        <h2 class="card-title">Recent Activity</h2>
        <p class="card-sub">The latest payouts across every device.</p>
      </div>
      <button class="link-more" type="button" data-route="transactions">View All ${icon('chevronRight', 15)}</button>
    </div>
    <div class="list" id="recent">
      <div class="skel skel-card"></div>
      <div class="skel skel-card"></div>
      <div class="skel skel-card"></div>
    </div>
  </article>
</section>`;
}
import { icon, type IconName } from '../icons.js';

/**
 * Quick actions.
 *
 * Each entry drives a real console section rather than a decorative link:
 * `route` navigates the console, and `focus` additionally moves the operator to
 * an element on the destination page (used by "Unlock Console").
 */
export function QuickActions() {
  const actions: Array<{ tone: string; ico: IconName; title: string; sub: string; route: string; focus?: string }> = [
    { tone: 'green', ico: 'unlock', title: 'Unlock Console', sub: 'Re-authorise this session', route: 'dashboard', focus: 'access' },
    { tone: 'blue', ico: 'transactions', title: 'View Transactions', sub: 'Browse the payout ledger', route: 'transactions' },
    { tone: 'purple', ico: 'devices', title: 'Device Management', sub: 'Block or release a phone', route: 'devices' },
    { tone: 'orange', ico: 'settings', title: 'System Settings', sub: 'Gateway preferences', route: 'settings' }
  ];
  return `
<article class="card is-interactive panel-quick" id="quick-actions">
  <div class="card-head">
    <div>
      <h2 class="card-title">Quick Actions</h2>
      <p class="card-sub">Jump straight to a common operator task.</p>
    </div>
  </div>
  <div class="qa-list">
    ${actions
      .map(
        (a) => `<button class="qa-item ${a.tone}" type="button" data-route="${a.route}"${a.focus ? ` data-focus="${a.focus}"` : ''}>
      <span class="qa-icon">${icon(a.ico, 18)}</span>
      <span class="qa-copy"><span class="qa-title">${a.title}</span><span class="qa-sub">${a.sub}</span></span>
      <span class="qa-arrow">${icon('chevronRight', 17)}</span>
    </button>`
      )
      .join('')}
  </div>
</article>`;
}
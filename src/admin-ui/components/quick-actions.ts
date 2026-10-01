import { icon } from '../icons.js';

/**
 * Quick actions.
 *
 * Each entry drives a real console capability rather than a decorative link:
 * unlock re-authorises, the other three scroll to the panel they name.
 */
export function QuickActions() {
  const actions = [
    { tone: 'green', ico: 'unlock', title: 'Unlock Console', sub: 'Re-authorise this session', target: 'access' },
    { tone: 'blue', ico: 'transactions', title: 'View Transactions', sub: 'Browse the payout ledger', target: 'transactions' },
    { tone: 'purple', ico: 'devices', title: 'Device Management', sub: 'Block or release a phone', target: 'devices-panel' },
    { tone: 'orange', ico: 'settings', title: 'System Settings', sub: 'Gateway preferences', target: 'settings' }
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
        (a) => `<button class="qa-item ${a.tone}" type="button" data-nav="${a.target}">
      <span class="qa-icon">${icon(a.ico as Parameters<typeof icon>[0], 18)}</span>
      <span class="qa-copy"><span class="qa-title">${a.title}</span><span class="qa-sub">${a.sub}</span></span>
      <span class="qa-arrow">${icon('chevronRight', 17)}</span>
    </button>`
      )
      .join('')}
  </div>
</article>`;
}
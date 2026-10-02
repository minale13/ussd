import { icon, type IconName } from '../icons.js';

/**
 * Quick actions menu.
 *
 * Each entry drives a real screen rather than a decorative link: `route`
 * navigates the app. "Unlock Console" returns to the sign-in screen so the
 * operator can re-authorise without reloading the page.
 */
const ACTIONS: Array<{ tone: string; ico: IconName; title: string; sub: string; route: string; action?: string }> = [
  { tone: 'green', ico: 'unlock', title: 'Unlock Console', sub: 'Re-authorise this session', route: '', action: 'sign-out' },
  { tone: 'blue', ico: 'transactions', title: 'View Transactions', sub: 'Browse the payout ledger', route: 'transactions' },
  { tone: 'purple', ico: 'devices', title: 'Device Management', sub: 'Block or release a phone', route: 'devices' },
  { tone: 'orange', ico: 'settings', title: 'System Settings', sub: 'Gateway preferences', route: 'profile' }
];

/**
 * The "More" hub: quick actions plus the entries to the remaining screens.
 */
export function MoreScreen() {
  return `
<section class="screen" id="view-more" aria-label="More" hidden>
  <article class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">Quick Actions</h2>
        <p class="card-sub">Jump straight to a common operator task.</p>
      </div>
    </div>
    <div class="qa-grid" id="quick-actions">
      ${ACTIONS.map(
        (a) => `<button class="qa-item ${a.tone}" type="button"${a.route ? ` data-route="${a.route}"` : ` data-action="${a.action}"`}>
        <span class="qa-icon">${icon(a.ico, 19)}</span>
        <span>
          <span class="qa-title">${a.title}</span>
          <span class="qa-sub">${a.sub}</span>
        </span>
      </button>`
      ).join('\n      ')}
    </div>
  </article>

  <article class="card">
    <button class="setting-row" type="button" data-route="send">
      <span class="setting-icon">${icon('send', 18)}</span>
      <span class="setting-main">
        <span class="setting-title">Send Money</span>
        <span class="setting-sub">Queue a direct withdrawal to any phone</span>
      </span>
      <span class="setting-chevron">${icon('chevronRight', 18)}</span>
    </button>
    <button class="setting-row" type="button" data-action="open-notifications">
      <span class="setting-icon blue">${icon('bell', 18)}</span>
      <span class="setting-main">
        <span class="setting-title">Notifications</span>
        <span class="setting-sub">Transaction, device and system alerts</span>
      </span>
      <span class="setting-chevron">${icon('chevronRight', 18)}</span>
    </button>
    <button class="setting-row" type="button" data-route="profile">
      <span class="setting-icon purple">${icon('user', 18)}</span>
      <span class="setting-main">
        <span class="setting-title">Profile &amp; Settings</span>
        <span class="setting-sub">Account, security and app preferences</span>
      </span>
      <span class="setting-chevron">${icon('chevronRight', 18)}</span>
    </button>
  </article>
</section>`;
}

/**
 * Profile & settings.
 *
 * Account, security, notification preference, app information and logout. The
 * gateway figures in "App settings" are read from GET /api/admin/settings,
 * which is an explicit allow-list: no secret is ever sent to the browser.
 */
export function ProfileScreen() {
  return `
<section class="screen" id="view-profile" aria-label="Profile and settings" hidden>
  <article class="card">
    <div class="detail-hero">
      <div class="detail-avatar" aria-hidden="true">${icon('user', 26)}</div>
      <div style="min-width:0">
        <div class="detail-name" id="profile-name">Admin</div>
        <div class="detail-id" id="profile-role">Super Administrator</div>
        <div class="detail-state">
          <span class="pill online" id="profile-session"><span class="dot"></span>Session active</span>
        </div>
      </div>
    </div>
  </article>

  <article class="card">
    <div class="card-head"><div><h2 class="card-title">Account</h2></div></div>
    <div class="rows">
      <div class="row">
        <span class="row-label">${icon('user', 16)}<span>Username</span></span>
        <span class="row-value" id="account-username">admin</span>
      </div>
      <div class="row">
        <span class="row-label">${icon('shield', 16)}<span>Access level</span></span>
        <span class="row-value">Full admin API</span>
      </div>
      <div class="row">
        <span class="row-label">${icon('lock', 16)}<span>Auth method</span></span>
        <span class="row-value is-muted">Admin API key header</span>
      </div>
    </div>
  </article>

  <article class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">Security</h2>
        <p class="card-sub">The key lives in the sign-in form only, never in browser storage.</p>
      </div>
    </div>
    <button class="setting-row" type="button" data-action="sign-out">
      <span class="setting-icon">${icon('unlock', 18)}</span>
      <span class="setting-main">
        <span class="setting-title">Re-authorise</span>
        <span class="setting-sub">Clear the key and show the sign-in screen</span>
      </span>
      <span class="setting-chevron">${icon('chevronRight', 18)}</span>
    </button>
  </article>

  <article class="card">
    <div class="card-head"><div><h2 class="card-title">Notifications</h2></div></div>
    <div class="setting-row">
      <span class="setting-icon blue">${icon('bell', 18)}</span>
      <span class="setting-main">
        <span class="setting-title">Push alerts</span>
        <span class="setting-sub">Transaction, device and battery warnings</span>
      </span>
      <button class="switch" id="notify-toggle" type="button" role="switch" aria-checked="true" aria-label="Toggle push alerts"></button>
    </div>
  </article>

  <article class="card">
    <div class="card-head">
      <div>
        <h2 class="card-title">App settings</h2>
        <p class="card-sub">Read-only gateway configuration and health.</p>
      </div>
      <span class="count-chip" id="settings-badge">Loading</span>
    </div>
    <div class="defs" id="settings-body">
      <div class="empty-state">${icon('settings', 34)}Sign in to load gateway settings.</div>
    </div>
  </article>

  <article class="card">
    <div class="card-head"><div><h2 class="card-title">About</h2></div></div>
    <div class="rows">
      <div class="row">
        <span class="row-label">${icon('about', 16)}<span>Application</span></span>
        <span class="row-value">USSD Gateway Console</span>
      </div>
      <div class="row">
        <span class="row-label">${icon('sparkle', 16)}<span>Version</span></span>
        <span class="row-value is-muted" id="about-version">2.0.0</span>
      </div>
    </div>
    <div class="form" style="padding-top:0">
      <button class="btn btn-danger btn-block" id="logout" type="button">${icon('logout', 18)}<span>Log Out</span></button>
    </div>
  </article>
</section>`;
}

/**
 * Notifications panel.
 *
 * A slide-up sheet fed by three real sources: unsettled payouts, devices that
 * dropped offline or were blocked, and phones reporting a low battery. Each row
 * is timestamped from the data the API returned.
 */
export function NotificationsSheet() {
  return `
<div class="scrim" id="notif-scrim" aria-hidden="true"></div>
<aside class="sheet" id="notif-sheet" aria-label="Notifications" aria-hidden="true">
  <div class="sheet-grip" aria-hidden="true"></div>
  <div class="sheet-head">
    <div>
      <div class="sheet-title">Notifications</div>
      <div class="setting-sub" id="notif-summary">0 alerts</div>
    </div>
    <button class="icon-btn" id="notif-close" type="button" aria-label="Close notifications">${icon('chevronDown', 20)}</button>
  </div>
  <div class="sheet-body" id="notif-list">
    <div class="empty-state">${icon('bell', 34)}No alerts yet.</div>
  </div>
</aside>`;
}

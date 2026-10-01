import { icon } from '../icons.js';

/**
 * Sticky top header: search, live gateway status, notifications and identity.
 *
 * The admin key is never persisted here - it lives only in the unlock input on
 * this page, so a reload always re-prompts for authorisation.
 */
export function TopHeader() {
  return `
<header class="header">
  <button class="icon-btn nav-toggle" id="nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false">${icon('menu', 19)}</button>
  <div class="search">
    ${icon('search', 17)}
    <input id="search" type="search" placeholder="Search transactions, phone number, device..." autocomplete="off" spellcheck="false" aria-label="Search transactions, phone number, device">
  </div>
  <div class="header-right">
    <div class="system-status" id="gateway-status"><span class="dot"></span><span id="gateway-status-text">Checking gateway</span></div>
    <button class="icon-btn" id="refresh" type="button" title="Refresh dashboard" aria-label="Refresh dashboard">${icon('refresh', 18)}</button>
    <button class="icon-btn" id="notifications" type="button" title="Notifications" aria-label="Notifications">
      ${icon('bell', 18)}
      <span class="notif-badge" id="notif-badge">0</span>
    </button>
    <button class="admin" id="admin-menu" type="button" aria-haspopup="true" aria-expanded="false">
      <span class="admin-avatar" aria-hidden="true">AD</span>
      <span class="admin-meta">
        <span class="admin-name">Admin</span>
        <span class="admin-role">Super Administrator</span>
      </span>
      ${icon('chevronDown', 15)}
    </button>
  </div>
</header>`;
}
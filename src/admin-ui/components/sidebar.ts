import { icon } from '../icons.js';

export type NavItem = { label: string; icon: Parameters<typeof icon>[0]; target: string; active?: boolean };

const PRIMARY: NavItem[] = [
  { label: 'Dashboard', icon: 'dashboard', target: 'dashboard', active: true },
  { label: 'Transactions', icon: 'transactions', target: 'transactions' },
  { label: 'Withdrawals', icon: 'withdrawals', target: 'withdrawal' },
  { label: 'Devices', icon: 'devices', target: 'devices' },
  { label: 'Users', icon: 'users', target: 'devices' },
  { label: 'Settings', icon: 'settings', target: 'settings' }
];

const SECONDARY: NavItem[] = [
  { label: 'Logs', icon: 'logs', target: 'transactions' },
  { label: 'Help', icon: 'help', target: 'settings' }
];

function navItem(item: NavItem) {
  return (
    `<button class="nav-item${item.active ? ' is-active' : ''}" type="button" data-nav="${item.target}"` +
    `${item.active ? ' aria-current="page"' : ''}>${icon(item.icon, 18)}<span>${item.label}</span></button>`
  );
}

/** Fixed left navigation rail. Items are real buttons that scroll the console. */
export function Sidebar() {
  return `
<aside class="sidebar" id="sidebar">
  <div class="brand">
    <div class="brand-mark">${icon('logo', 22)}</div>
    <div class="brand-text">
      <div class="brand-name">AUTO-WITHDRAWAL GATEWAY</div>
      <div class="brand-tag">USSD Gateway Console</div>
    </div>
  </div>
  <nav class="nav" aria-label="Console sections">
    ${PRIMARY.map(navItem).join('')}
    <div class="nav-divider" role="separator"></div>
    ${SECONDARY.map(navItem).join('')}
  </nav>
  <div class="sidebar-foot">
    <div class="foot-shield">${icon('shield', 17)}</div>
    <div>
      <div class="foot-title">Secure &amp; Reliable</div>
      <div class="foot-sub">USSD Gateway v2.0.0</div>
    </div>
  </div>
</aside>`;
}
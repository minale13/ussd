import { icon, type IconName } from '../icons.js';

/**
 * A screen in the app.
 *
 * `route` matches the path segment and the view id, so adding a screen here
 * wires the bottom navigation, the top-bar heading and the URL together.
 *
 * `nav: false` marks a screen the operator reaches by drilling in (device
 * details, send money) rather than from the bottom bar.
 */
export type ScreenSpec = {
  route: string;
  path: string;
  title: string;
  subtitle: string;
  ico: IconName;
  nav?: boolean;
  /** Back arrow, for a screen pushed on top of another. */
  back?: string;
};

/**
 * The routed screens of the app.
 *
 * The four `nav: true` entries are exactly the bottom navigation bar: Home,
 * Transactions, Devices, More. Everything else is reached from inside a screen.
 */
export const SCREENS: ScreenSpec[] = [
  { route: 'home', path: '/admin', title: 'Home', subtitle: 'Live gateway overview', ico: 'home', nav: true },
  { route: 'transactions', path: '/admin/transactions', title: 'Transactions', subtitle: 'Every payout across the fleet', ico: 'transactions', nav: true },
  { route: 'devices', path: '/admin/devices', title: 'Devices', subtitle: 'Phones running the gateway app', ico: 'devices', nav: true },
  { route: 'more', path: '/admin/more', title: 'More', subtitle: 'Quick actions and settings', ico: 'more', nav: true },
  { route: 'send', path: '/admin/send', title: 'Send Money', subtitle: 'Queue a direct withdrawal', ico: 'send', back: 'home' },
  { route: 'device', path: '/admin/device', title: 'Device Details', subtitle: 'Status, telemetry and controls', ico: 'devices', back: 'devices' },
  { route: 'notifications', path: '/admin/notifications', title: 'Notifications', subtitle: 'Transaction, device and system alerts', ico: 'bell', back: 'home' },
  { route: 'profile', path: '/admin/profile', title: 'Profile & Settings', subtitle: 'Account, security and app preferences', ico: 'settings', back: 'more' }
];

/** The four bottom-navigation destinations, in bar order. */
export const NAV_SCREENS = SCREENS.filter((screen) => screen.nav);

/**
 * Sticky top bar.
 *
 * The heading and the clock live here rather than inside each screen, so the
 * two text nodes are rendered exactly once and the router only swaps them.
 * The back arrow is hidden by default and revealed by the client on a screen
 * that declares one.
 */
export function TopBar() {
  return `
<header class="topbar">
  <button class="icon-btn" id="back" type="button" aria-label="Go back" hidden>${icon('arrowLeft', 20)}</button>
  <div class="topbar-titles">
    <div class="topbar-title" id="view-title">Home</div>
    <div class="topbar-sub" id="view-subtitle">Live gateway overview</div>
  </div>
  <div class="system-status" id="gateway-status"><span class="dot"></span><span id="gateway-status-text">Checking</span></div>
  <button class="icon-btn" id="refresh" type="button" title="Refresh" aria-label="Refresh data">${icon('refresh', 19)}</button>
  <button class="icon-btn" id="notifications" type="button" title="Notifications" aria-label="Notifications">
    ${icon('bell', 19)}
    <span class="notif-badge" id="notif-badge">0</span>
  </button>
  <button class="avatar" id="admin-menu" type="button" aria-label="Profile and settings">AD</button>
</header>`;
}

/**
 * Bottom navigation bar.
 *
 * Items are real anchors pointing at the routed URLs so they stay bookmarkable
 * and work with middle-click; the client router intercepts a plain left click
 * for a transition that keeps the in-memory admin key alive.
 */
export function BottomNav() {
  return `
<nav class="bottom-nav" id="bottom-nav" aria-label="Main navigation">
  ${NAV_SCREENS.map(
    (screen) => `<a class="nav-item${screen.route === 'home' ? ' is-active' : ''}" href="${screen.path}" data-route="${screen.route}"${
      screen.route === 'home' ? ' aria-current="page"' : ''
    }>${icon(screen.ico, 21)}<span>${screen.title}</span></a>`
  ).join('\n  ')}
</nav>`;
}
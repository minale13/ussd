import { icon } from '../icons.js';
import { VIEWS } from './views.js';

/**
 * Fixed left navigation rail.
 *
 * Items are real anchors pointing at the routed URLs so they are bookmarkable,
 * shareable and work with middle-click. The client router intercepts a plain
 * left click for a client-side transition and leaves modified clicks alone.
 */
export function Sidebar() {
  // Logs is routed like every other section but belongs in the lower group, so
  // it is pulled out of the primary list to keep the original grouping
  // (six sections, divider, then Logs and Help).
  const primary = VIEWS.filter((view) => view.route !== 'logs');
  const items = primary
    .map(
      (view) =>
        `<a class="nav-item${view.route === 'dashboard' ? ' is-active' : ''}" href="${view.path}" data-route="${view.route}"` +
        `${view.route === 'dashboard' ? ' aria-current="page"' : ''}>${icon(view.ico, 18)}` +
        `<span>${view.route === 'dashboard' ? 'Dashboard' : view.title}</span></a>`
    )
    .join('');

  const secondary = [
    { label: 'Logs', href: '/admin/logs', route: 'logs', ico: 'logs' as const },
    { label: 'Help', href: '/admin/settings', route: 'settings', ico: 'help' as const, utility: true }
  ]
    .map(
      (item) =>
        `<a class="nav-item" href="${item.href}" data-route="${item.route}"` +
        // Help points at the settings page but is a utility shortcut, not a
        // section, so it must not compete for the active marker.
        `${item.utility ? ' data-utility="true"' : ''}>` +
        `${icon(item.ico, 18)}<span>${item.label}</span></a>`
    )
    .join('');

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
    ${items}
    <div class="nav-divider" role="separator"></div>
    ${secondary}
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
import { icon, type IconName } from '../icons.js';

/** A routed console section. `route` matches both the path segment and the view id. */
export type ViewSpec = {
  route: string;
  path: string;
  title: string;
  subtitle: string;
  ico: IconName;
};

/**
 * The routed sections of the console.
 *
 * Order matters: the sidebar is built from this list, so adding a section here
 * wires the navigation, the URL and the view container together.
 */
export const VIEWS: ViewSpec[] = [
  { route: 'dashboard', path: '/admin', title: 'Welcome Back, Admin', subtitle: 'Monitor and manage your USSD gateway operations in real-time.', ico: 'dashboard' },
  { route: 'transactions', path: '/admin/transactions', title: 'Transactions', subtitle: 'Every settled, pending and failed payout across the fleet.', ico: 'transactions' },
  { route: 'withdrawals', path: '/admin/withdrawals', title: 'Withdrawals', subtitle: 'Queue, inspect and cancel outbound payouts.', ico: 'withdrawals' },
  { route: 'devices', path: '/admin/devices', title: 'Devices', subtitle: 'Connected USSD gateway phones and their live telemetry.', ico: 'devices' },
  { route: 'users', path: '/admin/users', title: 'Users', subtitle: 'Wallets, balances and gateway permissions.', ico: 'users' },
  { route: 'settings', path: '/admin/settings', title: 'Settings', subtitle: 'Gateway configuration and service health.', ico: 'settings' },
  { route: 'logs', path: '/admin/logs', title: 'Logs', subtitle: 'Gateway activity, provider webhooks and error events.', ico: 'logs' }
];

/**
 * The heading and clock sit above the routed views rather than inside each
 * one, so the date/time nodes are rendered exactly once (no duplicate ids) and
 * the router only has to swap the two text nodes on navigation.
 */
export function ContentHead() {
  // VIEWS[0] is the dashboard by construction; the guard keeps the strict
  // indexed-access check happy without lying about the type.
  const current = VIEWS[0];
  const title = current?.title ?? 'Dashboard';
  const subtitle = current?.subtitle ?? '';
  return `
  <div class="page-head">
    <div>
      <h1 class="page-title" id="view-title">${title} <span aria-hidden="true">&#128075;</span></h1>
      <p class="page-sub" id="view-subtitle">${subtitle}</p>
    </div>
    <div class="clock">
      ${icon('calendar', 20)}
      <div>
        <div class="clock-date" id="clock-date">—</div>
        <div class="clock-time" id="clock-time">— (EAT)</div>
      </div>
    </div>
  </div>`;
}
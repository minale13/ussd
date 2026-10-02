import { STYLESHEET } from './stylesheet.js';
import { SplashScreen, LoginScreen } from './components/auth.js';
import { TopBar, BottomNav } from './components/navigation.js';
import { HomeScreen } from './components/home.js';
import { SendMoneyScreen } from './components/send-money.js';
import { TransactionsScreen, DevicesScreen, DeviceDetailScreen } from './components/ledger.js';
import { MoreScreen, ProfileScreen, NotificationsSheet } from './components/hub.js';

/**
 * The whole app document.
 *
 * Rendered server-side as a single string because the project ships no bundler
 * and no static asset pipeline. All dynamic values are neutral placeholders and
 * are filled in by the client from the real admin API once the operator signs in.
 *
 * The ten screens of the flow: splash (1) and login (2) are full-viewport
 * overlays, then home (3), transactions (5), devices (6) and the More hub /
 * quick actions (7) are the four bottom-nav destinations. Send money (4),
 * device details (8) and profile & settings (9) are pushed on top of those, and
 * the notifications panel (10) is a slide-up sheet rather than a routed screen.
 *
 * @param adminUsername the configured `ADMIN_USERNAME`, prefilled on the login
 *        form so the operator only has to type the password.
 */
export function DashboardLayout(adminUsername = 'admin'): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#02060F">
<meta name="robots" content="noindex, nofollow">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>USSD Gateway Console</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2300E5C3'/%3E%3Cstop offset='1' stop-color='%2300E08F'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='9' fill='%2302060F'/%3E%3Cpath d='M7 21l6-6 4 4 8-8.5' fill='none' stroke='url(%23g)' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap">
<style>${STYLESHEET}</style>
</head>
<body class="is-booting is-locked">
${SplashScreen()}
${LoginScreen(adminUsername)}

<div class="app" id="app">
  ${BottomNav()}
  <div class="shell-main">
    ${TopBar()}
    <main class="content" id="content">
      ${HomeScreen()}
      ${TransactionsScreen()}
      ${DevicesScreen()}
      ${MoreScreen()}
      ${SendMoneyScreen()}
      ${DeviceDetailScreen()}
      ${ProfileScreen()}
    </main>
  </div>
</div>

${NotificationsSheet()}
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<noscript><p style="padding:20px;text-align:center">Enable JavaScript to use the console.</p></noscript>
<script src="/admin/app.js" defer></script>
</body>
</html>`;
}
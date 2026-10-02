/** Admin app client, part 6: the screen router and the bottom navigation. */
export const CLIENT_ROUTER = `
  var ROUTES = {
    home: { path: '/admin', title: 'Home', subtitle: 'Live gateway overview', back: '' },
    transactions: { path: '/admin/transactions', title: 'Transactions', subtitle: 'Every payout across the fleet', back: '' },
    devices: { path: '/admin/devices', title: 'Devices', subtitle: 'Phones running the gateway app', back: '' },
    more: { path: '/admin/more', title: 'More', subtitle: 'Quick actions and settings', back: '' },
    send: { path: '/admin/send', title: 'Send Money', subtitle: 'Queue a direct withdrawal', back: 'home' },
    device: { path: '/admin/device', title: 'Device Details', subtitle: 'Status, telemetry and controls', back: 'devices' },
    notifications: { path: '/admin/notifications', title: 'Notifications', subtitle: 'Transaction, device and system alerts', back: 'home' },
    profile: { path: '/admin/profile', title: 'Profile & Settings', subtitle: 'Account, security and app preferences', back: 'more' }
  };

  /** Maps a pathname onto a screen name, defaulting to Home. */
  function routeFromPath(pathname) {
    var clean = String(pathname || '').replace(/\\/+$/, '') || '/admin';
    var match = Object.keys(ROUTES).filter(function (key) { return ROUTES[key].path === clean; })[0];
    return match || 'home';
  }

  function currentRoute() { return routeFromPath(window.location.pathname); }

  /**
   * Shows one screen, hides the rest, and syncs the top bar and bottom nav.
   *
   * Showing one screen at a time: the optional scroll argument is false for the
   * very first paint, which is already at the top; scrolling there is a no-op
   * that would only add jank.
   */
  function applyRoute(route, scroll) {
    state.route = ROUTES[route] ? route : 'home';
    var meta = ROUTES[state.route];

    Object.keys(ROUTES).forEach(function (key) {
      var node = byId('view-' + key);
      if (node) node.hidden = key !== state.route;
    });

    setText('view-title', meta.title);
    setText('view-subtitle', meta.subtitle);
    document.title = meta.title + ' | USSD Gateway Console';

    // A screen reached by drilling in gets a back arrow; a top-level tab does not.
    var back = byId('back');
    if (back) back.hidden = !meta.back;
    back && back.setAttribute('data-route', meta.back || '');

    // The bottom bar highlights the tab that owns the current screen, so a
    // pushed sub-screen still reads as "inside" its parent section.
    var owner = { send: 'home', device: 'devices', profile: 'more', notifications: 'home' }[state.route] || state.route;
    Array.prototype.forEach.call(document.querySelectorAll('.nav-item[data-route]'), function (item) {
      var active = item.getAttribute('data-route') === owner;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    if (state.route === 'device' && state.selectedDevice) renderDeviceDetail(state.selectedDevice.device_id);
    if (scroll !== false) window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /**
   * Client-side navigation.
   *
   * Bottom-nav and shortcut links are real anchors so they stay bookmarkable
   * and middle-click keeps working; a plain left click is intercepted for a
   * transition that keeps the in-memory admin key alive, while modified clicks
   * fall through to the browser.
   */
  function navigate(route) {
    var meta = ROUTES[route];
    if (!meta) return;
    closeSheet();
    if (currentRoute() !== route) {
      try { window.history.pushState({ route: route }, '', meta.path); }
      catch (err) { window.location.href = meta.path; return; }
    }
    applyRoute(route);
    loadScreenData(route);
  }
`;

/** Admin console client, part 8: the client-side router. */
export const CLIENT_ROUTER = `
  var ROUTES = {
    dashboard: { path: '/admin', title: 'Welcome Back, Admin', subtitle: 'Monitor and manage your USSD gateway operations in real-time.' },
    transactions: { path: '/admin/transactions', title: 'Transactions', subtitle: 'Every settled, pending and failed payout across the fleet.' },
    withdrawals: { path: '/admin/withdrawals', title: 'Withdrawals', subtitle: 'Queue, inspect and cancel outbound payouts.' },
    devices: { path: '/admin/devices', title: 'Devices', subtitle: 'Connected USSD gateway phones and their live telemetry.' },
    users: { path: '/admin/users', title: 'Users', subtitle: 'Wallets, balances and gateway permissions.' },
    settings: { path: '/admin/settings', title: 'Settings', subtitle: 'Gateway configuration and service health.' },
    logs: { path: '/admin/logs', title: 'Logs', subtitle: 'Gateway activity, provider webhooks and error events.' }
  };

  /** Maps a pathname onto a route name, defaulting to the dashboard. */
  function routeFromPath(pathname) {
    var clean = String(pathname || '').replace(/\\/+$/, '') || '/admin';
    var match = Object.keys(ROUTES).filter(function (key) { return ROUTES[key].path === clean; })[0];
    return match || 'dashboard';
  }

  function currentRoute() { return routeFromPath(window.location.pathname); }

  /** Shows one view, hides the rest, and syncs the sidebar + heading. */
  function applyRoute(route, focusId, scroll) {
    state.route = ROUTES[route] ? route : 'dashboard';
    var meta = ROUTES[state.route];

    Object.keys(ROUTES).forEach(function (key) {
      var node = byId('view-' + key);
      if (node) node.hidden = key !== state.route;
    });

    var title = byId('view-title');
    if (title) title.innerHTML = escapeHtml(meta.title) + (state.route === 'dashboard' ? ' <span aria-hidden="true">&#128075;</span>' : '');
    var subtitle = byId('view-subtitle');
    if (subtitle) subtitle.textContent = meta.subtitle;

    Array.prototype.forEach.call(document.querySelectorAll('.nav-item[data-route]'), function (item) {
      var active = item.getAttribute('data-route') === state.route;
      // A utility shortcut (Help) shares a route with a real section and must
      // not be highlighted as though it were the current page.
      if (item.getAttribute('data-utility') === 'true') return;
      item.classList.toggle('is-active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });

    document.title = meta.title + ' | USSD Gateway Console';

    if (focusId) {
      var target = byId(focusId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var key = byId('key');
        if (focusId === 'access' && key) key.focus();
      }
    } else if (scroll !== false) {
      // Only a real transition scrolls. The initial paint is already at the
      // top, and scrolling there is a no-op that only adds jank.
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }

  /**
   * Client-side navigation. A plain left click on a console link swaps the view
   * without a reload, which is also what keeps the in-memory admin key alive
   * across sections; modified clicks fall through to the browser so
   * middle-click and "open in new tab" keep working.
   */
  function navigate(route, focusId) {
    var meta = ROUTES[route];
    if (!meta) return;
    if (currentRoute() !== route) {
      try { window.history.pushState({ route: route }, '', meta.path); }
      catch (err) { window.location.href = meta.path; return; }
    }
    closeNav();
    applyRoute(route, focusId);
    loadView(route);
  }

  function bindRouter() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('[data-route]');
      if (!link) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;
      event.preventDefault();
      navigate(link.getAttribute('data-route'), link.getAttribute('data-focus') || undefined);
    });
    window.addEventListener('popstate', function () {
      var route = currentRoute();
      applyRoute(route);
      loadView(route);
    });
  }
`;
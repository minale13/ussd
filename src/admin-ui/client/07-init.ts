/** Admin console client, part 7: clock, navigation, search, wiring and boot. */
export const CLIENT_INIT = `
  /**
   * Live wall-clock in East Africa Time. Computed from the real system clock;
   * nothing here is hardcoded. Falls back to UTC when the runtime has no
   * full ICU timezone data.
   */
  function tickClock() {
    var dateNode = byId('clock-date');
    var timeNode = byId('clock-time');
    if (!dateNode || !timeNode) return;
    var now = new Date();
    try {
      dateNode.textContent = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Nairobi'
      }).format(now);
      timeNode.textContent = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Nairobi'
      }).format(now) + ' (EAT)';
    } catch (err) {
      dateNode.textContent = now.toLocaleDateString();
      timeNode.textContent = now.toLocaleTimeString() + ' (local)';
    }
  }

  function closeNav() {
    document.body.classList.remove('nav-open');
    var toggle = byId('nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  /** Notification count reflects payouts still awaiting settlement. */
  function renderNotifications() {
    var badge = byId('notif-badge');
    if (!badge) return;
    var pending = state.transactions.filter(function (row) {
      return row.status === 'PENDING' || row.status === 'PROCESSING';
    }).length;
    badge.textContent = String(pending);
    badge.classList.toggle('has-items', pending > 0);
  }

  function applySearch() {
    var field = byId('search');
    state.search = (field.value || '').trim().toLowerCase();
    state.page = 1;
    renderTransactions(state.transactions);
    renderDevices(state.devices);
  }

  /**
 * Client-side navigation for the console.
 *
 * Sidebar links are real anchors so they are bookmarkable and shareable; a
 * plain left click is intercepted for a transition that keeps the in-memory
 * admin key alive, while modified clicks fall through to the browser.
 */
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

/** Wires the per-view search boxes, selects and pagers. */
function bindViewControls() {
  var filters = [
    ['txn-all-search', function () { state.txnPage = 1; renderTransactionsView(); }],
    ['wd-search', function () { state.wdPage = 1; renderWithdrawalsView(); }],
    ['wd-status', function () { state.wdPage = 1; renderWithdrawalsView(); }],
    ['wd-channel', function () { state.wdPage = 1; renderWithdrawalsView(); }],
    ['dev-search', renderDevicesView],
    ['users-search', renderUsersView],
    ['log-search', renderLogsView],
    ['log-level', renderLogsView]
  ];
  filters.forEach(function (entry) {
    var node = byId(entry[0]);
    if (node) node.addEventListener('input', entry[1]);
    if (node && node.tagName === 'SELECT') node.addEventListener('change', entry[1]);
  });

  [['txn-all-controls', 'txnPage'], ['wd-controls', 'wdPage']].forEach(function (entry) {
    var controls = byId(entry[0]);
    if (!controls) return;
    controls.addEventListener('click', function (event) {
      var button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      state[entry[1]] = Number(button.getAttribute('data-page'));
      if (entry[1] === 'txnPage') renderTransactionsView();
      else renderWithdrawalsView();
    });
  });

  // Cancel is offered only on queued payouts; the server refuses anything else.
  var withdrawalsBody = byId('wd-all');
  if (withdrawalsBody) {
    withdrawalsBody.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action="cancel"]');
      if (!button) return;
      cancelWithdrawal(button.getAttribute('data-id'), button);
    });
  }

  // Block/unblock on the standalone Devices view as well as the dashboard panel.
  var devicesBody = byId('dev-all');
  if (devicesBody) {
    devicesBody.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action="toggle"]');
      if (!button) return;
      toggleDevice(button.getAttribute('data-device-id'), button.getAttribute('data-active') !== 'true', button);
    });
  }
}

function cancelWithdrawal(id, button) {
  button.disabled = true;
  return api('/api/admin/withdrawals/' + encodeURIComponent(id) + '/cancel', { method: 'POST' })
    .then(function (result) {
      var reference = result && result.withdrawal ? result.withdrawal.transaction_id : id;
      notify('Withdrawal ' + reference + ' cancelled and the reserved balance released.');
      return loadView('withdrawals');
    })
    .catch(function (error) {
      notify(error && error.message ? error.message : 'Unable to cancel the withdrawal.', 'error');
      button.disabled = false;
    });
}

function init() {
    byId('unlock').addEventListener('click', function () { load(); });
    byId('refresh').addEventListener('click', function () { load(); });
    byId('key').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); load(); }
    });
    byId('key-toggle').addEventListener('click', function () {
      var input = byId('key');
      var reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      byId('key-field').classList.toggle('is-revealed', reveal);
      byId('key-toggle').setAttribute('aria-label', reveal ? 'Hide admin key' : 'Show admin key');
      byId('key-toggle').title = reveal ? 'Hide admin key' : 'Show admin key';
      input.focus();
    });

    byId('withdrawal-form').addEventListener('submit', handleSubmit);
    bindMenu('channel', setChannel);
    bindMenu('target', setTargetDevice);

    document.addEventListener('click', function () {
      Object.keys(MENUS).forEach(function (key) { setMenuOpen(key, false); });
    });

    // Sidebar, quick actions and view filters share one delegated router.
    bindRouter();
    bindViewControls();

    byId('nav-toggle').addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    byId('scrim').addEventListener('click', closeNav);

    byId('search').addEventListener('input', applySearch);

    byId('notifications').addEventListener('click', function () { navigate('transactions'); });

    byId('txn-page-controls').addEventListener('click', function (event) {
      var button = event.target.closest('[data-page]');
      if (!button || button.disabled) return;
      state.page = Number(button.getAttribute('data-page'));
      renderTransactions(state.transactions);
    });

    byId('devices').addEventListener('click', function (event) {
      var button = event.target.closest('[data-action="toggle"]');
      if (!button) return;
      toggleDevice(button.getAttribute('data-device-id'), button.getAttribute('data-active') !== 'true', button);
    });

    tickClock();
    setInterval(tickClock, 1000);

    // Paint the section the operator actually requested. Because every route is
    // served the same shell, this is what makes a hard refresh on /admin/users
    // land on Users rather than on the dashboard.
    applyRoute(currentRoute(), null, false);

    setInterval(function () {
      if (state.unlocked && document.visibilityState === 'visible') {
        load({ silent: true });
        loadView(state.route);
      }
    }, REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
`;

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

  function goTo(target) {
    closeNav();
    var node = byId(target);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (target === 'access') byId('key').focus();
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

    // Sidebar + quick actions share one delegated handler.
    document.addEventListener('click', function (event) {
      var nav = event.target.closest('[data-nav]');
      if (nav) { goTo(nav.getAttribute('data-nav')); }
    });

    byId('nav-toggle').addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      this.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    byId('scrim').addEventListener('click', closeNav);

    byId('search').addEventListener('input', applySearch);

    byId('notifications').addEventListener('click', function () { goTo('transactions'); });

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

    setInterval(function () {
      if (state.unlocked && document.visibilityState === 'visible') load({ silent: true });
    }, REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
`;

/** Admin app client, part 9: clock, boot and the splash screen. */
export const CLIENT_INIT = `
  /**
   * Live wall-clock in East Africa Time. Computed from the real system clock;
   * nothing here is hardcoded. Falls back to the local zone when the runtime
   * has no full ICU timezone data.
   */
  function tickClock() {
    var node = byId('clock-date');
    if (!node) return;
    var now = new Date();
    try {
      node.textContent = new Intl.DateTimeFormat('en-GB', {
        weekday: 'long', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Nairobi'
      }).format(now) + ' (EAT)';
    } catch (err) {
      node.textContent = now.toLocaleString();
    }
  }

  /**
   * The splash screen.
   *
   * /health needs no admin key, so the connection indicator reports a real
   * answer before sign-in rather than spinning indefinitely. The splash is
   * released after a minimum display time so the brand does not flash past.
   *
   * Releasing is unconditional: the splash is a full-viewport overlay, so if
   * anything here rejected, the body would keep the is-booting class and the
   * overlay would sit on top of the dashboard for good. Both outcomes run done().
   */
  function runSplash() {
    var health = fetch('/health').then(function (response) {
      if (!response.ok) throw new Error('unreachable');
      return response.json();
    }).then(function (body) {
      setGatewayStatus(true, body.status === 'degraded' ? 'Degraded' : 'Gateway connected');
    }).catch(function () {
      setGatewayStatus(false, 'Gateway unreachable');
    });

    var release = new Promise(function (resolve) { bootTimer = setTimeout(resolve, BOOT_MS); });
    var done = function () {
      document.body.classList.remove('is-booting');
      // Out of the accessibility tree as well as out of the box: the splash is
      // a full-viewport overlay and a screen reader must not keep announcing it.
      var splash = byId('splash');
      if (splash) splash.setAttribute('aria-hidden', 'true');
    };
    return Promise.all([health, release]).then(done, done);
  }

  /** One delegated click handler for every in-app navigation affordance. */
  function bindNavigation() {
    document.addEventListener('click', function (event) {
      var target = event.target.closest('[data-route]');
      if (target) {
        // Modified clicks fall through to the browser so middle-click and
        // "open in new tab" keep working on the real anchors.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (event.button !== 0) return;
        event.preventDefault();
        var route = target.getAttribute('data-route');
        if (route) navigate(route);
        return;
      }

      // Everything else declares its intent with data-action: the hub's quick
      // actions and settings rows, plus the inline controls rendered per row.
      var actionNode = event.target.closest('[data-action]');
      if (!actionNode) return;
      var action = actionNode.getAttribute('data-action');
      if (action === 'sign-out') {
        signOut();
        return;
      }
      if (action === 'open-notifications') {
        renderNotifications();
        openSheet();
        return;
      }
      if (action === 'toggle') {
        var target2 = findDevice(actionNode.getAttribute('data-device-id'));
        if (target2) toggleDevice(target2.device_id, actionNode.getAttribute('data-active') !== 'false', actionNode);
        return;
      }
      if (action === 'cancel') {
        cancelWithdrawal(actionNode.getAttribute('data-withdrawal-id'), actionNode);
      }
    });
  }

  function bindScreens() {
    byId('login-form').addEventListener('submit', function (event) {
      event.preventDefault();
      formFeedback('login-feedback', '');
      var username = byId('username');
      var key = byId('key');
      var userOk = username.value.trim().length > 0;
      var keyOk = key.value.trim().length > 0;
      markField('username', !userOk);
      markField('password', !keyOk);
      if (!userOk || !keyOk) {
        formFeedback('login-feedback', 'Enter your administrator username and password.', 'error');
        return;
      }
      // The click is acknowledged immediately: disabled button, spinner and a
      // "Signing in..." label, so a slow round-trip never reads as a dead page.
      setLoginPending(true);
      // The credentials are checked on their own before any data is requested,
      // so a refused password can never be confused with an unreachable backend.
      signIn().then(function (result) {
        if (!result.ok) {
          formFeedback('login-feedback', result.message, 'error');
          setGatewayStatus(false, 'Offline');
          setLoginPending(false);
          return;
        }
        // Only now is the dashboard fetched. If the datastore is down the
        // operator is already signed in, and load() reports that as a server
        // error rather than as a failed sign-in.
        return load().then(function () {
          if (state.unlocked) navigate('home');
        });
      });
    });

    byId('refresh').addEventListener('click', function () { load(); });
    byId('key').addEventListener('keydown', function (event) {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      byId('login-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    // Show/hide the password. The key stays in the same input either way.
    byId('key-toggle').addEventListener('click', function () {
      var input = byId('key');
      var reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      byId('key-field').classList.toggle('is-revealed', reveal);
      byId('key-toggle').setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
      input.focus();
    });

    byId('back').addEventListener('click', function () {
      navigate(this.getAttribute('data-route') || 'home');
    });
    byId('notifications').addEventListener('click', function () { renderNotifications(); openSheet(); });
    byId('admin-menu').addEventListener('click', function () { navigate('profile'); });
    byId('notif-close').addEventListener('click', closeSheet);
    byId('notif-scrim').addEventListener('click', closeSheet);
    byId('logout').addEventListener('click', signOut);
    byId('open-send').addEventListener('click', function () { navigate('send'); });

    // Escape closes the notification sheet, matching the other overlays.
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      closeSheet();
      Object.keys(MENUS).forEach(function (key) { setMenuOpen(key, false); });
    });
  }

  function bindLedger() {
    byId('txn-search').addEventListener('input', function () {
      state.txnSearch = this.value.trim().toLowerCase();
      renderTransactions();
    });
    byId('txn-tabs').addEventListener('click', function (event) {
      var tab = event.target.closest('[data-filter]');
      if (!tab) return;
      state.txnFilter = tab.getAttribute('data-filter');
      Array.prototype.forEach.call(this.querySelectorAll('[data-filter]'), function (node) {
        var active = node === tab;
        node.classList.toggle('is-active', active);
        node.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      renderTransactions();
    });
    byId('device-search').addEventListener('input', function () {
      state.deviceSearch = this.value.trim().toLowerCase();
      renderDevices();
    });
    byId('devices').addEventListener('click', function (event) {
      var row = event.target.closest('[data-device-id]');
      if (!row) return;
      var device = findDevice(row.getAttribute('data-device-id'));
      if (!device) return;
      state.selectedDevice = device;
      navigate('device');
    });
    byId('toggle-device').addEventListener('click', function () {
      var device = state.selectedDevice;
      if (!device) return;
      toggleDevice(device.device_id, !device.active_status, this);
    });
    byId('restart-device').addEventListener('click', function () {
      var device = state.selectedDevice;
      if (!device) return;
      restartDevice(device.device_id, this);
    });
    byId('notify-toggle').addEventListener('click', function () {
      state.notifications = !state.notifications;
      this.setAttribute('aria-checked', state.notifications ? 'true' : 'false');
      notify(state.notifications ? 'Push alerts enabled.' : 'Push alerts muted.');
    });
  }

  function bindForm() {
    byId('withdrawal-form').addEventListener('submit', handleSubmit);
    bindMenu('channel', setChannel);
    bindMenu('target', setTargetDevice);
    document.addEventListener('click', function () {
      Object.keys(MENUS).forEach(function (key) { setMenuOpen(key, false); });
    });
    // A quick amount chip fills the field; typing in the field re-highlights it.
    byId('amount-chips').addEventListener('click', function (event) {
      var chip = event.target.closest('[data-amount]');
      if (!chip) return;
      var field = byId('amount');
      field.value = chip.getAttribute('data-amount');
      syncChips(field.value);
      markField('amount', false);
      field.focus();
    });
    byId('amount').addEventListener('input', function () {
      syncChips(this.value);
      markField('amount', false);
    });
  }

  function init() {
    bindNavigation();
    bindScreens();
    bindLedger();
    bindForm();

    tickClock();
    setInterval(tickClock, 1000);

    // Paint the screen the operator actually requested. Every route is served
    // the same shell, so a hard refresh on /admin/devices lands on Devices.
    state.route = currentRoute();
    applyRoute(state.route, false);

    runSplash();

    setInterval(function () {
      if (state.unlocked && document.visibilityState === 'visible') load();
    }, REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
`;

/** Admin app client, part 7: data loading, device actions and the session. */
export const CLIENT_APP = `
  function setLoading(loading) {
    state.loading = loading;
    var refresh = byId('refresh');
    if (refresh) {
      refresh.disabled = loading;
      refresh.classList.toggle('spin', loading);
    }
    var unlock = byId('unlock');
    if (unlock) unlock.disabled = loading;
  }

  /**
   * Skeletons for the opening paint.
   *
   * A cold database can take a moment, so the numbers and lists paint
   * shimmering placeholders rather than flashing zeros. Turning them off
   * re-renders from the last known data, so a failed load shows the honest
   * empty state instead of leaving shimmer bars on screen.
   */
  function setSkeletons(on) {
    ['balance', 'cash', 'withdrawals', 'active-devices', 'today-txns'].forEach(function (id) {
      var node = byId(id);
      if (!node) return;
      node.classList.toggle('skel', on);
      if (on) node.textContent = '';
    });
    var placeholders = '<div class="skel skel-card"></div><div class="skel skel-card"></div><div class="skel skel-card"></div>';
    ['devices', 'txns', 'recent'].forEach(function (id) {
      var node = byId(id);
      if (!node) return;
      if (on) node.innerHTML = placeholders;
    });
    if (!on) { renderDevices(); renderTransactions(); renderRecent(); }
  }

  /**
   * Loads everything the signed-in app shows.
   *
   * The cash-in feed comes from the SMS the handsets forwarded: a CREDIT
   * message is money arriving on a device's SIM. It is deliberately kept out of
   * the payout ledger, which is the platform's own record of money it sent.
   */
  /**
   * Credential check for the sign-in form.
   *
   * Asked before anything is loaded, so the answer depends on the typed
   * credentials alone. The console used to discover a valid password by calling
   * /api/admin/overview, which meant a database or Redis outage produced the
   * same 500 as a wrong password - the operator was told their key was bad when
   * it was in fact correct. This call cannot fail for that reason.
   *
   * The credentials still travel as the usual headers; the empty body is only
   * there because Fastify rejects a JSON content-type with no payload.
   */
  function signIn() {
    return api('/api/admin/login', { method: 'POST', body: '{}' }).then(function () {
      return { ok: true };
    }).catch(function (error) {
      return { ok: false, message: authMessage(error) };
    });
  }

  function load() {
    if (state.loading) return Promise.resolve();
    if (!byId('key').value.trim()) {
      formFeedback('login-feedback', 'Enter your admin password to continue.', 'error');
      return Promise.resolve();
    }
    var firstPaint = state.firstLoad;
    setLoading(true);
    if (firstPaint) setSkeletons(true);

    return Promise.all([
      api('/api/admin/overview'),
      api('/api/admin/devices'),
      api('/api/admin/transactions?limit=200'),
      api('/api/admin/sms?limit=100').catch(function () { return { events: [] }; })
    ]).then(function (responses) {
      // A degraded read still answers 200 with an empty collection, so the
      // numbers on screen are placeholders rather than measurements. Marking the
      // gateway offline and saying so keeps an operator from reading "no money
      // moved" when the truth is "the database could not be reached" - the
      // difference that matters when the next action is approving a payout.
      var degraded = responses.filter(function (r) { return r && r.degraded; });
      if (degraded.length) {
        setGatewayStatus(false, 'Data unavailable');
        notify('Gateway data unavailable: some figures could not be loaded.', 'error');
      }
      state.degraded = degraded.length > 0;

      state.devices = responses[1].devices || [];
      state.transactions = responses[2].transactions || [];
      state.cashIns = (responses[3].events || []).filter(function (event) {
        return String(event.direction).toUpperCase() === 'CREDIT';
      }).map(function (event) {
        return {
          transaction_id: event.id,
          destination: event.counterparty || event.sender || 'Cash-in',
          amount: event.amount || '0',
          currency: 'ETB',
          status: 'CREDIT',
          device_id: event.device_id,
          device_model: null,
          created_at: event.received_at || event.created_at
        };
      });

      renderHome(responses[0].overview);
      renderDevices();
      renderTransactions();
      renderRecent();
      renderNotifications();
      renderTargetOptions();

      state.firstLoad = false;
      state.unlocked = true;
      document.body.classList.add('unlocked');
      document.body.classList.remove('is-locked');
      // The login card is a fixed overlay above the app; hiding it from the
      // accessibility tree as well as the box keeps it from stealing focus or
      // being announced once the dashboard is live.
      var loginCard = byId('login');
      if (loginCard) loginCard.setAttribute('aria-hidden', 'true');
      setUsername();
      applyRoute(state.route, false);
      openEventStream();
    }).catch(function (error) {
      // A refused password, an unconfigured deployment and a dead network are
      // three different problems that used to collapse into one catch-all line.
      // authMessage keeps them apart so the operator knows what to change.
      var message = authMessage(error);
      if (!state.unlocked) {
        state.unlocked = false;
        document.body.classList.remove('unlocked');
        // The stream is authenticated with the same key, so it is no longer
        // trustworthy once that key is refused.
        closeEventStream();
      }
      setGatewayStatus(false, 'Offline');
      // The floating toast sits at z-index 90 and the login overlay at 95, so a
      // toast raised while the operator is still locked is painted underneath it
      // and never seen - precisely when they most need to read it. Failures that
      // happen before sign-in are therefore reported in the login form itself;
      // a failure after sign-in is a background refresh and does use the toast.
      if (state.unlocked) notify(message, 'error');
      else formFeedback('login-feedback', message, 'error');
    }).then(function () {
      // Skeletons are only for the opening paint; leaving them up after a
      // failure would hide the empty states behind shimmer bars.
      if (firstPaint) setSkeletons(false);
      setLoading(false);
      // Always clears the busy state, so a failed attempt leaves the button
      // ready to be pressed again.
      setLoginPending(false);
    });
  }


  /** Fetches the one extra dataset a specific screen needs. */
  function loadScreenData(route) {
    if (!state.unlocked) return Promise.resolve();
    if (route === 'profile') {
      return api('/api/admin/settings').then(function (data) {
        renderSettings(data.settings);
      }).catch(function (error) {
        notify(error && error.message ? error.message : 'Unable to load gateway settings.', 'error');
      });
    }
    if (route === 'device' && state.selectedDevice) renderDeviceDetail(state.selectedDevice.device_id);
    return Promise.resolve();
  }

  function setUsername() {
    var field = byId('username');
    var name = field && field.value.trim() ? field.value.trim() : 'admin';
    setText('greeting', 'Hello, ' + name);
    setText('profile-name', name);
    setText('account-username', name);
    var avatar = byId('admin-menu');
    if (avatar) avatar.textContent = name.slice(0, 2).toUpperCase();
  }

  function toggleDevice(deviceId, nextActive, button) {
    if (button) button.disabled = true;
    return api('/api/admin/devices/' + encodeURIComponent(deviceId), {
      method: 'PATCH',
      body: JSON.stringify({ activeStatus: nextActive })
    }).then(function () {
      notify(nextActive ? 'Device reactivated for gateway access.' : 'Device blocked from claiming withdrawals.');
      return load();
    }).catch(function (error) {
      notify(error && error.message ? error.message : 'Unable to update device status.', 'error');
    }).then(function () {
      if (button) button.disabled = false;
    });
  }

  /**
   * Restarting a phone is a request, not a remote reboot.
   *
   * The server re-arms the device by clearing its registration so the handset
   * re-registers on its next poll; there is no push channel to the device, so
   * the UI says "re-arm" rather than claiming the phone rebooted.
   */
  function restartDevice(deviceId, button) {
    if (button) button.disabled = true;
    return api('/api/admin/devices/' + encodeURIComponent(deviceId) + '/restart', { method: 'POST' })
      .then(function () {
        notify('Restart requested. The device re-arms on its next poll.');
        return load();
      })
      .catch(function (error) {
        notify(error && error.message ? error.message : 'Unable to restart the device.', 'error');
      })
      .then(function () {
        if (button) button.disabled = false;
      });
  }

  /**
   * Cancelling a queued payout releases the reserved balance, so the cancel is
   * confirmed by the server state machine rather than forced client-side. The
   * button disables while the request is in flight and the queue refreshes.
   */
  function cancelWithdrawal(id, button) {
    if (button) button.disabled = true;
    return api('/api/admin/withdrawals/' + encodeURIComponent(id) + '/cancel', { method: 'POST' })
      .then(function (result) {
        var reference = result && result.withdrawal ? result.withdrawal.transaction_id : id;
        notify('Withdrawal ' + reference + ' cancelled and the reserved balance released.');
        return load();
      })
      .catch(function (error) {
        notify(error && error.message ? error.message : 'Unable to cancel the withdrawal.', 'error');
        if (button) button.disabled = false;
      });
  }

  /**
   * Signs out.
   *
   * The key is cleared from the form, the event stream is aborted and the app
   * is locked again. Nothing was written to storage on the way in, so there is
   * nothing to clear on the way out.
   */
  function signOut() {
    closeEventStream();
    closeSheet();
    state.unlocked = false;
    state.firstLoad = true;
    state.devices = [];
    state.transactions = [];
    state.cashIns = [];
    state.selectedDevice = null;
    var key = byId('key');
    if (key) key.value = '';
    document.body.classList.add('is-locked');
    document.body.classList.remove('unlocked');
    // Signing out brings the card back, so it has to leave the hidden state too
    // or the operator would be locked out of a login form nobody can see.
    var loginCard = byId('login');
    if (loginCard) loginCard.setAttribute('aria-hidden', 'false');
    setGatewayStatus(true, 'Online');
  }
`;

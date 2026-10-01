/** Admin console client, part 6: submission, data loading and event wiring. */
export const CLIENT_APP = `
  function toggleDevice(deviceId, nextActive, button) {
    button.disabled = true;
    return api('/api/admin/devices/' + encodeURIComponent(deviceId), { method: 'PATCH', body: JSON.stringify({ activeStatus: nextActive }) }).then(function () {
      notify(nextActive ? 'Device reactivated for gateway access.' : 'Device blocked from claiming withdrawals.');
      return load({ silent: true });
    }).catch(function (error) {
      notify(error && error.message ? error.message : 'Unable to update device status.', 'error');
    }).then(function () {
      button.disabled = false;
    });
  }

  function markField(name, invalid) {
    var group = document.querySelector('[data-field="' + name + '"]');
    if (group) group.classList.toggle('has-error', Boolean(invalid));
  }

  /** Client-side checks mirror the server schema for fast feedback only. */
  function validateWithdrawal(phone, amount) {
    var phoneOk = /^[0-9+\\-\\s()]{6,64}$/.test(phone);
    var amountOk = isFinite(amount) && amount > 0;
    markField('phone', !phoneOk);
    markField('amount', !amountOk);
    return phoneOk && amountOk;
  }

  function setSubmitting(submitting) {
    var submit = byId('submit-withdrawal');
    if (!submit) return;
    // Capture the server-rendered button once, then swap the inner markup so the
    // busy state gets a real spinner instead of poking at a text node.
    if (submitMarkup === null) submitMarkup = submit.innerHTML;
    submit.disabled = submitting;
    submit.classList.toggle('is-busy', submitting);
    submit.innerHTML = submitting
      ? SVG_LOADER + '<span>Sending withdrawal...</span>'
      : submitMarkup;
  }

  function handleSubmit(event) {
    event.preventDefault();
    formFeedback('');
    var form = event.target;
    var phone = byId('phone').value.trim();
    var amount = Number(byId('amount').value);
    if (!validateWithdrawal(phone, amount)) {
      formFeedback('Provide a destination phone number and an amount above zero.', 'error');
      return;
    }

    var payload = {
      destinationPhone: phone,
      amount: amount,
      channel: state.channel,
      notes: byId('notes').value.trim() || undefined,
      targetDeviceId: state.targetDevice
    };

    setSubmitting(true);
    api('/api/admin/withdrawals', { method: 'POST', body: JSON.stringify(payload) }).then(function (result) {
      var reference = result && result.withdrawal ? result.withdrawal.transaction_id : 'unknown';
      var target = state.targetDevice === ANY_TARGET ? null : findDevice(state.targetDevice);
      form.reset();
      setChannel('TELEBIRR');
      markField('phone', false);
      markField('amount', false);
      formFeedback('Withdrawal ' + reference + ' queued ' + (target ? 'for ' + (target.phone_model || target.device_id) + '.' : 'for auto-assignment.'), 'success');
      notify('Withdrawal ' + reference + ' queued.');
      state.page = 1;
      return load({ silent: true });
    }).catch(function (error) {
      var message = error && error.message ? error.message : 'Unable to create the withdrawal.';
      formFeedback(message, 'error');
      notify(message, 'error');
      if (message.toLowerCase().indexOf('device') !== -1) return load({ silent: true });
    }).then(function () {
      setSubmitting(false);
    });
  }

  function setLoading(loading) {
    state.loading = loading;
    document.body.classList.toggle('is-loading', loading);
    var refresh = byId('refresh');
    if (refresh) {
      refresh.disabled = loading;
      refresh.classList.toggle('spin', loading);
    }
    var unlock = byId('unlock');
    if (unlock) unlock.disabled = loading;
    var submit = byId('submit-withdrawal');
    if (submit && loading) submit.classList.add('is-busy');
  }

  function load(options) {
    var silent = Boolean(options && options.silent);
    if (state.loading) return Promise.resolve();
    if (!byId('key').value.trim()) {
      notify('Enter your admin API key to open the console.', 'error');
      byId('key').focus();
      return Promise.resolve();
    }
    var wasUnlocked = state.unlocked;
    var firstPaint = state.firstLoad;
    setLoading(true);
    if (firstPaint) setSkeletons(true);
    return Promise.all([
      api('/api/admin/overview'),
      api('/api/admin/devices'),
      api('/api/admin/transactions')
    ]).then(function (responses) {
      renderMetrics(responses[0].overview, state.firstLoad);
      renderDevices(responses[1].devices || []);
      renderTransactions(responses[2].transactions || []);
      renderNotifications();
      state.firstLoad = false;
      state.unlocked = true;
      document.body.classList.add('unlocked');
      // Unlocking must enable the section the operator is actually on, not just
      // the dashboard panels.
      loadView(state.route);
      if (!silent || !wasUnlocked) {
        notify(wasUnlocked ? 'Console synced with live gateway data.' : 'Console unlocked. Live settlement data is streaming.');
      }
    }).catch(function (error) {
      var message = error && error.message ? error.message : 'Unable to reach the gateway.';
      if (message === 'Admin authentication required') {
        message = 'Admin key rejected. Check the ADMIN_API_KEY value.';
        state.unlocked = false;
        document.body.classList.remove('unlocked');
      }
      setGatewayStatus(false, 'System Offline');
      notify(message, 'error');
    }).then(function () {
      // Skeletons are only for the opening paint; leaving them up after a
      // failure would hide the empty states behind shimmer bars.
      if (firstPaint) setSkeletons(false);
      setLoading(false);
    });
  }
`;
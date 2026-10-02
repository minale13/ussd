/** Admin app client, part 5: target selection, phone formatting and dispatch. */
export const CLIENT_SUBMIT = `
  function setChannel(value) {
    state.channel = value;
    setText('channel-value', CHANNEL_LABELS[value] || value);
    var dot = byId('channel-dot');
    if (dot) dot.className = 'channel-dot ' + (value === 'CBE' ? 'cbe' : 'telebirr');
    markMenuSelection('channel', value);
  }

  function setTargetDevice(value) {
    var device = value && value !== ANY_TARGET ? findDevice(value) : null;
    // A blocked phone cannot claim a targeted payout, so a blocked selection
    // falls back to auto-assignment rather than posting a request the server
    // would reject with 409.
    if (device && !device.active_status) device = null;
    state.targetDevice = device ? device.device_id : ANY_TARGET;
    var activeCount = state.devices.filter(function (item) { return item.active_status; }).length;
    setText('target-value', device ? (device.phone_model || device.device_id) : 'Any available device');
    var dot = byId('target-dot');
    if (dot) dot.className = 'channel-dot ' + (device ? 'device' : 'auto');
    var badge = byId('target-badge');
    if (badge) {
      badge.className = 'mini-badge ' + (device ? 'active' : 'auto');
      badge.textContent = device ? 'Pinned' : 'Auto';
    }
    setText('send-target-count', device ? 'Pinned' : 'Auto');
    var note = byId('target-note');
    if (note) {
      note.textContent = device
        ? 'Will run on ' + device.device_id
        : state.devices.length ? activeCount + ' of ' + state.devices.length + ' devices active' : 'No devices registered yet';
      note.classList.toggle('is-live', activeCount > 0);
    }
    markMenuSelection('target', state.targetDevice);
  }

  function renderTargetOptions() {
    var menu = byId('target-menu');
    if (!menu) return;
    var options = ['<li class="option" role="option" tabindex="0" data-value="' + ANY_TARGET + '" aria-selected="false">' +
      '<span class="channel-dot auto"></span>' +
      '<span class="option-copy"><strong>Any Available Device</strong><small>Auto-assign &#183; the first device to poll claims it</small></span>' +
      '<span class="mini-badge auto">Auto</span>' +
      '<span class="check">' + SVG_CHECK + '</span></li>'];
    state.devices.forEach(function (device) {
      var active = Boolean(device.active_status);
      options.push('<li class="option" role="option" tabindex="0" data-value="' + escapeHtml(device.device_id) + '" aria-disabled="' + (active ? 'false' : 'true') + '" aria-selected="false">' +
        '<span class="channel-dot ' + (active ? 'device' : 'offline') + '"></span>' +
        '<span class="option-copy"><strong>' + escapeHtml(device.phone_model || 'Unknown model') + '</strong><small>' + escapeHtml(device.device_id) + '</small></span>' +
        '<span class="mini-badge ' + (active ? 'active' : 'auto') + '">' + (active ? 'Active' : 'Blocked') + '</span>' +
        '<span class="check">' + SVG_CHECK + '</span></li>');
    });
    menu.innerHTML = options.join('');
    setTargetDevice(state.targetDevice);
  }

  function markField(name, invalid) {
    var group = document.querySelector('[data-field="' + name + '"]');
    if (group) group.classList.toggle('has-error', Boolean(invalid));
  }

  /**
   * Normalises what the operator typed into E.164 for Ethiopia.
   *
   * Local forms (09…, 07…, 9…, 7…) become +2519… / +2517…, an already
   * international number is left alone, and anything else is returned as typed
   * so the server's own validation stays the final word.
   */
  function normalisePhone(raw) {
    var value = String(raw || '').trim();
    if (!value) return '';
    if (/^\\+251\\d{9}$/.test(value)) return value;
    var digits = value.replace(/[\\s()-]/g, '');
    if (/^251\\d{9}$/.test(digits)) return '+' + digits;
    if (/^0[79]\\d{8}$/.test(digits)) return '+251' + digits.slice(1);
    if (/^[79]\\d{8}$/.test(digits)) return '+251' + digits;
    return value;
  }

  /** Client-side checks mirror the server schema for fast feedback only. */
  function validateWithdrawal(phone, amount) {
    var phoneOk = /^\\+251\\d{9}$/.test(phone);
    var amountOk = isFinite(amount) && amount > 0;
    markField('phone', !phoneOk);
    markField('amount', !amountOk);
    return phoneOk && amountOk;
  }

  /** Highlights the quick-amount chip matching whatever is in the field. */
  function syncChips(value) {
    var numeric = String(value || '').replace(/[^\\d.]/g, '');
    Array.prototype.forEach.call(document.querySelectorAll('#amount-chips .chip'), function (chip) {
      chip.classList.toggle('is-active', chip.getAttribute('data-amount') === numeric);
    });
  }


  function setSubmitting(submitting) {
    var submit = byId('submit-withdrawal');
    if (!submit) return;
    // Capture the server-rendered button once, then swap the inner markup so the
    // busy state gets a real spinner instead of poking at a text node.
    if (submitMarkup === null) submitMarkup = submit.innerHTML;
    submit.disabled = submitting;
    submit.classList.toggle('is-busy', submitting);
    submit.innerHTML = submitting ? SVG_LOADER + '<span>Sending...</span>' : submitMarkup;
  }

  function handleSubmit(event) {
    event.preventDefault();
    formFeedback('form-feedback', '');
    var form = event.target;
    var phoneField = byId('phone');
    var phone = normalisePhone(phoneField ? phoneField.value : '');
    if (phoneField && phoneField.value.trim() !== phone) phoneField.value = phone;
    var amount = Number(byId('amount').value);
    if (!validateWithdrawal(phone, amount)) {
      formFeedback('form-feedback', 'Provide a valid Ethiopian phone number (+2519…) and an amount above zero.', 'error');
      return;
    }

    var notes = byId('notes');
    var payload = {
      destinationPhone: phone,
      amount: amount,
      channel: state.channel,
      notes: notes && notes.value.trim() ? notes.value.trim() : undefined,
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
      syncChips('');
      formFeedback('form-feedback', 'Withdrawal ' + reference + ' queued ' + (target ? 'for ' + (target.phone_model || target.device_id) + '.' : 'for auto-assignment.'), 'success');
      notify('Withdrawal ' + reference + ' queued.');
      return load({ silent: true });
    }).catch(function (error) {
      var message = error && error.message ? error.message : 'Unable to create the withdrawal.';
      formFeedback('form-feedback', message, 'error');
      notify(message, 'error');
    }).then(function () {
      setSubmitting(false);
    });
  }
`;

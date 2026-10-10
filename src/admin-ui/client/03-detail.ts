/** Admin app client, part 3: device detail, notifications and settings. */
export const CLIENT_DETAIL = `
  function findDevice(deviceId) {
    var match = null;
    state.devices.forEach(function (device) {
      if (device.device_id === deviceId) match = device;
    });
    return match;
  }

  /**
   * Device detail screen.
   *
   * Everything here comes from the fleet row the operator tapped, so the screen
   * never fabricates a value: a phone that has not reported an IP address shows
   * "Not reported" rather than a placeholder address, and a device with no
   * battery reading degrades to an em dash exactly as the fleet row does.
   */
  function renderDeviceDetail(deviceId) {
    var device = findDevice(deviceId) || state.selectedDevice;
    state.selectedDevice = device || null;
    if (!device) return;

    var active = Boolean(device.active_status);
    var isOnline = Boolean(device.online);
    setText('detail-name', device.phone_model || 'Unknown model');
    setText('detail-id', device.device_id);

    var pill = byId('detail-pill');
    if (pill) {
      pill.className = 'pill ' + (!active ? 'blocked' : isOnline ? 'online' : 'offline');
      pill.innerHTML = '<span class="dot"></span>' + (!active ? 'Blocked' : isOnline ? 'Online' : 'Offline');
    }
    var network = byId('detail-network');
    if (network) network.outerHTML = networkCell(device.network_type).replace('<span class="net', '<span id="detail-network" class="net');
    setText('detail-network-type', device.network_type || 'Not reported');
    setText('detail-sim', (device.channel ? (CHANNEL_LABELS[device.channel] || device.channel) + ' / ' : '') + simText(device));
    setText('detail-last-seen', timeAgo(device.last_seen_at));
    setText('detail-ip', device.last_ip || 'Not reported');
    setText('detail-version', device.app_version || 'Not reported');

    var battery = byId('detail-battery');
    if (battery) battery.outerHTML = batteryCell(device.battery_level, true).replace('<div class="battery', '<div id="detail-battery" class="battery');

    var toggle = byId('toggle-device');
    if (toggle) {
      toggle.innerHTML = active
        ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/></svg><span>Block device</span>'
        : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg><span>Unblock device</span>';
    }

    renderBankToggles(device);
  }

  /**
   * The set of banks a device currently has switched on.
   *
   * Mirrors the server's `resolveEnabledBanks`: a device configured with an
   * explicit `enabled_banks` list is limited to exactly that set; a device that
   * predates the toggles falls back to its single legacy `channel` (the `CBE`
   * label read as CBE Birr) so an un-migrated phone keeps working. An empty
   * result means "not configured yet", which the switches show as all-off until
   * an operator makes a choice.
   */
  function enabledBanksOf(device) {
    var raw = device && device.enabled_banks;
    var list = raw;
    if (typeof list === 'string') {
      try { list = JSON.parse(list); } catch (error) { list = null; }
    }
    if (list && list.length) {
      return list.map(function (code) {
        return String(code).toUpperCase() === 'CBE' ? 'CBEBIRR' : String(code).toUpperCase();
      });
    }
    if (device && device.channel) {
      return [String(device.channel).toUpperCase() === 'CBE' ? 'CBEBIRR' : String(device.channel).toUpperCase()];
    }
    return [];
  }

  /**
   * Renders the per-device bank switches into the device detail screen.
   *
   * Each row is a real iOS-style switch (role="switch", aria-checked) so it is
   * reachable by keyboard and announced by a screen reader. A bank with no USSD
   * flow yet is rendered but disabled, with a short note, so an operator can see
   * it exists without being able to enable something the handset cannot run.
   */
  function renderBankToggles(device) {
    var host = byId('bank-toggles');
    if (!host) return;
    var on = enabledBanksOf(device);
    host.innerHTML = BANKS.map(function (bank) {
      var checked = on.indexOf(bank.code) !== -1;
      var disabled = !bank.executable;
      return '<div class="row bank-row">' +
        '<span class="row-label"><span>' + escapeHtml(bank.label) + '</span>' +
          (disabled ? '<span class="row-note">No USSD flow yet</span>' : '') + '</span>' +
        '<button class="switch bank-switch" type="button" role="switch" data-bank="' + bank.code + '"' +
          ' aria-checked="' + (checked ? 'true' : 'false') + '"' + (disabled ? ' disabled' : '') +
          ' aria-label="' + escapeHtml(bank.label) + ' payouts"></button>' +
      '</div>';
    }).join('');
    setText('bank-count', on.length + (on.length === 1 ? ' on' : ' on'));
  }

  /**
   * Notification feed.
   *
   * Three real sources, no synthesised events: unsettled payouts, phones that
   * are offline or blocked, and phones reporting a low battery. Each row is
   * timestamped from the data the API returned, and the count drives the badge.
   */
  function buildNotifications() {
    var items = [];
    state.transactions.forEach(function (row) {
      var status = String(row.status || '').toUpperCase();
      if (status !== 'PENDING' && status !== 'PROCESSING' && status !== 'FAILED') return;
      items.push({
        tone: status === 'FAILED' ? 'danger' : 'blue',
        title: status === 'FAILED' ? 'Payout failed' : 'Payout awaiting settlement',
        body: money(row.amount) + ' ETB to ' + (row.destination || 'unknown') + ' · ' + (row.device_id || 'auto-assigned'),
        time: row.created_at
      });
    });
    state.devices.forEach(function (device) {
      if (!device.active_status) {
        items.push({ tone: 'danger', title: 'Device blocked', body: (device.phone_model || device.device_id) + ' cannot claim payouts', time: device.last_seen_at });
      } else if (!device.online) {
        items.push({ tone: 'warn', title: 'Device offline', body: (device.phone_model || device.device_id) + ' has stopped polling', time: device.last_seen_at });
      }
      if (device.battery_level !== null && device.battery_level !== undefined && device.battery_level <= 20) {
        items.push({ tone: 'warn', title: 'Low battery', body: (device.phone_model || device.device_id) + ' at ' + device.battery_level + '%', time: device.last_seen_at });
      }
    });
    items.sort(function (a, b) { return new Date(b.time) - new Date(a.time); });
    return items;
  }


  function renderNotifications() {
    var items = buildNotifications();
    var list = byId('notif-list');
    if (list) {
      list.innerHTML = items.length
        ? items.slice(0, 40).map(function (item) {
            return '<article class="notif">' +
              '<span class="notif-icon ' + item.tone + '">' + (item.tone === 'blue' ? SVG_BELL : SVG_WARN) + '</span>' +
              '<div class="notif-main">' +
                '<div class="notif-title">' + escapeHtml(item.title) + '</div>' +
                '<div class="notif-body">' + escapeHtml(item.body) + '</div>' +
                '<div class="notif-time">' + escapeHtml(timeAgo(item.time)) + '</div>' +
              '</div>' +
            '</article>';
          }).join('')
        : emptyState('No alerts. The gateway is quiet.', SVG_BELL);
    }
    setText('notif-summary', items.length + (items.length === 1 ? ' alert' : ' alerts'));

    var badge = byId('notif-badge');
    if (badge) {
      badge.textContent = String(items.length);
      badge.classList.toggle('has-items', items.length > 0);
    }
    return items;
  }

  function openSheet() {
    var sheet = byId('notif-sheet');
    var scrim = byId('notif-scrim');
    if (sheet) { sheet.classList.add('is-open'); sheet.setAttribute('aria-hidden', 'false'); }
    if (scrim) scrim.classList.add('is-open');
  }

  function closeSheet() {
    var sheet = byId('notif-sheet');
    var scrim = byId('notif-scrim');
    if (sheet) { sheet.classList.remove('is-open'); sheet.setAttribute('aria-hidden', 'true'); }
    if (scrim) scrim.classList.remove('is-open');
  }

  /**
   * App settings.
   *
   * Reads GET /api/admin/settings, which is an explicit allow-list on the
   * server: no credential can reach the browser through this endpoint.
   */
  function renderSettings(settings) {
    var data = settings || {};
    var health = data.health || {};
    setText('settings-badge', data.read_only === false ? 'Writable' : 'Read-only');

    var rows = [
      ['Environment', data.environment || '—'],
      ['Currency', data.currency || '—'],
      ['Channels', (data.channels || []).join(', ') || '—'],
      ['Minimum withdrawal', money(data.min_withdrawal) + ' ETB'],
      ['Maximum withdrawal', money(data.max_withdrawal) + ' ETB'],
      ['Worker concurrency', String(data.worker_concurrency == null ? '—' : data.worker_concurrency)],
      ['Processing timeout', String(data.processing_timeout_seconds == null ? '—' : data.processing_timeout_seconds) + 's'],
      ['Devices total', String(health.devices_total == null ? '—' : health.devices_total)],
      ['Devices online', String(health.devices_online == null ? '—' : health.devices_online)],
      ['Pending withdrawals', String(health.pending_withdrawals == null ? '—' : health.pending_withdrawals)],
      ['Failed withdrawals', String(health.failed_withdrawals == null ? '—' : health.failed_withdrawals)],
      ['Outbox backlog', String(health.outbox_backlog == null ? '—' : health.outbox_backlog)],
      ['Rejected webhooks', String(health.rejected_webhooks == null ? '—' : health.rejected_webhooks)]
    ];
    var body = byId('settings-body');
    if (body) {
      body.innerHTML = rows.map(function (entry) {
        return '<div class="row"><span class="row-label"><span>' + escapeHtml(entry[0]) +
          '</span></span><span class="row-value">' + escapeHtml(String(entry[1])) + '</span></div>';
      }).join('');
    }
  }
`;

/** Admin console client, part 9: per-view loaders and renderers. */
export const CLIENT_VIEWS = `
  var PAGE_SIZE_VIEWS = 10;

  function textOf(id) {
    var node = byId(id);
    return node ? String(node.value || '').trim().toLowerCase() : '';
  }

  function selectOf(id) {
    var node = byId(id);
    return node ? String(node.value || '') : '';
  }

  function emptyRow(tbodyId, columns, message, glyph) {
    var tbody = byId(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="' + columns + '"><div class="empty-state">' +
      (glyph || SVG_EMPTY) + escapeHtml(message) + '</div></td></tr>';
  }

  function deviceRows(devices) {
    return devices.map(function (device) {
      var active = Boolean(device.active_status);
      var online = Boolean(device.online);
      var seen = new Date(device.last_seen_at);
      var stateLabel = !active ? 'Blocked' : online ? 'Online' : 'Offline';
      var stateTone = !active ? 'blocked' : online ? 'online' : 'offline';
      return '<tr>' +
        '<td data-label="State"><span class="pill ' + stateTone + '"><span class="dot"></span>' + stateLabel + '</span></td>' +
        '<td data-label="Device" class="cell-wide"><div class="device-id">' + escapeHtml(device.device_id) + '</div><div class="device-model">' + escapeHtml(device.phone_model || 'Unknown model') + '</div></td>' +
        '<td data-label="Channel / SIM">' + channelCell(device.channel) + '<div class="sim">' + simText(device) + '</div></td>' +
        '<td data-label="Battery">' + batteryCell(device.battery_level) + '</td>' +
        '<td data-label="Network">' + networkCell(device.network_type) + '</td>' +
        '<td data-label="Last seen"><div class="seen">' + escapeHtml(isNaN(seen.getTime()) ? 'Unknown' : seen.toLocaleString()) + '<small>' + escapeHtml(timeAgo(device.last_seen_at)) + '</small></div></td>' +
        '<td class="td-action cell-action"><button type="button" class="action-btn ' + (active ? 'block' : 'unblock') + '" data-action="toggle" data-device-id="' + escapeHtml(device.device_id) + '" data-active="' + active + '">' + (active ? SVG_BLOCK + 'Block' : SVG_UNBLOCK + 'Unblock') + '</button></td>' +
        '</tr>';
    }).join('');
  }

  /** Renders a plain table body with a client-side filter and pager. */
  function paintTable(options) {
    var rows = options.rows;
    var needle = String(options.needle || '').toLowerCase();
    var filtered = needle
      ? rows.filter(function (row) { return row.__haystack.indexOf(needle) !== -1; })
      : rows;
    var pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_VIEWS));
    var page = Math.min(Math.max(options.page || 1, 1), pages);
    var start = (page - 1) * PAGE_SIZE_VIEWS;
    options.page = page;

    byId(options.countId).textContent = options.count(filtered.length);
    var tbody = byId(options.bodyId);
    if (!filtered.length) { emptyRow(options.bodyId, options.columns, options.empty); return; }
    tbody.innerHTML = filtered.slice(start, start + PAGE_SIZE_VIEWS).map(options.rowHtml).join('');

    if (!options.pagerId) return;
    var pager = byId(options.pagerId);
    if (filtered.length <= PAGE_SIZE_VIEWS) { pager.hidden = true; return; }
    pager.hidden = false;
    byId(options.infoId).innerHTML = 'Showing <strong>' + (start + 1) + '–' +
      Math.min(start + PAGE_SIZE_VIEWS, filtered.length) + '</strong> of <strong>' + filtered.length + '</strong> ' + options.noun;
    var html = '<button type="button" class="pager-btn" data-page="' + (page - 1) + '"' + (page === 1 ? ' disabled' : '') + ' aria-label="Previous page">' + SVG_PREV + '</button>';
    for (var p = 1; p <= pages; p += 1) {
      if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - page) > 1) continue;
      html += '<button type="button" class="pager-btn' + (p === page ? ' is-current' : '') + '" data-page="' + p + '"' + (p === page ? ' aria-current="page"' : '') + '>' + p + '</button>';
    }
    html += '<button type="button" class="pager-btn" data-page="' + (page + 1) + '"' + (page === pages ? ' disabled' : '') + ' aria-label="Next page">' + SVG_ARROW + '</button>';
    byId(options.controlsId).innerHTML = html;
  }

  // ---- Transactions view -------------------------------------------------
  var txnsAll = [];

  function renderTransactionsView() {
    var needle = textOf('txn-all-search');
    paintTable({
      rows: txnsAll,
      needle: needle,
      page: state.txnPage,
      bodyId: 'txn-all',
      countId: 'txn-all-count',
      columns: 7,
      empty: txnsAll.length ? 'No transactions match your filters.' : 'No transactions have been dispatched yet.',
      count: function (n) { return n + (n === 1 ? ' transaction' : ' transactions'); },
      noun: 'transactions',
      pagerId: 'txn-all-pager',
      infoId: 'txn-all-info',
      controlsId: 'txn-all-controls',
      rowHtml: function (row) {
        var status = String(row.status || 'PENDING').toUpperCase();
        var device = row.device_id
          ? '<div class="txn-device"><span class="name">' + escapeHtml(row.device_model || 'Unknown model') + '</span><span class="id">' + escapeHtml(row.device_id) + '</span></div>'
          : '<div class="txn-device"><span class="unassigned">Unassigned</span></div>';
        return '<tr>' +
          '<td data-label="Reference" class="cell-wide"><div class="txn-id">' + escapeHtml(row.transaction_id || '—') + '</div></td>' +
          '<td data-label="Phone"><div class="txn-phone">' + escapeHtml(row.destination || '—') + '</div></td>' +
          '<td data-label="Amount"><div class="txn-amount">' + money(row.amount) + '<small>' + escapeHtml(row.currency || 'ETB') + '</small></div></td>' +
          '<td data-label="Channel">' + channelCell(row.channel) + '</td>' +
          '<td data-label="Device">' + device + '</td>' +
          '<td data-label="Status"><span class="pill ' + statusTone(status) + '"><span class="dot"></span>' + escapeHtml(status) + '</span></td>' +
          '<td data-label="Created"><div class="seen">' + escapeHtml(new Date(row.created_at).toLocaleString()) + '<small>' + escapeHtml(timeAgo(row.created_at)) + '</small></div></td>' +
          '</tr>';
      }
    });
  }

  // ---- Withdrawals view --------------------------------------------------
  var withdrawalsAll = [];

  function renderWithdrawalsView() {
    var status = selectOf('wd-status');
    var channel = selectOf('wd-channel');
    var needle = textOf('wd-search');
    var rows = withdrawalsAll.filter(function (row) {
      if (status && String(row.status).toUpperCase() !== status) return false;
      if (channel && row.channel !== channel) return false;
      return true;
    });
    paintTable({
      rows: rows,
      needle: needle,
      page: state.wdPage,
      bodyId: 'wd-all',
      countId: 'wd-count',
      columns: 8,
      empty: withdrawalsAll.length ? 'No withdrawals match your filters.' : 'No withdrawals have been dispatched yet.',
      count: function (n) { return n + (n === 1 ? ' withdrawal' : ' withdrawals'); },
      noun: 'withdrawals',
      pagerId: 'wd-pager',
      infoId: 'wd-info',
      controlsId: 'wd-controls',
      rowHtml: function (row) {
        var st = String(row.status || 'PENDING').toUpperCase();
        var device = row.device_id
          ? '<div class="txn-device"><span class="name">' + escapeHtml(row.device_model || 'Unknown model') + '</span><span class="id">' + escapeHtml(row.device_id) + '</span></div>'
          : '<div class="txn-device"><span class="unassigned">Auto-assign</span></div>';
        // Only a queued payout can be cancelled; everything else is settled by
        // the provider, so no button is offered for it.
        var action = st === 'PENDING'
          ? '<button type="button" class="action-btn block" data-action="cancel" data-id="' + escapeHtml(row.id) + '">' + SVG_BLOCK + 'Cancel</button>'
          : '<span class="muted-action">—</span>';
        var reason = row.failure_reason
          ? '<div class="device-model">' + escapeHtml(row.failure_reason) + '</div>'
          : '';
        return '<tr>' +
          '<td data-label="Reference" class="cell-wide"><div class="txn-id">' + escapeHtml(row.transaction_id || '—') + '</div>' + reason + '</td>' +
          '<td data-label="Destination"><div class="txn-phone">' + escapeHtml(row.destination || '—') + '</div></td>' +
          '<td data-label="Amount"><div class="txn-amount">' + money(row.amount) + '<small>' + escapeHtml(row.currency || 'ETB') + '</small></div></td>' +
          '<td data-label="Channel">' + channelCell(row.channel) + '</td>' +
          '<td data-label="Device">' + device + '</td>' +
          '<td data-label="Attempts"><span class="count-chip">' + escapeHtml(String(row.attempt_count || 0)) + '</span></td>' +
          '<td data-label="Status"><span class="pill ' + statusTone(st) + '"><span class="dot"></span>' + escapeHtml(st) + '</span></td>' +
          '<td class="td-action cell-action">' + action + '</td>' +
          '</tr>';
      }
    });
  }

  // ---- Devices view -------------------------------------------------------
  function renderDevicesView() {
    var needle = textOf('dev-search');
    var rows = state.devices;
    var online = rows.filter(function (d) { return Boolean(d.online); }).length;
    setStatValue('dev-stat-total', rows.length);
    setStatValue('dev-stat-online', online);
    setStatValue('dev-stat-offline', Math.max(0, rows.length - online));
    byId('dev-all-count').textContent = online + ' online / ' + rows.length + (rows.length === 1 ? ' device' : ' devices');
    if (!rows.length) { emptyRow('dev-all', 7, 'No devices have polled the gateway yet.'); return; }
    byId('dev-all').innerHTML = deviceRows(rows);
    if (needle) {
      Array.prototype.forEach.call(byId('dev-all').querySelectorAll('tr'), function (row) {
        row.style.opacity = row.textContent.toLowerCase().indexOf(needle) === -1 ? '0.35' : '';
      });
    }
  }

  // ---- Users view ---------------------------------------------------------
  var usersAll = [];

  function renderUsersView() {
    paintTable({
      rows: usersAll,
      needle: textOf('users-search'),
      page: 1,
      bodyId: 'users-all',
      countId: 'users-count',
      columns: 7,
      empty: usersAll.length ? 'No users match your search.' : 'No users have registered yet.',
      count: function (n) { return n + (n === 1 ? ' user' : ' users'); },
      noun: 'users',
      rowHtml: function (row) {
        var role = row.is_admin_user
          ? '<span class="pill online"><span class="dot"></span>Operator</span>'
          : '<span class="pill cancelled"><span class="dot"></span>Standard</span>';
        return '<tr>' +
          '<td data-label="User" class="cell-wide"><div class="device-id">' + escapeHtml(row.email || row.id) + '</div><div class="device-model">' + escapeHtml(row.id) + '</div></td>' +
          '<td data-label="Available"><div class="txn-amount">' + money(row.available_balance) + '</div></td>' +
          '<td data-label="Reserved"><div class="txn-amount">' + money(row.reserved_balance) + '</div></td>' +
          '<td data-label="Currency"><span class="tag telebirr">' + escapeHtml(row.currency || 'ETB') + '</span></td>' +
          '<td data-label="Payouts"><span class="count-chip">' + escapeHtml(String(row.withdrawal_count || 0)) + '</span></td>' +
          '<td data-label="Last payout"><div class="seen">' + escapeHtml(row.last_withdrawal_at ? new Date(row.last_withdrawal_at).toLocaleString() : 'Never') + '</div></td>' +
          '<td class="td-action cell-action">' + role + '</td>' +
          '</tr>';
      }
    });
  }

  // ---- Logs view ----------------------------------------------------------
  var logsAll = [];

  function renderLogsView() {
    var level = selectOf('log-level');
    var rows = level ? logsAll.filter(function (row) { return row.level === level; }) : logsAll;
    paintTable({
      rows: rows,
      needle: textOf('log-search'),
      page: 1,
      bodyId: 'log-all',
      countId: 'log-count',
      columns: 5,
      empty: logsAll.length ? 'No events match your filters.' : 'No gateway activity recorded yet.',
      count: function (n) { return n + (n === 1 ? ' event' : ' events'); },
      noun: 'events',
      rowHtml: function (row) {
        var tone = row.level === 'error' ? 'failed' : row.level === 'warn' ? 'pending' : 'online';
        return '<tr>' +
          '<td data-label="Level"><span class="pill ' + tone + '"><span class="dot"></span>' + escapeHtml(String(row.level || 'info').toUpperCase()) + '</span></td>' +
          '<td data-label="Source"><span class="tag telebirr">' + escapeHtml(String(row.kind || 'event').toUpperCase()) + '</span></td>' +
          '<td data-label="Event" class="cell-wide"><div class="txn-id">' + escapeHtml(String(row.title || '—')) + '</div></td>' +
          '<td data-label="Detail">' + escapeHtml(String(row.detail || '—')) + '</td>' +
          '<td data-label="Created"><div class="seen">' + escapeHtml(new Date(row.created_at).toLocaleString()) + '</div></td>' +
          '</tr>';
      }
    });
  }
// ---- Settings view ------------------------------------------------------
  function renderSettingsView(config) {
    var body = byId('settings-body');
    var badge = byId('settings-badge');
    if (!config) {
      body.innerHTML = '<div class="empty-state">' + SVG_EMPTY + 'Settings are unavailable right now.</div>';
      if (badge) badge.textContent = 'Unavailable';
      return;
    }
    if (badge) badge.textContent = config.read_only ? 'Read-only' : 'Editable';
    var health = config.health || {};
    var currency = config.currency || 'ETB';
    var configRows = [
      ['Environment', config.environment],
      ['Settlement currency', currency],
      ['Channels', (config.channels || []).join(' · ')],
      ['Minimum withdrawal', money(config.min_withdrawal) + ' ' + currency],
      ['Maximum withdrawal', money(config.max_withdrawal) + ' ' + currency],
      ['Worker concurrency', String(config.worker_concurrency)],
      ['Processing timeout', config.processing_timeout_seconds + 's'],
      ['Device online window', config.device_online_window_seconds + 's'],
      ['Local infra fallback', config.local_infra_fallback ? 'Enabled' : 'Disabled']
    ];
    var healthRows = [
      ['Devices online', (health.devices_online || 0) + ' / ' + (health.devices_total || 0)],
      ['Pending withdrawals', String(health.pending_withdrawals || 0)],
      ['Processing withdrawals', String(health.processing_withdrawals || 0)],
      ['Failed withdrawals', String(health.failed_withdrawals || 0)],
      ['Outbox backlog', String(health.outbox_backlog || 0)],
      ['Rejected webhooks', String(health.rejected_webhooks || 0)]
    ];
    function grid(title, entries) {
      return '<div class="settings-panel"><h3 class="settings-h">' + escapeHtml(title) + '</h3><dl class="settings-list">' +
        entries.map(function (entry) {
          return '<div class="settings-row"><dt>' + escapeHtml(String(entry[0])) +
            '</dt><dd>' + escapeHtml(String(entry[1])) + '</dd></div>';
        }).join('') + '</dl></div>';
    }
    body.innerHTML = grid('Configuration', configRows) + grid('Service health', healthRows);
  }

  /**
   * Attaches the lowercase haystack each table filters against, so a single
   * paintTable implementation can serve search for every view.
   */
  function indexRows(rows, fields) {
    return rows.map(function (row) {
      var copy = {};
      for (var key in row) if (Object.prototype.hasOwnProperty.call(row, key)) copy[key] = row[key];
      copy.__haystack = fields.map(function (field) { return String(copy[field] == null ? '' : copy[field]); })
        .join(' ').toLowerCase();
      return copy;
    });
  }

  /**
   * Loads the dataset behind a route. Each view fetches only what it renders,
   * and an already-cached dataset is reused so switching back and forth does not
   * re-hit the API on every click.
   */
  function loadView(route) {
    if (!state.unlocked) return Promise.resolve();
    var loading = byId('view-' + route);
    if (loading) loading.classList.add('is-loading-view');

    var request;
    if (route === 'transactions') {
      request = api('/api/admin/transactions?limit=200').then(function (data) {
        txnsAll = indexRows(data.transactions || [], ['transaction_id', 'destination', 'device_id', 'device_model', 'status', 'channel', 'amount']);
        renderTransactionsView();
      });
    } else if (route === 'withdrawals') {
      request = api('/api/admin/withdrawals?limit=200').then(function (data) {
        withdrawalsAll = indexRows(data.withdrawals || [], ['transaction_id', 'destination', 'device_id', 'device_model', 'status', 'channel', 'amount', 'failure_reason']);
        renderWithdrawalsView();
      });
    } else if (route === 'devices') {
      request = state.devices.length
        ? Promise.resolve(renderDevicesView())
        : api('/api/admin/devices').then(function (data) {
            state.devices = data.devices || [];
            renderDevicesView();
          });
    } else if (route === 'users') {
      request = api('/api/admin/users?limit=200').then(function (data) {
        usersAll = indexRows(data.users || [], ['email', 'id', 'currency', 'available_balance', 'reserved_balance']);
        renderUsersView();
      });
    } else if (route === 'settings') {
      request = api('/api/admin/settings').then(function (data) {
        renderSettingsView(data.settings);
      });
    } else if (route === 'logs') {
      request = api('/api/admin/activity?limit=200').then(function (data) {
        logsAll = indexRows(data.activity || [], ['kind', 'title', 'detail', 'level']);
        renderLogsView();
      });
    } else {
      request = Promise.resolve();
    }

    return request.catch(function (error) {
      var message = error && error.message ? error.message : 'Unable to load this section.';
      notify(message, 'error');
      setGatewayStatus(false, 'System Offline');
    }).then(function () {
      var node = byId('view-' + route);
      if (node) node.classList.remove('is-loading-view');
    });
  }
`;
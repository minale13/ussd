/** Admin app client, part 2: renderers for the home, ledger and fleet screens. */
export const CLIENT_RENDER = `
  // Small inline glyphs the client needs but the server markup does not ship.
  var SVG_PHONE = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h3l1.5 4-2 1.5a10 10 0 0 0 4.5 4.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z"/></svg>';
  var SVG_SIM = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h4.5"/></svg>';
  var SVG_CHEV = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg>';

  function setText(id, value) {
    var node = byId(id);
    if (node) node.textContent = String(value);
  }

  function setStatValue(id, value) {
    var node = byId(id);
    if (node) node.textContent = String(value);
  }

  function onlineCount() {
    return state.devices.filter(function (device) { return Boolean(device.online); }).length;
  }

  /**
   * Home dashboard.
   *
   * The three lifetime totals come from /api/admin/overview. The growth chip is
   * the share of lifetime cash-in that arrived today, which is the only
   * same-unit comparison that response offers - it is never derived from the
   * balance, which would need a historical figure the API does not return.
   */
  function renderHome(overview) {
    state.overview = overview || {};
    var data = state.overview;
    setText('balance', money(data.remaining_balance));
    setText('cash', money(data.total_cash_in));
    setText('withdrawals', money(data.total_withdrawals));

    var cashIn = Number(data.total_cash_in || 0);
    var today = Number(data.cash_in_today || 0);
    var growth = cashIn > 0 ? (today / cashIn) * 100 : 0;
    var trend = byId('balance-trend');
    if (trend) trend.classList.toggle('is-down', today < 0);
    setText('balance-growth', growth.toFixed(2) + '%');
    setText('balance-trend-note', money(today) + ' ETB cashed in today');

    setText('active-devices', onlineCount());
    setText('today-txns', state.transactions.filter(function (row) {
      return isToday(row.created_at);
    }).length);
    setGatewayStatus(true, 'Online');
  }

  function txnIcon(status) {
    if (status === 'COMPLETED') return '<span class="txn-icon">' + SVG_OUT + '</span>';
    if (status === 'FAILED') return '<span class="txn-icon danger">' + SVG_WARN + '</span>';
    return '<span class="txn-icon blue">' + SVG_BELL + '</span>';
  }

  /**
   * One payout as a card. The device tag shows which phone ran it; an
   * auto-assigned payout has no stored owner, so it is labelled as such rather
   * than attributed to an arbitrary device.
   */
  function txnCard(row) {
    var status = String(row.status || 'PENDING').toUpperCase();
    var tag = row.device_id
      ? '<span class="device-tag">' + SVG_PHONE + '<span>' + escapeHtml(row.device_model || row.device_id) + '</span></span>'
      : '<span class="device-tag is-auto">Auto-assigned</span>';
    return '<article class="txn">' +
      txnIcon(status) +
      '<div class="txn-main">' +
        '<div class="txn-top">' +
          '<span class="txn-ref">' + escapeHtml(row.destination || row.transaction_id || '—') + '</span>' +
          '<span class="txn-amount">' + money(row.amount) + '<small>' + escapeHtml(row.currency || 'ETB') + '</small></span>' +
        '</div>' +
        '<div class="txn-meta">' + tag +
          '<span class="pill ' + statusTone(status) + '"><span class="dot"></span>' + escapeHtml(status) + '</span>' +
          '<span class="sep">·</span><span>' + escapeHtml(timeAgo(row.created_at)) + '</span>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  /** Recent activity on the home screen: the newest few payouts. */
  function renderRecent() {
    var list = byId('recent');
    if (!list) return;
    if (!state.transactions.length) {
      list.innerHTML = emptyState('No payouts have been dispatched yet.');
      return;
    }
    list.innerHTML = state.transactions.slice(0, 4).map(txnCard).join('');
  }

  /**
   * Tabs and list for the transactions screen.
   *
   * "Cash-in" is deliberately not a payout: it is money arriving on a device's
   * SIM, reported to the server as a bank SMS. It lives in its own store so the
   * two ledgers can never be confused, and the tab shows an honest empty state
   * until a handset has actually reported one.
   */
  function renderTransactions() {
    var needle = state.txnSearch;
    function matches(row) {
      if (!needle) return true;
      return [row.transaction_id, row.destination, row.status, row.channel, row.device_id, row.device_model, row.amount]
        .join(' ').toLowerCase().indexOf(needle) !== -1;
    }

    var sets = {
      all: state.transactions,
      'cash-in': state.cashIns,
      withdrawal: state.transactions.filter(function (row) { return String(row.status).toUpperCase() !== 'FAILED'; }),
      failed: state.transactions.filter(function (row) { return String(row.status).toUpperCase() === 'FAILED'; })
    };
    Object.keys(sets).forEach(function (key) { setText('tab-count-' + key, sets[key].length); });

    var rows = sets[state.txnFilter] || [];
    var visible = rows.filter(matches);
    var headings = { all: 'All transactions', 'cash-in': 'Cash-in', withdrawal: 'Withdrawals', failed: 'Failed payouts' };
    setText('txn-heading', headings[state.txnFilter] || 'Transactions');
    setText('txn-count', visible.length + (visible.length === 1 ? ' transaction' : ' transactions'));

    var list = byId('txns');
    if (!list) return;
    if (!visible.length) {
      list.innerHTML = emptyState(
        !state.unlocked ? 'Sign in to load transactions.'
          : state.txnSearch ? 'No transactions match your search.'
            : state.txnFilter === 'cash-in' ? 'No cash-in has been reported by a device yet.'
              : 'No payouts have been dispatched yet.');
      return;
    }
    list.innerHTML = visible.map(txnCard).join('');
  }

  /** Fleet counts plus the searchable device list. */
  function renderDevices() {
    var devices = state.devices;
    var online = onlineCount();
    setStatValue('stat-total', devices.length);
    setStatValue('stat-online', online);
    setStatValue('stat-offline', Math.max(0, devices.length - online));
    setText('device-count', online + ' online / ' + devices.length + (devices.length === 1 ? ' device' : ' devices'));

    var list = byId('devices');
    if (!list) return;
    if (!devices.length) {
      list.innerHTML = emptyState(state.unlocked
        ? 'No devices have polled the gateway yet.'
        : 'Sign in to load registered devices.');
      return;
    }

    var needle = state.deviceSearch;
    var rows = needle
      ? devices.filter(function (device) {
          return [device.device_id, device.phone_model, device.channel, device.carrier]
            .join(' ').toLowerCase().indexOf(needle) !== -1;
        })
      : devices;
    if (!rows.length) { list.innerHTML = emptyState('No devices match your search.'); return; }

    list.innerHTML = rows.map(function (device) {
      var active = Boolean(device.active_status);
      var isOnline = Boolean(device.online);
      var label = !active ? 'Blocked' : isOnline ? 'Online' : 'Offline';
      var tone = !active ? 'blocked' : isOnline ? 'online' : 'offline';
      return '<button class="dev-row" type="button" data-device-id="' + escapeHtml(device.device_id) + '">' +
        '<div class="dev-main">' +
          '<div class="dev-top"><span class="dev-name">' + escapeHtml(device.phone_model || 'Unknown model') + '</span>' +
            '<span class="pill ' + tone + '"><span class="dot"></span>' + label + '</span></div>' +
          '<div class="dev-id">' + escapeHtml(device.device_id) + '</div>' +
          '<div class="dev-meta">' +
            '<span class="dev-meta-item">' + SVG_SIM + escapeHtml(simText(device)) + '</span>' +
            batteryCell(device.battery_level) +
            networkCell(device.network_type) +
          '</div>' +
        '</div>' +
        '<span class="dev-chevron">' + SVG_CHEV + '</span>' +
      '</button>';
    }).join('');
  }
`;

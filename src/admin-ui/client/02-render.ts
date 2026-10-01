/** Admin console client, part 2: metric + device fleet renderers. */
export const CLIENT_RENDER = `
  function setAmount(node, value, animate) {
    if (!node) return;
    var target = Number(value || 0);
    if (!animate || !window.requestAnimationFrame) { node.textContent = money(target); return; }
    var started = performance.now();
    function frame(now) {
      var progress = Math.min((now - started) / 700, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = money(target * eased);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function setStatValue(id, value) {
    var node = byId(id);
    if (node) node.textContent = String(value);
  }

  /**
   * Headline figures. The three totals come from /api/admin/overview; the
   * "today" deltas use the optional *_today fields on that same response and
   * fall back to 0.00 when a deployment predates them.
   */
  function renderMetrics(overview, animate) {
    overview = overview || {};
    setAmount(byId('cash'), overview.total_cash_in, animate);
    setAmount(byId('withdrawals'), overview.total_withdrawals, animate);
    setAmount(byId('balance'), overview.remaining_balance, animate);

    Array.prototype.forEach.call(document.querySelectorAll('.stat-delta[data-today]'), function (node) {
      var value = overview[node.getAttribute('data-today')];
      var numeric = Number(value);
      var known = value !== undefined && value !== null && !isNaN(numeric);
      var span = node.querySelector('span');
      if (span) span.textContent = money(known ? numeric : 0);
      node.classList.toggle('is-down', known && numeric < 0);
    });

    var sync = byId('last-sync');
    if (sync) sync.querySelector('span').textContent = 'Synced ' + new Date().toLocaleTimeString();
    setGatewayStatus(true, 'System Online');
  }

  function channelCell(channel) {
    var label = CHANNEL_LABELS[channel] || '—';
    var tone = channel === 'CBE' ? 'cbe' : 'telebirr';
    return '<div class="fleet-channel"><span class="channel-dot ' + tone + '"></span><span class="tag ' + tone + '">' + escapeHtml(label) + '</span></div>';
  }

  /** "SIM 2 · Ethio Telecom" from the slot index the client reported. */
  function simText(device) {
    var parts = [];
    if (device.sim_slot !== null && device.sim_slot !== undefined && device.sim_slot >= 0) {
      parts.push('SIM ' + (Number(device.sim_slot) + 1));
    }
    if (device.carrier) parts.push(device.carrier);
    return parts.length ? escapeHtml(parts.join(' · ')) : '<span class="sim">Unknown SIM</span>';
  }

  /** Battery bar. Level is nullable, and a low charge is called out explicitly. */
  function batteryCell(level) {
    if (level === null || level === undefined) {
      return '<div class="battery"><div class="battery-track"></div><span class="battery-value">—</span></div>';
    }
    var value = Math.max(0, Math.min(100, Number(level)));
    var tone = value <= 15 ? ' critical' : value <= 35 ? ' low' : '';
    return '<div class="battery' + tone + '" title="' + value + '%">' +
      '<div class="battery-track"><div class="battery-fill" style="width:' + value + '%"></div></div>' +
      '<span class="battery-value">' + value + '%</span></div>';
  }

  /** Network generation badge, coloured by how usable it is for a payout. */
  function networkCell(type) {
    if (!type) return '<span class="net down">No data</span>';
    var fast = type === '4G' || type === '5G';
    var slow = type === '3G' || type === '2G';
    var tone = fast ? ' fast' : slow ? ' slow' : ' down';
    return '<span class="net' + tone + '">' + escapeHtml(type) + '</span>';
  }

  function timeAgo(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return 'unknown';
    var seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
    if (seconds < 45) return 'moments ago';
    var minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.round(hours / 24);
    if (days < 30) return days + 'd ago';
    return Math.round(days / 30) + 'mo ago';
  }

  /** Status chip tone for a payout. Unknown states fall back to neutral. */
  function statusTone(status) {
    if (status === 'COMPLETED') return 'settled';
    if (status === 'FAILED') return 'failed';
    if (status === 'PENDING' || status === 'PROCESSING') return 'pending';
    return 'cancelled';
  }
`;
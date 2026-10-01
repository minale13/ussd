/** Admin console client, part 3: device fleet renderer. */
export const CLIENT_FLEET = `
  function renderDevices(devices) {
    var tbody = byId('devices');
    state.devices = devices;
    renderTargetOptions();

    var onlineCount = devices.filter(function (device) { return Boolean(device.online); }).length;
    var offlineCount = Math.max(0, devices.length - onlineCount);

    byId('device-count').textContent = onlineCount + ' online / ' + devices.length +
      (devices.length === 1 ? ' device' : ' devices');

    setStatValue('stat-total', devices.length);
    setStatValue('stat-online', onlineCount);
    setStatValue('stat-offline', offlineCount);

    if (!devices.length) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">' + SVG_EMPTY + 'No devices have polled the gateway yet.</div></td></tr>';
      return;
    }

    var needle = state.search;
    tbody.innerHTML = devices.map(function (device) {
      var active = Boolean(device.active_status);
      var online = Boolean(device.online);
      var seen = new Date(device.last_seen_at);
      var seenText = isNaN(seen.getTime()) ? 'Unknown' : seen.toLocaleString();
      var seenTitle = isNaN(seen.getTime()) ? '' : seen.toISOString();
      var stateLabel = !active ? 'Blocked' : online ? 'Online' : 'Offline';
      var stateTone = !active ? 'blocked' : online ? 'online' : 'offline';
      var haystack = [device.device_id, device.phone_model, device.channel, device.carrier].join(' ').toLowerCase();
      var dim = needle && haystack.indexOf(needle) === -1 ? ' style="opacity:.35"' : '';
      return '<tr' + dim + '>' +
        '<td data-label="State"><span class="pill ' + stateTone + '"><span class="dot"></span>' + stateLabel + '</span></td>' +
        '<td data-label="Device" class="cell-wide"><div class="device-id">' + escapeHtml(device.device_id) + '</div><div class="device-model">' + escapeHtml(device.phone_model || 'Unknown model') + '</div></td>' +
        '<td data-label="Channel / SIM">' + channelCell(device.channel) + '<div class="sim">' + simText(device) + '</div></td>' +
        '<td data-label="Battery">' + batteryCell(device.battery_level) + '</td>' +
        '<td data-label="Network">' + networkCell(device.network_type) + '</td>' +
        '<td data-label="Last seen"><div class="seen" title="' + escapeHtml(seenTitle) + '">' + escapeHtml(seenText) + '<small>' + escapeHtml(timeAgo(device.last_seen_at)) + '</small></div></td>' +
        '<td class="td-action cell-action"><button type="button" class="action-btn ' + (active ? 'block' : 'unblock') + '" data-action="toggle" data-device-id="' + escapeHtml(device.device_id) + '" data-active="' + active + '">' + (active ? SVG_BLOCK + 'Block' : SVG_UNBLOCK + 'Unblock') + '</button></td>' +
        '</tr>';
    }).join('');
  }

  function matchesSearch(row) {
    if (!state.search) return true;
    var haystack = [
      row.transaction_id, row.destination, row.status, row.channel,
      row.device_id, row.device_model, row.amount
    ].join(' ').toLowerCase();
    return haystack.indexOf(state.search) !== -1;
  }
`;
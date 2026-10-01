/** Admin console client, part 5: listboxes, target selection and payout dispatch. */
export const CLIENT_FORMS = `
  function menuRef(key) {
    var ref = MENUS[key];
    return { root: byId(ref.dropdown), button: byId(ref.button), menu: byId(ref.menu) };
  }

  function setMenuOpen(key, open) {
    var ref = menuRef(key);
    ref.root.classList.toggle('open', open);
    ref.button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function markMenuSelection(key, value) {
    Array.prototype.forEach.call(menuRef(key).menu.querySelectorAll('[role="option"]'), function (option) {
      var selected = option.getAttribute('data-value') === value;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function selectOption(key, option, onSelect) {
    onSelect(option.getAttribute('data-value'));
    setMenuOpen(key, false);
    menuRef(key).button.focus();
  }

  function bindMenu(key, onSelect) {
    var ref = menuRef(key);
    ref.button.addEventListener('click', function (event) {
      event.stopPropagation();
      var open = !ref.root.classList.contains('open');
      Object.keys(MENUS).forEach(function (other) { setMenuOpen(other, false); });
      setMenuOpen(key, open);
    });
    ref.button.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') { setMenuOpen(key, false); return; }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      setMenuOpen(key, true);
      var first = ref.menu.querySelector('[role="option"]:not([aria-disabled="true"])');
      if (first) first.focus();
    });
    ref.menu.addEventListener('click', function (event) {
      var option = event.target.closest('[role="option"]');
      if (!option || option.getAttribute('aria-disabled') === 'true') return;
      selectOption(key, option, onSelect);
    });
    ref.menu.addEventListener('keydown', function (event) {
      var option = event.target.closest('[role="option"]');
      if (event.key === 'Escape') { setMenuOpen(key, false); ref.button.focus(); return; }
      if (!option) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        var options = Array.prototype.slice.call(ref.menu.querySelectorAll('[role="option"]'));
        var step = event.key === 'ArrowDown' ? 1 : -1;
        var current = options.indexOf(option);
        for (var jump = 1; jump <= options.length; jump += 1) {
          var candidate = options[(current + step * jump + options.length * jump) % options.length];
          if (candidate && candidate.getAttribute('aria-disabled') !== 'true') { candidate.focus(); return; }
        }
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && option.getAttribute('aria-disabled') !== 'true') {
        event.preventDefault();
        selectOption(key, option, onSelect);
      }
    });
  }

  function setChannel(value) {
    state.channel = value;
    byId('channel-value').textContent = CHANNEL_LABELS[value] || value;
    byId('channel-dot').className = 'channel-dot ' + (value === 'CBE' ? 'cbe' : 'telebirr');
    markMenuSelection('channel', value);
  }

  function findDevice(deviceId) {
    var match = null;
    state.devices.forEach(function (device) {
      if (device.device_id === deviceId) match = device;
    });
    return match;
  }

  function setTargetDevice(value) {
    var device = value && value !== ANY_TARGET ? findDevice(value) : null;
    if (device && !device.active_status) device = null;
    state.targetDevice = device ? device.device_id : ANY_TARGET;
    var activeCount = state.devices.filter(function (item) { return item.active_status; }).length;
    byId('target-value').textContent = device ? (device.phone_model || device.device_id) : 'Any available device';
    byId('target-dot').className = 'channel-dot ' + (device ? 'device' : 'auto');
    // Surface the exact id for a pinned payout: it is what the console sends as
    // targetDeviceId and what the receiving phone matches itself against.
    var badge = byId('target-badge');
    badge.className = 'mini-badge ' + (device ? 'active' : 'auto');
    badge.textContent = device ? 'Pinned' : 'Auto';
    var note = byId('target-note');
    note.textContent = device
      ? 'Will run on ' + device.device_id
      : state.devices.length ? activeCount + ' of ' + state.devices.length + ' devices active' : 'No devices registered yet';
    note.classList.toggle('is-live', activeCount > 0);
    markMenuSelection('target', state.targetDevice);
  }

  function renderTargetOptions() {
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
    byId('target-menu').innerHTML = options.join('');
    setTargetDevice(state.targetDevice);
  }
`;
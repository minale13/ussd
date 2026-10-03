/**
 * Admin app client, part 1: state, helpers and the admin API transport.
 *
 * Ships as a same-origin script (/admin/app.js) so the Helmet CSP is satisfied
 * with no inline script and no 'unsafe-inline' in script-src.
 */
export const CLIENT_CORE = `
(function () {
  'use strict';

  var REFRESH_MS = 30000;
  var BOOT_MS = 1100;
  var ANY_TARGET = 'ANY';
  var CHANNEL_LABELS = { TELEBIRR: 'Telebirr', CBE: 'CBE' };
  var MENUS = {
    channel: { dropdown: 'channel-dropdown', button: 'channel-button', menu: 'channel-menu' },
    target: { dropdown: 'target-dropdown', button: 'target-button', menu: 'target-menu' }
  };
  var state = {
    channel: 'TELEBIRR',
    targetDevice: ANY_TARGET,
    devices: [],
    transactions: [],
    cashIns: [],
    selectedDevice: null,
    overview: {},
    unlocked: false,
    loading: false,
    // True when the last load came back degraded: the collections are empty
    // because the database was unreachable, not because there is nothing to show.
    degraded: false,
    firstLoad: true,
    notifications: true,
    // Screen state. route is the visible screen and txnFilter the active
    // transaction tab; the search strings are per screen so returning to one
    // restores what the operator had typed.
    route: 'home',
    txnFilter: 'all',
    txnSearch: '',
    deviceSearch: ''
  };
  var toastTimer = null;
  var submitMarkup = null;
  var streamAbort = null;
  // Declared, not assigned implicitly: the client runs in strict mode, so an
  // undeclared assignment here would throw and strand the splash overlay.
  var bootTimer = null;

  var SVG_OK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
  var SVG_ERROR = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V13M12 16.4h.01"/></svg>';
  var SVG_EMPTY = '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="13" rx="3"/><path d="M8.5 20.5h7M12 17.5v3"/></svg>';
  var SVG_CHECK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var SVG_LOADER = '<svg class="spin" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/></svg>';
  var SVG_IN = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V5"/><path d="M6.5 10.5 12 5l5.5 5.5"/></svg>';
  var SVG_OUT = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v15"/><path d="M6.5 13.5 12 19l5.5-5.5"/></svg>';
  var SVG_WARN = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5 2.8 20h18.4z"/><path d="M12 10v4M12 17h.01"/></svg>';
  var SVG_BELL = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8.5a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16s-2-1.5-2-6.5Z"/><path d="M13.7 19a2 2 0 0 1-3.4 0"/></svg>';

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }

  function money(value) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function notify(message, type) {
    var toast = byId('toast');
    if (!toast) return;
    toast.className = 'toast show ' + (type === 'error' ? 'error' : 'success');
    toast.innerHTML = (type === 'error' ? SVG_ERROR : SVG_OK) + '<span>' + escapeHtml(message) + '</span>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.className = 'toast'; }, 4200);
  }

  /** Feedback shown inside a form itself, rather than as a floating toast. */
  function formFeedback(nodeId, message, type) {
    var node = byId(nodeId);
    if (!node) return;
    if (!message) { node.className = 'form-feedback'; node.innerHTML = ''; return; }
    node.className = 'form-feedback show ' + (type === 'error' ? 'error' : 'success');
    node.innerHTML = (type === 'error' ? SVG_ERROR : SVG_OK) + '<span>' + escapeHtml(message) + '</span>';
  }

  function emptyState(message, glyph) {
    return '<div class="empty-state">' + (glyph || SVG_EMPTY) + escapeHtml(message) + '</div>';
  }

  /**
   * Every admin call carries the credentials straight from the input elements.
   * They are never copied into storage, a cookie or the URL.
   */
  function api(path, options) {
    var request = options || {};
    var keyField = byId('key');
    var userField = byId('username');
    return fetch(path, {
      method: request.method || 'GET',
      headers: Object.assign(
        {
          'content-type': 'application/json',
          'x-admin-username': userField ? userField.value.trim() : '',
          'x-admin-key': keyField ? keyField.value.trim() : ''
        },
        request.headers || {}
      ),
      body: request.body
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) {
          // The status rides along on the error so the caller can tell a refused
          // password from an unconfigured deployment or a server fault, instead of
          // showing one catch-all message for all three.
          var error = new Error(body.error || 'Request failed with status ' + response.status);
          error.status = response.status;
          throw error;
        }
        return body;
      });
    });
  }

  /**
   * Turns a failed admin call into something an operator can act on.
   *
   * A wrong password and an unset ADMIN_API_KEY look identical from the login
   * screen but need completely different fixes, so they get different text.
   * error.status is absent when fetch itself failed, which is the network case.
   */
  function authMessage(error) {
    var status = error && error.status;
    if (status === 401 || status === 403) return 'Invalid username or password.';
    if (status === 503) return 'Admin console is not configured. Set ADMIN_API_KEY in the deployment environment.';
    if (status === 429) return 'Too many attempts. Wait a minute and try again.';
    if (!status) return 'Connection failed. Check your network and try again.';
    if (status >= 500) return 'The gateway reported a server error. Try again shortly.';
    return (error && error.message) || 'Sign-in failed. Try again.';
  }

  /**
   * Busy state for the Sign In button.
   *
   * The click has to be visibly acknowledged: a disabled button with no other
   * change is indistinguishable from a dead page on a slow connection, and it
   * invites a second click while the first is still in flight.
   */
  function setLoginPending(pending) {
    var button = byId('unlock');
    if (!button) return;
    button.disabled = Boolean(pending);
    button.classList.toggle('is-pending', Boolean(pending));
    var label = byId('unlock-label');
    if (label) label.textContent = pending ? 'Signing in...' : 'Sign In';
    var spinner = byId('unlock-spinner');
    if (spinner) spinner.hidden = !pending;
  }

  function setGatewayStatus(online, label) {
    var node = byId('gateway-status');
    var text = byId('gateway-status-text');
    if (node) node.classList.toggle('is-offline', !online);
    if (text) text.textContent = label || (online ? 'Online' : 'Offline');
    var pill = byId('splash-status');
    if (pill) pill.className = 'splash-status ' + (online ? 'is-online' : 'is-offline');
    var pillText = byId('splash-status-text');
    if (pillText) pillText.textContent = label || (online ? 'Gateway connected' : 'Gateway unreachable');
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

  /** True when an ISO stamp falls on the operator's current calendar day. */
  function isToday(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return false;
    var now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  }

  /** Status chip tone for a payout. Unknown states fall back to neutral. */
  function statusTone(status) {
    if (status === 'COMPLETED') return 'settled';
    if (status === 'FAILED') return 'failed';
    if (status === 'PENDING' || status === 'PROCESSING') return 'pending';
    return 'cancelled';
  }

  /** "SIM 2 / Ethio Telecom" from the slot index the client reported. */
  function simText(device) {
    if (!device) return 'Unknown SIM';
    var parts = [];
    if (device.sim_slot !== null && device.sim_slot !== undefined && device.sim_slot >= 0) {
      parts.push('SIM ' + (Number(device.sim_slot) + 1));
    }
    if (device.carrier) parts.push(device.carrier);
    return parts.length ? parts.join(' / ') : 'Unknown SIM';
  }

  /** Battery bar. Level is nullable, and a low charge is called out explicitly. */
  function batteryCell(level, big) {
    if (level === null || level === undefined) {
      return '<div class="battery' + (big ? ' big' : '') + '"><div class="battery-track"></div><span class="battery-value">—</span></div>';
    }
    var value = Math.max(0, Math.min(100, Number(level)));
    var tone = value <= 15 ? ' critical' : value <= 35 ? ' low' : '';
    return '<div class="battery' + tone + (big ? ' big' : '') + '" title="' + value + '%">' +
      '<div class="battery-track"><div class="battery-fill" style="width:' + value + '%"></div></div>' +
      '<span class="battery-value">' + value + '%</span></div>';
  }

  /** Network generation badge, coloured by how usable it is for a payout. */
  function networkCell(type) {
    if (!type) return '<span class="net down">No data</span>';
    var fast = type === '4G' || type === '5G';
    var slow = type === '3G' || type === '2G';
    var tone = fast ? '' : slow ? ' slow' : ' down';
    return '<span class="net' + tone + '">' + escapeHtml(type) + '</span>';
  }
`;

/**
 * Admin console client, part 1: state, helpers and the admin API transport.
 *
 * Ships as a same-origin script (/admin/app.js) so the Helmet CSP is satisfied
 * with no inline script and no 'unsafe-inline' in script-src.
 */
export const CLIENT_CORE = `
(function () {
  'use strict';

  var REFRESH_MS = 30000;
  var PAGE_SIZE = 5;
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
    unlocked: false,
    loading: false,
    firstLoad: true,
    search: '',
    page: 1,
    // Route state: route is the active section; the page counters let a view
    // return to the page the operator was on when they leave and come back.
    route: 'dashboard',
    txnPage: 1,
    wdPage: 1
  };
  var toastTimer = null;
  var submitMarkup = null;

  var SVG_BLOCK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/></svg>';
  var SVG_UNBLOCK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
  var SVG_OK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
  var SVG_ERROR = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V13M12 16.4h.01"/></svg>';
  var SVG_EMPTY = '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="13" rx="3"/><path d="M8.5 20.5h7M12 17.5v3"/></svg>';
  var SVG_CHECK = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  var SVG_ARROW = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 6l6 6-6 6"/></svg>';
  var SVG_PREV = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6l-6 6 6 6"/></svg>';
  var SVG_LOADER = '<svg class="spin" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/></svg>';

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

  /** Feedback shown inside the withdrawal form itself. */
  function formFeedback(message, type) {
    var node = byId('form-feedback');
    if (!node) return;
    if (!message) { node.className = 'form-feedback'; node.innerHTML = ''; return; }
    node.className = 'form-feedback show ' + (type === 'error' ? 'error' : 'success');
    node.innerHTML = (type === 'error' ? SVG_ERROR : SVG_OK) + '<span>' + escapeHtml(message) + '</span>';
  }

  /**
   * Every admin call carries the key straight from the input element. It is
   * never copied into storage, a cookie or the URL.
   */
  function api(path, options) {
    var request = options || {};
    var keyField = byId('key');
    return fetch(path, {
      method: request.method || 'GET',
      headers: Object.assign(
        { 'content-type': 'application/json', 'x-admin-key': keyField ? keyField.value.trim() : '' },
        request.headers || {}
      ),
      body: request.body
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) throw new Error(body.error || 'Request failed with status ' + response.status);
        return body;
      });
    });
  }

  function setGatewayStatus(online, label) {
    var node = byId('gateway-status');
    var text = byId('gateway-status-text');
    if (!node || !text) return;
    node.classList.toggle('is-offline', !online);
    text.textContent = label || (online ? 'System Online' : 'System Offline');
  }

  /**
   * Loading skeletons.
   *
   * The very first unlock can take a while on a cold database, so the panels
   * paint shimmering placeholders instead of flashing empty tables or zeros.
   * Turning them off restores the real figures the renderers just wrote.
   */
  function skeletonRows(columns, count) {
    var out = [];
    for (var r = 0; r < count; r += 1) {
      var cells = [];
      for (var c = 0; c < columns; c += 1) cells.push('<td><div class="skel skel-line"></div></td>');
      out.push('<tr>' + cells.join('') + '</tr>');
    }
    return out.join('');
  }

  function setSkeletons(on) {
    ['cash', 'withdrawals', 'balance'].forEach(function (id) {
      var node = byId(id);
      if (!node) return;
      node.classList.toggle('skel', on);
      node.textContent = on ? '' : node.textContent;
    });
    ['stat-total', 'stat-online', 'stat-offline'].forEach(function (id) {
      var node = byId(id);
      if (!node) return;
      node.classList.toggle('skel', on);
    });
    var devices = byId('devices');
    var txns = byId('txns');
    if (on) {
      if (devices) devices.innerHTML = skeletonRows(7, 4);
      if (txns) txns.innerHTML = skeletonRows(7, 4);
    } else {
      // Re-render from the last known data so a failed load shows the empty
      // state rather than leaving skeleton bars on screen.
      renderDevices(state.devices);
      renderTransactions(state.transactions);
    }
  }
`;
/** Admin console client, part 10: the live gateway event stream. */
export const CLIENT_REALTIME = `
  var streamAbort = null;

  /**
   * Opens the server-sent event stream.
   *
   * Deliberately uses fetch + a ReadableStream rather than EventSource: the
   * stream sits behind the admin-key header, and EventSource cannot send custom
   * headers. Using it would have forced the key into the query string, where it
   * would land in browser history and any proxy log.
   */
  function openEventStream() {
    if (streamAbort) return;
    if (!state.unlocked || !window.fetch || !window.ReadableStream) return;

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    streamAbort = controller;

    fetch('/api/admin/stream', {
      headers: { 'x-admin-key': byId('key').value.trim(), accept: 'text/event-stream' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok || !response.body) throw new Error('stream unavailable');
      state.streaming = true;
      setStreamBadge(true);
      return readStream(response.body, onGatewayEvent);
    }).catch(function () {
      // A dropped stream is not fatal: the 30s poll still refreshes the console.
      state.streaming = false;
      setStreamBadge(false);
    });
  }

  function closeEventStream() {
    if (streamAbort) {
      try { streamAbort.abort(); } catch (err) { /* already closed */ }
      streamAbort = null;
    }
    state.streaming = false;
    setStreamBadge(false);
  }

  function setStreamBadge(connected) {
    var node = byId('stream-status');
    if (!node) return;
    node.classList.toggle('is-live', connected);
    var text = node.querySelector('span');
    if (text) text.textContent = connected ? 'Live' : 'Polling';
  }

  /** Incremental SSE frame reader: buffers partial frames until a blank line. */
  function readStream(body, onEvent) {
    var reader = body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    function pump() {
      return reader.read().then(function (result) {
        if (result.done) return;
        buffer += decoder.decode(result.value, { stream: true });
        var frames = buffer.split('\\n\\n');
        buffer = frames.pop() || '';
        frames.forEach(function (frame) {
          if (!frame || frame.charAt(0) === ':') return;
          var type = null;
          var data = '';
          frame.split('\\n').forEach(function (line) {
            if (line.indexOf('event:') === 0) type = line.slice(6).trim();
            if (line.indexOf('data:') === 0) data += line.slice(5).trim();
          });
          if (type && type !== 'ready' && data) {
            try { onEvent(type, JSON.parse(data)); } catch (err) { /* malformed frame */ }
          }
        });
        return pump();
      }).catch(function () { /* stream closed by the server or the browser */ });
    }
    return pump();
  }

  /**
   * Reacts to gateway activity.
   *
   * The cheapest correct thing is to refetch exactly what the open view shows
   * rather than trying to patch rows client-side: the same render path that
   * handles a manual refresh handles this, so the two cannot diverge.
   */
  function onGatewayEvent(type, data) {
    if (type === 'ready') { state.streaming = true; setStreamBadge(true); return; }

    if (type === 'sms') {
      var direction = data.parsed && data.parsed.direction;
      var label = direction === 'CREDIT' ? 'Incoming transfer'
        : direction === 'DEBIT' ? 'Outgoing payment' : 'Bank notification';
      notify(label + ' from ' + (data.parsed.provider || 'provider') + ' on ' + data.deviceId
        + (data.bankBalance ? ' · balance ' + money(data.bankBalance) + ' ETB' : ''));
    }

    load({ silent: true });
    loadView(state.route);
    if (state.route === 'dashboard') renderDevices(state.devices);
  }
`;
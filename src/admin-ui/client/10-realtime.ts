/** Admin app client, part 8: the live gateway event stream. */
export const CLIENT_REALTIME = `
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

    // The connect itself gets a deadline. Without it, a proxy that accepts the
    // socket but never answers leaves streamAbort set forever, so every later
    // openEventStream() no-ops and live updates stop until a page reload; the
    // 30s poll below keeps the data fresh either way.
    var connectTimer = setTimeout(function () {
      if (controller) {
        try { controller.abort(); } catch (err) { /* already closed */ }
      }
    }, API_TIMEOUT_MS);

    fetch('/api/admin/stream', {
      headers: {
        'x-admin-username': byId('username').value.trim(),
        'x-admin-key': byId('key').value.trim(),
        accept: 'text/event-stream'
      },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      clearTimeout(connectTimer);
      if (!response.ok || !response.body) throw new Error('stream unavailable');
      return readStream(response.body, onGatewayEvent);
    }).catch(function () {
      // A dropped stream is not fatal: the 30s poll still refreshes the app,
      // and clearing the handle lets the next attempt (or the next successful
      // load) reopen it instead of being blocked by a stale controller.
      clearTimeout(connectTimer);
      streamAbort = null;
    });
  }

  function closeEventStream() {
    if (streamAbort) {
      try { streamAbort.abort(); } catch (err) { /* already closed */ }
      streamAbort = null;
    }
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
   * The cheapest correct thing is to refetch exactly what the open screens show
   * rather than trying to patch rows client-side: the same render path that
   * handles a manual refresh handles this, so the two cannot diverge.
   */
  function onGatewayEvent(type, data) {
    if (type === 'ready') return;
    if (type === 'sms') {
      var direction = data.parsed && data.parsed.direction;
      var label = direction === 'CREDIT' ? 'Incoming cash-in'
        : direction === 'DEBIT' ? 'Outgoing payment' : 'Bank notification';
      notify(label + ' from ' + ((data.parsed && data.parsed.provider) || 'provider') + ' on ' + data.deviceId
        + (data.bankBalance ? ' · balance ' + money(data.bankBalance) + ' ETB' : ''));
    }
    load();
  }
`;

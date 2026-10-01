/** Admin console client, part 4: transaction ledger and pagination. */
export const CLIENT_LEDGER = `
  /**
   * Centralized payout ledger. The device column shows the target a payout was
   * routed to; an auto-assigned payout has no recorded owner yet, so it is
   * labelled "unassigned" rather than attributed to an arbitrary phone.
   */
  function renderTransactions(rows) {
    state.transactions = rows;
    byId('txn-count').textContent = rows.length ? rows.length + (rows.length === 1 ? ' payout' : ' payouts') : 'No payouts yet';

    var filtered = rows.filter(matchesSearch);
    var pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (state.page > pages) state.page = pages;
    if (state.page < 1) state.page = 1;

    var tbody = byId('txns');
    if (!filtered.length) {
      var message = rows.length
        ? 'No transactions match your search.'
        : 'No payouts have been dispatched yet.';
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">' + SVG_EMPTY + message + '</div></td></tr>';
      renderPager(0, pages);
      return;
    }

    var start = (state.page - 1) * PAGE_SIZE;
    var slice = filtered.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = slice.map(function (row) {
      var status = String(row.status || 'PENDING').toUpperCase();
      var device = row.device_id
        ? '<div class="txn-device"><span class="name">' + escapeHtml(row.device_model || 'Unknown model') + '</span><span class="id">' + escapeHtml(row.device_id) + '</span></div>'
        : '<div class="txn-device"><span class="unassigned">Unassigned</span></div>';
      var created = new Date(row.created_at);
      var createdText = isNaN(created.getTime()) ? 'Unknown' : created.toLocaleString();
      return '<tr>' +
        '<td data-label="Transaction" class="cell-wide"><div class="txn-id">' + escapeHtml(row.transaction_id || '—') + '</div></td>' +
        '<td data-label="Device">' + device + '</td>' +
        '<td data-label="Phone"><div class="txn-phone">' + escapeHtml(row.destination || '—') + '</div></td>' +
        '<td data-label="Amount"><div class="txn-amount">' + money(row.amount) + '<small>' + escapeHtml(row.currency || 'ETB') + '</small></div></td>' +
        '<td data-label="Channel">' + channelCell(row.channel) + '</td>' +
        '<td data-label="Status"><span class="pill ' + statusTone(status) + '"><span class="dot"></span>' + escapeHtml(status) + '</span></td>' +
        '<td data-label="Created"><div class="seen">' + escapeHtml(createdText) + '<small>' + escapeHtml(timeAgo(row.created_at)) + '</small></div></td>' +
        '</tr>';
    }).join('');

    renderPager(filtered.length, pages);
  }

  function renderPager(total, pages) {
    var pager = byId('txn-pager');
    if (!pager) return;
    if (!total) { pager.hidden = true; return; }
    pager.hidden = false;

    var start = (state.page - 1) * PAGE_SIZE + 1;
    var end = Math.min(state.page * PAGE_SIZE, total);
    byId('txn-page-info').innerHTML =
      'Showing <strong>' + start + '–' + end + '</strong> of <strong>' + total + '</strong> transaction' + (total === 1 ? '' : 's');

    var html = '<button type="button" class="pager-btn" data-page="' + (state.page - 1) + '"' + (state.page === 1 ? ' disabled' : '') + ' aria-label="Previous page">' + SVG_PREV + '</button>';
    for (var p = 1; p <= pages; p += 1) {
      if (pages > 7 && p > 2 && p < pages - 1 && Math.abs(p - state.page) > 1) {
        if (Math.abs(p - state.page) === 2) html += '<span class="pager-gap">…</span>';
        continue;
      }
      html += '<button type="button" class="pager-btn' + (p === state.page ? ' is-current' : '') + '" data-page="' + p + '"' + (p === state.page ? ' aria-current="page"' : '') + '>' + p + '</button>';
    }
    html += '<button type="button" class="pager-btn" data-page="' + (state.page + 1) + '"' + (state.page === pages ? ' disabled' : '') + ' aria-label="Next page">' + SVG_ARROW + '</button>';
    byId('txn-page-controls').innerHTML = html;
  }
`;
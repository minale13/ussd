import { icon } from '../icons.js';

export type StatAccent = 'teal' | 'blue' | 'purple';

export type StatCardSpec = {
  /** DOM id for the animated amount node. Kept stable: the client targets it. */
  id: string;
  label: string;
  /** Field read from GET /api/admin/overview. */
  field: 'total_cash_in' | 'total_withdrawals' | 'remaining_balance';
  /** Field for the "today" delta (additive: absent on older deployments). */
  todayField: 'cash_in_today' | 'withdrawals_today' | 'balance_today';
  sub: string;
  accent: StatAccent;
  ico: Parameters<typeof icon>[0];
  deltaLabel: string;
};

/** Decorative sparkline. Shape only - it never encodes a fabricated value. */
function sparkline(accent: StatAccent) {
  const stroke = { teal: '#00D68F', blue: '#1683FF', purple: '#7C3AED' }[accent];
  const fill = { teal: 'rgba(0,214,143,.16)', blue: 'rgba(22,131,255,.16)', purple: 'rgba(124,58,237,.18)' }[accent];
  return (
    `<svg class="stat-spark" width="86" height="42" viewBox="0 0 86 42" fill="none" aria-hidden="true" focusable="false">` +
    `<defs><linearGradient id="spark-${accent}" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${fill}"/><stop offset="1" stop-color="rgba(0,0,0,0)"/></linearGradient></defs>` +
    `<path d="M1 34 L15 27 L29 31 L43 19 L57 23 L71 12 L85 16 L85 42 L1 42 Z" fill="url(#spark-${accent})"/>` +
    `<path class="spark-line" style="--len:120" d="M1 34 L15 27 L29 31 L43 19 L57 23 L71 12 L85 16" stroke="${stroke}"/>` +
    `</svg>`
  );
}

/**
 * One financial metric. Every value is filled in by the client from
 * /api/admin/overview - nothing here is a hardcoded production figure.
 */
export function StatCard(spec: StatCardSpec) {
  return `
<article class="card is-interactive stat ${spec.accent}" data-stat="${spec.field}">
  <div class="stat-top">
    <div class="stat-icon">${icon(spec.ico, 20)}</div>
    <div class="stat-label">${spec.label}</div>
  </div>
  <div>
    <div class="stat-value">
      <span class="stat-amount" id="${spec.id}">0.00</span>
      <span class="stat-unit">ETB</span>
    </div>
    <p class="stat-sub">${spec.sub}</p>
  </div>
  <div class="stat-foot">
    <span class="stat-delta" id="${spec.id}-delta" data-today="${spec.todayField}">${icon('arrowUpRight', 13)}<span>0.00</span></span>
    <span>${spec.deltaLabel}</span>
  </div>
  ${sparkline(spec.accent)}
</article>`;
}
/** Fleet summary counters rendered above the device table. */
export const FLEET_STATS_CSS = `
.fleet-stat-row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.fleet-stat{
  display:flex;flex-direction:column;gap:3px;
  padding:11px 13px;border-radius:var(--r-sm);
  background:rgba(255,255,255,.035);border:1px solid var(--line-soft);
}
.fleet-stat .fs-label{font:700 9px/1.4 var(--font);letter-spacing:.11em;text-transform:uppercase;color:rgba(143,168,195,.78)}
.fleet-stat .fs-value{font:800 19px/1.1 var(--font-display);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.fleet-stat.is-online .fs-value{color:var(--success)}
.fleet-stat.is-offline .fs-value{color:var(--danger)}
.fleet-stat .fs-value.skel{display:inline-block;min-width:42px;height:20px}
@media(max-width:520px){
  .fleet-stat-row{grid-template-columns:1fr}
}
`;
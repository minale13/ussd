/** Quick actions, pagination and the mobile card-style table fallback. */
export const PANELS = `
/* ---------------- Quick actions ---------------- */
.qa-list{display:flex;flex-direction:column;padding:0 14px 14px}
.qa-item{
  display:flex;align-items:center;gap:13px;width:100%;text-align:left;
  padding:13px 12px;margin-bottom:8px;border-radius:var(--r-md);
  border:1px solid var(--line-soft);background:rgba(255,255,255,.028);
  transition:transform var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease),
             background var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease);
}
.qa-item:last-child{margin-bottom:0}
.qa-item:hover{transform:translateX(3px);background:rgba(255,255,255,.055)}
.qa-item:hover .qa-arrow{transform:translateX(3px);color:var(--text)}
.qa-icon{
  width:38px;height:38px;flex:none;border-radius:11px;display:grid;place-items:center;
  transition:box-shadow var(--t-mid) var(--ease),transform var(--t-mid) var(--ease);
}
.qa-copy{flex:1;min-width:0}
.qa-title{font-size:13.5px;font-weight:600;line-height:1.3}
.qa-sub{margin-top:2px;font-size:11.5px;color:var(--text-2);line-height:1.35}
.qa-arrow{flex:none;color:rgba(143,168,195,.7);transition:transform var(--t-fast) var(--ease),color var(--t-fast) var(--ease)}

.qa-item.green .qa-icon{color:var(--success);background:rgba(0,214,143,.11);box-shadow:inset 0 0 0 1px rgba(0,214,143,.24)}
.qa-item.green:hover{border-color:rgba(0,214,143,.34);box-shadow:0 6px 20px rgba(0,214,143,.10)}
.qa-item.blue .qa-icon{color:var(--blue);background:rgba(22,131,255,.12);box-shadow:inset 0 0 0 1px rgba(22,131,255,.26)}
.qa-item.blue:hover{border-color:rgba(22,131,255,.36);box-shadow:0 6px 20px rgba(22,131,255,.12)}
.qa-item.purple .qa-icon{color:#A78BFA;background:rgba(124,58,237,.14);box-shadow:inset 0 0 0 1px rgba(124,58,237,.28)}
.qa-item.purple:hover{border-color:rgba(124,58,237,.38);box-shadow:0 6px 20px rgba(124,58,237,.14)}
.qa-item.orange .qa-icon{color:var(--warning);background:rgba(245,158,11,.12);box-shadow:inset 0 0 0 1px rgba(245,158,11,.26)}
.qa-item.orange:hover{border-color:rgba(245,158,11,.36);box-shadow:0 6px 20px rgba(245,158,11,.12)}

/* ---------------- Pagination ---------------- */
.pager{
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  padding:14px 20px;border-top:1px solid var(--line-soft);
}
.pager-info{font-size:12.5px;color:var(--text-2)}
.pager-info strong{color:var(--text);font-weight:600;font-variant-numeric:tabular-nums}
.pager-controls{display:flex;align-items:center;gap:6px}
.pager-btn{
  min-width:34px;height:34px;padding:0 11px;border-radius:9px;
  display:inline-flex;align-items:center;justify-content:center;
  font:600 12.5px/1 var(--font);color:var(--text-2);
  border:1px solid var(--line);background:rgba(255,255,255,.03);
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease);
}
.pager-btn:hover:not(:disabled){color:var(--text);background:rgba(255,255,255,.07);border-color:var(--line-strong)}
.pager-btn:disabled{opacity:.4;cursor:not-allowed}
.pager-btn.is-current{
  color:#032B26;font-weight:700;border-color:transparent;
  background:linear-gradient(135deg,var(--primary),#14C9FF);
  box-shadow:0 4px 14px rgba(0,229,195,.26);
}
.pager-gap{padding:0 3px;color:var(--text-2);font-size:12px}

/* ---------------- Footer ---------------- */
.footer{
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  padding:4px 2px 0;font-size:12px;color:var(--text-2);
}
.footer .live{display:inline-flex;align-items:center;gap:7px}
.footer .live .dot{width:6px;height:6px;border-radius:50%;background:var(--success);animation:pulse-dot 2.4s ease-in-out infinite}

/* ---------------- Mobile table cards ---------------- */
@media(max-width:720px){
  table{min-width:0}
  thead{display:none}
  tbody tr{display:grid;grid-template-columns:1fr 1fr;gap:9px 14px;padding:15px 16px;border-bottom:1px solid var(--line-soft)}
  tbody tr:last-child{border-bottom:0}
  tbody td{display:flex;flex-direction:column;gap:3px;padding:0;border:0}
  tbody td::before{
    content:attr(data-label);
    font:700 8.5px/1.4 var(--font);letter-spacing:.10em;text-transform:uppercase;color:rgba(143,168,195,.62);
  }
  tbody td.cell-wide{grid-column:1 / -1}
  .battery{min-width:0}
  .card-head{flex-direction:column;gap:10px}
  .pager{flex-direction:column;align-items:stretch;gap:12px}
  .pager-controls{justify-content:center}
}
`;
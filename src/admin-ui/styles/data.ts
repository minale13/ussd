/** Tables, status pills, battery indicator and network badges. */
export const DATA = `
.table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.table-wrap::-webkit-scrollbar{height:8px}
.table-wrap::-webkit-scrollbar-thumb{background:rgba(80,160,220,.26);border-radius:8px}
.table-wrap::-webkit-scrollbar-track{background:transparent}
table{min-width:640px}
thead th{
  padding:11px 20px;text-align:left;white-space:nowrap;
  font:700 9.5px/1.3 var(--font);letter-spacing:.12em;text-transform:uppercase;color:rgba(143,168,195,.72);
  background:rgba(255,255,255,.022);
  border-bottom:1px solid var(--line-soft);
}
tbody td{padding:13px 20px;border-bottom:1px solid var(--line-soft);font-size:13px;vertical-align:middle}
tbody tr{transition:background var(--t-fast) var(--ease)}
tbody tr:last-child td{border-bottom:0}
tbody tr:hover{background:rgba(255,255,255,.028)}
.th-action,.td-action{text-align:right}

.device-id{font:600 12.5px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.01em}
.device-model{margin-top:2px;font-size:11.5px;color:var(--text-2)}
.fleet-channel{display:flex;align-items:center;gap:8px}
.tag{padding:3px 9px;border-radius:7px;font:600 11px/1.5 var(--font)}
.tag.telebirr{color:#8FD4FF;background:rgba(41,182,246,.13);box-shadow:inset 0 0 0 1px rgba(41,182,246,.26)}
.tag.cbe{color:#FFE08A;background:rgba(245,197,24,.12);box-shadow:inset 0 0 0 1px rgba(245,197,24,.26)}
.sim{margin-top:4px;font-size:11.5px;color:var(--text-2)}
.seen{white-space:nowrap;font-size:12.5px}
.seen small{display:block;margin-top:2px;font-size:11px;color:rgba(143,168,195,.78)}

/* Status pill. Online/settled green, offline/failed red, pending/blocked amber. */
.pill{display:inline-flex;align-items:center;gap:7px;padding:4px 10px;border-radius:999px;font:600 11px/1.5 var(--font);white-space:nowrap}
.pill .dot{width:6px;height:6px;border-radius:50%;flex:none}
.pill.online,.pill.settled{color:#8DF0CE;background:rgba(0,214,143,.11);box-shadow:inset 0 0 0 1px rgba(0,214,143,.26)}
.pill.online .dot,.pill.settled .dot{background:var(--success)}
.pill.offline,.pill.failed{color:#FFC2C2;background:rgba(239,68,68,.11);box-shadow:inset 0 0 0 1px rgba(239,68,68,.26)}
.pill.offline .dot,.pill.failed .dot{background:var(--danger)}
.pill.blocked,.pill.pending{color:#FFDDA6;background:rgba(245,158,11,.12);box-shadow:inset 0 0 0 1px rgba(245,158,11,.28)}
.pill.blocked .dot,.pill.pending .dot{background:var(--warning)}
.pill.cancelled{color:rgba(143,168,195,.95);background:rgba(143,168,195,.10);box-shadow:inset 0 0 0 1px rgba(143,168,195,.22)}
.pill.cancelled .dot{background:var(--text-2)}

/* Battery indicator with a fill bar. */
.battery{display:flex;align-items:center;gap:9px;min-width:104px}
.battery-track{position:relative;width:38px;height:15px;flex:none;border-radius:5px;border:1.5px solid rgba(143,168,195,.55);padding:1.5px;display:flex;align-items:center}
.battery-track::after{content:'';position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:2px;height:6px;border-radius:0 2px 2px 0;background:rgba(143,168,195,.55)}
.battery-fill{height:100%;border-radius:2.5px;background:var(--success);transition:width var(--t-slow) var(--ease)}
.battery.low .battery-fill{background:var(--warning)}
.battery.critical .battery-fill{background:var(--danger)}
.battery-value{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--text-2)}

.net{display:inline-block;padding:3px 9px;border-radius:7px;font:600 11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
.net.fast{color:#8DF0CE;background:rgba(0,214,143,.10);box-shadow:inset 0 0 0 1px rgba(0,214,143,.22)}
.net.slow{color:#FFDDA6;background:rgba(245,158,11,.10);box-shadow:inset 0 0 0 1px rgba(245,158,11,.24)}
.net.down{color:rgba(143,168,195,.85);background:rgba(143,168,195,.09);box-shadow:inset 0 0 0 1px rgba(143,168,195,.18)}

.action-btn{
  display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border-radius:9px;
  font:600 11.5px/1.4 var(--font);color:var(--text-2);
  border:1px solid var(--line);background:rgba(255,255,255,.03);
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease);
}
.action-btn.block:hover{color:#FFC2C2;background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.34)}
.action-btn.unblock:hover{color:#8DF0CE;background:rgba(0,214,143,.12);border-color:rgba(0,214,143,.34)}
.action-btn:disabled{opacity:.5;cursor:not-allowed}

.count-chip{
  flex:none;padding:5px 11px;border-radius:999px;
  font:600 11.5px/1.4 var(--font);color:var(--text-2);white-space:nowrap;
  background:rgba(255,255,255,.04);border:1px solid var(--line);
}

.txn-id{font:600 12.5px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace}
.txn-device .name{display:block;font-size:12.5px;font-weight:500}
.txn-device .id{display:block;margin-top:2px;font:500 11px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-2)}
.txn-device .unassigned{font-size:12px;color:rgba(143,168,195,.8);font-style:italic}
.txn-phone{font:500 12.5px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace}
.txn-amount{font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.txn-amount small{margin-left:5px;font-size:10.5px;font-weight:600;color:var(--text-2)}
`;
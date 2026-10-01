/** Component styles: stat cards, unlock gate, forms, badges, battery, tables. */
export const COMPONENTS = `
/* ---------------- Stat card ---------------- */
.stat{padding:18px 20px 16px;display:flex;flex-direction:column;gap:12px;overflow:hidden}
.stat-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
.stat-icon{
  width:40px;height:40px;flex:none;border-radius:12px;display:grid;place-items:center;
  transition:box-shadow var(--t-mid) var(--ease);
}
.stat-label{
  margin-left:auto;text-align:right;
  font:700 9.5px/1.3 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--text-2);
}
.stat-value{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.stat-amount{font:800 30px/1.05 var(--font-display);letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.stat-unit{font-size:13px;font-weight:600;color:var(--text-2)}
.stat-sub{margin-top:9px;font-size:12.5px;color:var(--text-2);line-height:1.45}
.stat-foot{
  display:flex;align-items:center;gap:7px;
  margin-top:12px;padding-top:12px;border-top:1px solid var(--line-soft);
  font-size:12px;color:var(--text-2);
}
.stat-delta{display:inline-flex;align-items:center;gap:5px;font-weight:600;color:var(--success)}
.stat-delta.is-down{color:var(--danger)}
.stat-spark{flex:none;opacity:.95}

/* An emptied amount span would collapse to zero width, so skeletons get a floor. */
.stat-amount.skel{display:inline-block;min-width:148px;height:32px;vertical-align:middle}
.stat-amount.skel + .stat-unit{opacity:.4}

/* Accent variants drive icon tint, delta colour and sparkline stroke. */
.stat.teal .stat-icon{color:var(--success);background:rgba(0,214,143,.11);box-shadow:inset 0 0 0 1px rgba(0,214,143,.22)}
.stat.teal .stat-amount{color:#EAFFF8}
.stat.teal{--spark:#00D68F}
.stat.blue .stat-icon{color:var(--blue);background:rgba(22,131,255,.12);box-shadow:inset 0 0 0 1px rgba(22,131,255,.24)}
.stat.blue .stat-amount{color:#EAF3FF}
.stat.blue{--spark:#1683FF}
.stat.blue .stat-delta{color:#7FB6FF}
.stat.purple .stat-icon{color:#A78BFA;background:rgba(124,58,237,.14);box-shadow:inset 0 0 0 1px rgba(124,58,237,.26)}
.stat.purple .stat-amount{color:#F3EEFF}
.stat.purple{--spark:#7C3AED}
.stat.purple .stat-delta{color:#C4B5FD}

@keyframes draw-line{from{stroke-dashoffset:var(--len,180)}to{stroke-dashoffset:0}}
.stat-spark path.spark-line{
  stroke:var(--spark);stroke-width:2;fill:none;stroke-linecap:round;stroke-linejoin:round;
  stroke-dasharray:var(--len,180);animation:draw-line 1.1s var(--ease) both;
}

/* ---------------- Unlock gate ---------------- */
.gate{padding:20px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.gate-copy{display:flex;align-items:center;gap:14px;min-width:0}
.gate-icon{
  width:44px;height:44px;flex:none;border-radius:13px;display:grid;place-items:center;
  color:var(--primary);background:rgba(0,229,195,.10);
  box-shadow:inset 0 0 0 1px rgba(0,229,195,.22);
}
.gate-title{font:700 14.5px/1.3 var(--font-display)}
.gate-sub{margin-top:3px;font-size:12.5px;color:var(--text-2);line-height:1.45}
.gate-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.key-field{position:relative;display:flex;align-items:center;min-width:240px}
.key-field .ico{position:absolute;left:12px;color:var(--text-2);pointer-events:none}
.key-field input{
  width:100%;height:40px;padding:0 40px 0 36px;
  border-radius:var(--r-sm);border:1px solid var(--line);background:rgba(255,255,255,.04);
  font-size:13px;letter-spacing:.02em;
  transition:border-color var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease);
}
.key-field input:focus{outline:none;border-color:rgba(0,229,195,.55);box-shadow:0 0 0 3px rgba(0,229,195,.12)}
.key-field.is-revealed input{letter-spacing:normal}
.key-toggle{
  position:absolute;right:6px;width:28px;height:28px;border-radius:8px;
  display:grid;place-items:center;color:var(--text-2);
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease);
}
.key-toggle:hover{color:var(--primary);background:rgba(0,229,195,.10)}
.key-toggle .eye-closed{display:none}
.key-field.is-revealed .key-toggle .eye-open{display:none}
.key-field.is-revealed .key-toggle .eye-closed{display:block}
`;
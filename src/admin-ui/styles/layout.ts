/** App shell: fixed sidebar and sticky header. */
export const LAYOUT = `
.app{position:relative;z-index:1;min-height:100vh}

/* ---------------- Sidebar ---------------- */
.sidebar{
  position:fixed;inset:0 auto 0 0;z-index:60;
  width:var(--sidebar-w);
  display:flex;flex-direction:column;
  background:linear-gradient(180deg,#07172C 0%,#050F1F 100%);
  border-right:1px solid var(--line);
}
.brand{display:flex;align-items:center;gap:12px;padding:20px 18px}
.brand-mark{
  width:42px;height:42px;flex:none;border-radius:13px;
  display:grid;place-items:center;color:#032B26;
  background:linear-gradient(135deg,var(--primary),#14C9FF);
  box-shadow:0 8px 22px rgba(0,229,195,.26);
}
.brand-text{min-width:0}
.brand-name{
  font:800 11.5px/1.25 var(--font-display);
  letter-spacing:.10em;color:var(--text);
}
.brand-tag{margin-top:3px;font-size:11px;color:var(--text-2);letter-spacing:.02em}

.nav{flex:1;overflow-y:auto;padding:6px 12px 12px}
.nav-label{
  padding:14px 10px 7px;font:700 9.5px/1 var(--font);
  letter-spacing:.14em;text-transform:uppercase;color:rgba(143,168,195,.62);
}
.nav-item{
  position:relative;display:flex;align-items:center;gap:11px;
  width:100%;padding:10px 11px;margin-bottom:2px;
  border-radius:11px;font-size:13.5px;font-weight:500;
  color:var(--text-2);text-align:left;
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease);
}
.nav-item .ico{color:rgba(143,168,195,.9);transition:color var(--t-fast) var(--ease)}
.nav-item:hover{color:var(--text);background:rgba(255,255,255,.05)}
.nav-item:hover .ico{color:var(--primary)}
.nav-item.is-active{
  color:#fff;font-weight:600;
  background:linear-gradient(100deg,rgba(0,229,195,.20),rgba(22,131,255,.16));
  box-shadow:inset 0 0 0 1px rgba(0,229,195,.24),0 6px 18px rgba(0,229,195,.12);
}
.nav-item.is-active .ico{color:var(--primary)}
.nav-divider{height:1px;margin:10px 8px;background:var(--line-soft)}

.sidebar-foot{
  padding:14px 16px;border-top:1px solid var(--line-soft);
  display:flex;align-items:center;gap:10px;
}
.foot-shield{
  width:32px;height:32px;flex:none;border-radius:10px;display:grid;place-items:center;
  color:var(--success);background:rgba(0,214,143,.10);
  box-shadow:inset 0 0 0 1px rgba(0,214,143,.22);
}
.foot-title{font-size:12px;font-weight:600}
.foot-sub{margin-top:2px;font-size:10.5px;color:var(--text-2);letter-spacing:.02em}

/* ---------------- Main column + header ---------------- */
.main{margin-left:var(--sidebar-w);min-width:0;display:flex;flex-direction:column}
.header{
  position:sticky;top:0;z-index:50;height:var(--header-h);
  display:flex;align-items:center;gap:14px;
  padding:0 26px;
  background:rgba(4,13,27,.82);
  backdrop-filter:blur(18px) saturate(140%);
  -webkit-backdrop-filter:blur(18px) saturate(140%);
  border-bottom:1px solid var(--line);
}
.nav-toggle{display:none}
.search{position:relative;flex:1;max-width:420px}
.search .ico{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--text-2);pointer-events:none}
.search input{
  width:100%;height:38px;padding:0 13px 0 38px;
  border-radius:10px;border:1px solid var(--line);
  background:rgba(255,255,255,.04);
  font-size:13px;
  transition:border-color var(--t-fast) var(--ease),background var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease);
}
.search input::placeholder{color:rgba(143,168,195,.75)}
.search input:focus{outline:none;border-color:rgba(0,229,195,.55);background:rgba(255,255,255,.06);box-shadow:0 0 0 3px rgba(0,229,195,.12)}

.header-right{margin-left:auto;display:flex;align-items:center;gap:12px}

@keyframes pulse-dot{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(0,214,143,.5)}50%{opacity:.75;box-shadow:0 0 0 6px rgba(0,214,143,0)}}
.system-status{
  display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 13px;
  border-radius:999px;font-size:12.5px;font-weight:600;color:#BDF5E0;
  background:rgba(0,214,143,.09);border:1px solid rgba(0,214,143,.26);
}
.system-status .dot{width:7px;height:7px;border-radius:50%;background:var(--success);animation:pulse-dot 2.4s ease-in-out infinite}
.system-status.is-offline{color:#FFD6D6;background:rgba(239,68,68,.09);border-color:rgba(239,68,68,.3)}
.system-status.is-offline .dot{background:var(--danger)}

/* Live-stream indicator: green when SSE is connected, muted while polling. */
.stream-status{
  display:inline-flex;align-items:center;gap:8px;height:34px;padding:0 13px;
  border-radius:999px;font-size:12.5px;font-weight:600;color:var(--text-2);
  background:rgba(255,255,255,.04);border:1px solid var(--line);
}
.stream-status .dot{width:7px;height:7px;border-radius:50%;background:rgba(143,168,195,.7)}
.stream-status.is-live{color:#BDF5E0;background:rgba(0,229,195,.09);border-color:rgba(0,229,195,.26)}
.stream-status.is-live .dot{background:var(--primary);animation:pulse-dot 2.4s ease-in-out infinite}
@media(max-width:720px){ .stream-status{display:none} }

.icon-btn{
  position:relative;width:36px;height:36px;flex:none;
  display:grid;place-items:center;border-radius:10px;color:var(--text-2);
  border:1px solid transparent;
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease);
}
.icon-btn:hover{color:var(--primary);background:rgba(0,229,195,.10);border-color:var(--line)}
.notif-badge{
  position:absolute;top:3px;right:2px;min-width:15px;height:15px;padding:0 4px;
  display:none;place-items:center;border-radius:8px;
  background:var(--danger);color:#fff;font:700 9.5px/15px var(--font);
  box-shadow:0 0 0 2px #04101F;
}
.notif-badge.has-items{display:grid}

.admin{display:flex;align-items:center;gap:10px;padding:4px 10px 4px 4px;border-radius:12px;border:1px solid transparent;transition:background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease)}
.admin:hover{background:rgba(255,255,255,.05);border-color:var(--line)}
.admin-avatar{
  width:34px;height:34px;flex:none;border-radius:10px;display:grid;place-items:center;
  font:800 12px/1 var(--font-display);color:#032B26;
  background:linear-gradient(135deg,var(--primary),#14C9FF);
}
.admin-name{font-size:13px;font-weight:600;line-height:1.25}
.admin-role{font-size:11px;color:var(--text-2);line-height:1.25}
`;
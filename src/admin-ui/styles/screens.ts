/**
 * Screen-level styles: the balance card, summary tiles, transaction cards,
 * device rows, the payout form, device details, quick actions, settings and the
 * notification feed.
 */
export const SCREENS = `
/* ---------------- Screens: one visible at a time ---------------- */
.screen{display:flex;flex-direction:column;gap:16px;animation:screen-in var(--t-mid) var(--ease)}
.screen[hidden]{display:none}
@keyframes screen-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.screen.is-loading-view{opacity:.7;pointer-events:none}

/* ---------------- Home: balance hero ---------------- */
.greet{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 4px}
.greet-hello{font:800 22px/1.2 var(--font-display);letter-spacing:-.02em}
.greet-sub{margin-top:3px;font-size:12.5px;color:var(--text-2)}

.balance{padding:20px;overflow:hidden}
/* Accent bloom behind the hero amount. */
.balance::after{
  content:'';position:absolute;top:-70px;right:-50px;width:230px;height:230px;
  border-radius:50%;pointer-events:none;
  background:radial-gradient(circle,rgba(168,85,247,.22),transparent 68%);
}
.balance-top{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative}
.balance-label{font:700 10.5px/1 var(--font);letter-spacing:.14em;text-transform:uppercase;color:var(--text-2)}
.balance-icon{
  width:38px;height:38px;border-radius:13px;display:grid;place-items:center;flex:none;
  color:var(--neon);background:rgba(168,85,247,.12);
  box-shadow:inset 0 0 0 1px rgba(168,85,247,.26);
}
.balance-value{position:relative;margin-top:14px;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.balance-amount{
  position:relative;
  font:800 34px/1.05 var(--font-display);letter-spacing:-.03em;
  font-variant-numeric:tabular-nums;color:#F3F0FF;
}
.balance-unit{font-size:13px;font-weight:600;color:var(--text-2)}
/* An emptied amount span would collapse to zero width, so skeletons get a floor. */
.balance-amount.skel{display:inline-block;min-width:190px;height:36px;vertical-align:middle}
.balance-foot{
  position:relative;margin-top:14px;padding-top:13px;border-top:1px solid var(--line-soft);
  display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;color:var(--text-2);
}
.trend{
  display:inline-flex;align-items:center;gap:5px;
  height:26px;padding:0 10px;border-radius:var(--r-pill);
  font:700 12px/1 var(--font);font-variant-numeric:tabular-nums;
  color:#7BF3C6;background:rgba(0,224,143,.13);box-shadow:inset 0 0 0 1px rgba(0,224,143,.28);
}
.trend.is-down{color:#FFC4CE;background:rgba(255,77,109,.13);box-shadow:inset 0 0 0 1px rgba(255,77,109,.28)}

/* ---------------- Home: 2x2 summary grid ---------------- */
.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.tile{
  display:flex;flex-direction:column;gap:9px;
  padding:15px;border-radius:var(--r-lg);
  background:linear-gradient(158deg,rgba(12,34,66,.86),rgba(6,18,38,.82));
  border:1px solid var(--line-soft);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.04);
  transition:border-color var(--t-mid) var(--ease),transform var(--t-mid) var(--ease);
}
.tile:active{transform:scale(.98)}
.tile-icon{
  width:34px;height:34px;border-radius:11px;display:grid;place-items:center;
  color:var(--neon);background:rgba(168,85,247,.11);box-shadow:inset 0 0 0 1px rgba(168,85,247,.22);
}
.tile-label{font:700 10px/1.2 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)}
.tile-value{font:800 19px/1.1 var(--font-display);letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.tile-value.skel{display:block;min-width:70px;height:20px}
.tile-foot{font-size:11px;color:var(--text-3)}
.tile.green .tile-icon{color:var(--success);background:rgba(0,224,143,.11);box-shadow:inset 0 0 0 1px rgba(0,224,143,.22)}
.tile.blue .tile-icon{color:var(--blue);background:rgba(22,131,255,.12);box-shadow:inset 0 0 0 1px rgba(22,131,255,.24)}
.tile.purple .tile-icon{color:#A78BFA;background:rgba(124,58,237,.14);box-shadow:inset 0 0 0 1px rgba(124,58,237,.26)}
.tile.blue .tile-value{color:#EAF3FF}
.tile.purple .tile-value{color:#F3EEFF}

/* ---------------- Lists: transactions, devices, activity, notifications ---------------- */
.list{display:flex;flex-direction:column;gap:10px;padding:0 14px 14px}

.txn{
  display:flex;align-items:center;gap:13px;
  padding:13px;border-radius:var(--r-lg);
  background:linear-gradient(158deg,rgba(12,34,66,.72),rgba(6,18,38,.66));
  border:1px solid var(--line-soft);
  transition:border-color var(--t-fast) var(--ease),transform var(--t-fast) var(--ease);
}
.txn:active{transform:scale(.985)}
.txn-icon{
  width:40px;height:40px;flex:none;border-radius:13px;display:grid;place-items:center;
  color:var(--neon);background:rgba(168,85,247,.11);box-shadow:inset 0 0 0 1px rgba(168,85,247,.2);
}
.txn-icon.blue{color:var(--blue);background:rgba(22,131,255,.13);box-shadow:inset 0 0 0 1px rgba(22,131,255,.24)}
.txn-icon.danger{color:var(--error);background:rgba(255,77,109,.12);box-shadow:inset 0 0 0 1px rgba(255,77,109,.24)}
.txn-icon.muted{color:var(--text-3);background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line-soft)}
.txn-main{flex:1;min-width:0}
.txn-top{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.txn-amount{font:800 15px/1.2 var(--font-display);font-variant-numeric:tabular-nums;white-space:nowrap}
.txn-amount small{font-size:10.5px;font-weight:700;color:var(--text-3);margin-left:3px}
.txn-ref{margin-top:3px;font-size:12px;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.txn-meta{margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;color:var(--text-3)}
.txn-meta .sep{opacity:.5}
/* Device tag on a transaction: which phone ran the payout. */
.device-tag{
  display:inline-flex;align-items:center;gap:5px;max-width:100%;
  padding:2px 8px;border-radius:var(--r-pill);
  font-size:10.5px;font-weight:600;color:#BFE9FF;
  background:rgba(22,131,255,.10);box-shadow:inset 0 0 0 1px rgba(22,131,255,.22);
}
.device-tag .ico{width:11px;height:11px}
.device-tag span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.device-tag.is-auto{color:var(--text-2);background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line-soft)}

/* Device fleet row */
.dev-row{
  display:flex;align-items:center;gap:13px;
  width:100%;padding:13px;border-radius:var(--r-lg);text-align:left;
  background:linear-gradient(158deg,rgba(12,34,66,.72),rgba(6,18,38,.66));
  border:1px solid var(--line-soft);
  transition:border-color var(--t-fast) var(--ease),transform var(--t-fast) var(--ease);
}
.dev-row:active{transform:scale(.985)}
.dev-main{flex:1;min-width:0}
.dev-top{display:flex;align-items:center;gap:9px}
.dev-name{font-size:14px;font-weight:600;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dev-id{margin-top:3px;font-size:11px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dev-meta{margin-top:7px;display:flex;align-items:center;gap:9px;flex-wrap:wrap;font-size:11px;color:var(--text-2)}
.dev-meta-item{display:inline-flex;align-items:center;gap:5px}
.dev-meta-item .ico{width:13px;height:13px;color:var(--text-3)}
.dev-chevron{color:var(--text-3);flex:none}

/* Battery bar, reused by the fleet row and the device detail screen. */
.battery{display:flex;align-items:center;gap:8px}
.battery-track{width:46px;height:6px;flex:none;border-radius:3px;overflow:hidden;background:rgba(255,255,255,.10)}
.battery-fill{height:100%;border-radius:3px;background:var(--success);box-shadow:0 0 8px rgba(0,224,143,.6)}
.battery-value{font-size:11.5px;font-weight:700;color:var(--text-2);font-variant-numeric:tabular-nums;min-width:32px}
.battery.low .battery-fill{background:var(--amber);box-shadow:0 0 8px rgba(255,176,32,.6)}
.battery.low .battery-value{color:#FFD79B}
.battery.critical .battery-fill{background:var(--error);box-shadow:0 0 8px rgba(255,77,109,.6)}
.battery.critical .battery-value{color:#FFC4CE}
.battery.big .battery-track{width:120px;height:9px;border-radius:5px}
.battery.big .battery-value{font-size:14px;min-width:44px}

.net{
  display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:var(--r-pill);
  font:700 10.5px/1 var(--font);letter-spacing:.04em;
  color:#BFE9FF;background:rgba(22,131,255,.12);box-shadow:inset 0 0 0 1px rgba(22,131,255,.24);
}
.net.slow{color:#FFD79B;background:rgba(255,176,32,.12);box-shadow:inset 0 0 0 1px rgba(255,176,32,.24)}
.net.down{color:var(--text-3);background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line-soft)}

/* ---------------- Search field ---------------- */
.search{position:relative;flex:1;min-width:0}
.search .ico{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:var(--text-3);pointer-events:none}
.search input{
  width:100%;height:var(--tap);padding:0 14px 0 40px;
  border-radius:var(--r-md);border:1px solid var(--line);background:rgba(255,255,255,.04);
  font-size:14px;-webkit-appearance:none;
  transition:border-color var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease);
}
.search input::placeholder{color:var(--text-3)}
.search input:focus{outline:none;border-color:rgba(168,85,247,.55);box-shadow:0 0 0 3px rgba(168,85,247,.12)}

/* ---------------- Filter tabs (All / Cash-in / Withdrawal / Failed) ---------------- */
.tabs{
  display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;
  padding:2px 16px 4px;scrollbar-width:none;
}
.tabs::-webkit-scrollbar{display:none}
.tab{
  flex:none;min-height:38px;padding:0 15px;border-radius:var(--r-pill);
  font-size:12.5px;font-weight:600;white-space:nowrap;
  color:var(--text-2);background:rgba(255,255,255,.04);border:1px solid var(--line-soft);
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease);
  -webkit-tap-highlight-color:transparent;
}
.tab:hover{color:var(--text);border-color:var(--line)}
.tab.is-active{
  color:#2E1065;font-weight:700;
  background:linear-gradient(135deg,var(--neon),var(--neon-green));
  border-color:transparent;box-shadow:0 6px 18px rgba(168,85,247,.28);
}
.tab-count{margin-left:6px;opacity:.7;font-variant-numeric:tabular-nums}

/* ---------------- Payout form ---------------- */
.form{display:flex;flex-direction:column;gap:15px;padding:0 16px 16px}
.form-grid{display:flex;flex-direction:column;gap:15px}
.field-group{display:flex;flex-direction:column;gap:7px;min-width:0}
.field-label{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  font:700 10.5px/1 var(--font);letter-spacing:.12em;text-transform:uppercase;color:var(--text-2);
}
.field-label .optional{font-weight:500;letter-spacing:.04em;text-transform:none;color:var(--text-3)}
.field-note{font:600 10.5px/1 var(--font);letter-spacing:.02em;text-transform:none;color:var(--text-3)}
.field-note.is-live{color:var(--neon)}

.input-wrap{position:relative;display:flex;align-items:center}
.input-icon{position:absolute;left:14px;display:grid;place-items:center;color:var(--text-3);pointer-events:none}
.input-wrap input,.field-group textarea{
  width:100%;min-height:var(--tap);padding:13px 14px;
  border-radius:var(--r-md);border:1px solid var(--line);
  background:rgba(255,255,255,.04);font-size:15px;
  transition:border-color var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease);
}
.input-wrap.has-icon input{padding-left:42px}
.input-wrap .suffix{
  position:absolute;right:14px;font:700 11.5px/1 var(--font);
  letter-spacing:.06em;color:var(--text-3);pointer-events:none;
}
.input-wrap input::placeholder,.field-group textarea::placeholder{color:var(--text-3)}
.input-wrap input:focus,.field-group textarea:focus{
  outline:none;border-color:rgba(168,85,247,.55);box-shadow:0 0 0 3px rgba(168,85,247,.12);
}
.field-group textarea{min-height:74px;resize:vertical;font:inherit;font-size:14px;line-height:1.5}
.field-group.has-error input{border-color:rgba(255,77,109,.65);box-shadow:0 0 0 3px rgba(255,77,109,.12)}
.field-error{display:none;align-items:center;gap:5px;font-size:11.5px;color:#FFC4CE}
.field-group.has-error .field-error{display:flex}

/* Quick amount chips */
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chip{
  flex:1;min-width:74px;min-height:40px;padding:0 10px;border-radius:var(--r-md);
  font:700 13px/1 var(--font);font-variant-numeric:tabular-nums;
  color:var(--text);background:rgba(255,255,255,.04);border:1px solid var(--line-soft);
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease);
  -webkit-tap-highlight-color:transparent;
}
.chip:hover{border-color:var(--line)}
.chip.is-active{
  color:#2E1065;background:linear-gradient(135deg,var(--neon),var(--neon-green));
  border-color:transparent;box-shadow:0 6px 18px rgba(168,85,247,.28);
}

/* Custom listbox (channel / target device) */
.dropdown{position:relative}
.select{
  display:flex;align-items:center;gap:10px;width:100%;
  min-height:var(--tap);padding:12px 14px;border-radius:var(--r-md);text-align:left;
  border:1px solid var(--line);background:rgba(255,255,255,.04);
  transition:border-color var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease);
  -webkit-tap-highlight-color:transparent;
}
.select:hover{border-color:var(--line-strong)}
.select:focus-visible{border-color:rgba(168,85,247,.55);box-shadow:0 0 0 3px rgba(168,85,247,.12)}
.select-value{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
.select-value span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.select .chevron{color:var(--text-3);flex:none;transition:transform var(--t-fast) var(--ease)}
.dropdown.open .select .chevron{transform:rotate(180deg)}
.select-menu{
  position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:40;
  max-height:264px;overflow-y:auto;-webkit-overflow-scrolling:touch;
  padding:6px;border-radius:var(--r-md);
  background:rgba(8,24,48,.98);backdrop-filter:blur(18px);
  border:1px solid var(--line);box-shadow:var(--shadow);
  opacity:0;visibility:hidden;transform:translateY(-6px);
  transition:opacity var(--t-fast) var(--ease),transform var(--t-fast) var(--ease),visibility var(--t-fast);
}
.dropdown.open .select-menu{opacity:1;visibility:visible;transform:none}
.option{
  display:flex;align-items:center;gap:10px;
  min-height:48px;padding:8px 10px;border-radius:10px;cursor:pointer;
  transition:background var(--t-fast) var(--ease);
}
.option:hover,.option:focus{background:rgba(255,255,255,.06);outline:none}
.option[aria-disabled="true"]{opacity:.42;cursor:not-allowed}
.option-copy{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.option-copy strong{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.option-copy small{font-size:11px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.option .check{color:var(--neon);opacity:0;flex:none}
.option.selected{background:rgba(168,85,247,.10)}
.option.selected .check{opacity:1}
.mini-badge{
  flex:none;height:22px;padding:0 9px;display:inline-flex;align-items:center;border-radius:var(--r-pill);
  font:700 10px/1 var(--font);letter-spacing:.05em;text-transform:uppercase;
  color:#E9D5FF;background:rgba(168,85,247,.12);box-shadow:inset 0 0 0 1px rgba(168,85,247,.24);
}
.mini-badge.auto{color:var(--text-2);background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line-soft)}

.form-feedback{
  display:none;align-items:center;gap:8px;
  padding:11px 13px;border-radius:var(--r-sm);font-size:12.5px;font-weight:500;
}
.form-feedback.show{display:flex}
.form-feedback.success{color:#C7F9E6;background:rgba(0,224,143,.10);box-shadow:inset 0 0 0 1px rgba(0,224,143,.28)}
.form-feedback.error{color:#FFD6DE;background:rgba(255,77,109,.10);box-shadow:inset 0 0 0 1px rgba(255,77,109,.28)}
.form-hint{display:flex;align-items:flex-start;gap:8px;font-size:11.5px;line-height:1.55;color:var(--text-3)}
.form-hint .ico{margin-top:2px;flex:none}
.form-hint strong{color:var(--text-2);font-weight:600}



  color:var(--neon);background:rgba(168,85,247,.11);box-shadow:inset 0 0 0 1px rgba(168,85,247,.22);
}
.tile-label{font:700 10px/1.2 var(--font);letter-spacing:.1em;text-transform:uppercase;color:var(--text-3)}
.tile-value{font:800 19px/1.1 var(--font-display);letter-spacing:-.02em;font-variant-numeric:tabular-nums}

/* ---------------- Device detail ---------------- */
.detail-hero{display:flex;align-items:center;gap:14px;padding:20px 18px 16px}
.detail-avatar{
  width:56px;height:56px;flex:none;border-radius:19px;display:grid;place-items:center;
  color:var(--neon);background:rgba(168,85,247,.11);
  box-shadow:inset 0 0 0 1px rgba(168,85,247,.24),0 10px 26px rgba(168,85,247,.16);
}
.detail-name{font:700 17px/1.25 var(--font-display);letter-spacing:-.01em}
.detail-id{margin-top:4px;font-size:11.5px;color:var(--text-3);word-break:break-all}
.detail-state{margin-top:9px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}

/* Label / value rows, the device detail's main content. */
.rows{display:flex;flex-direction:column;padding:0 18px 6px}
.row{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  min-height:54px;padding:9px 0;border-bottom:1px solid var(--line-soft);
}
.row:last-child{border-bottom:0}
.row-label{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--text-2);flex:none}
.row-label .ico{width:16px;height:16px;color:var(--text-3)}
.row-value{
  font-size:13px;font-weight:600;text-align:right;min-width:0;
  font-variant-numeric:tabular-nums;word-break:break-word;
}
.row-value.is-muted{color:var(--text-3);font-weight:500}

/* ---------------- Quick actions ---------------- */
.qa-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 16px 16px}
.qa-item{
  display:flex;flex-direction:column;align-items:flex-start;gap:11px;
  min-height:118px;padding:16px;border-radius:var(--r-lg);text-align:left;
  background:linear-gradient(158deg,rgba(12,34,66,.86),rgba(6,18,38,.82));
  border:1px solid var(--line-soft);
  transition:border-color var(--t-fast) var(--ease),transform var(--t-fast) var(--ease);
}
.qa-item:active{transform:scale(.975)}
.qa-item:hover{border-color:var(--line)}
.qa-icon{
  width:38px;height:38px;border-radius:12px;display:grid;place-items:center;flex:none;
  color:var(--neon);background:rgba(168,85,247,.11);box-shadow:inset 0 0 0 1px rgba(168,85,247,.22);
}
.qa-item.blue .qa-icon{color:var(--blue);background:rgba(22,131,255,.12);box-shadow:inset 0 0 0 1px rgba(22,131,255,.24)}
.qa-item.purple .qa-icon{color:#A78BFA;background:rgba(124,58,237,.14);box-shadow:inset 0 0 0 1px rgba(124,58,237,.26)}
.qa-item.orange .qa-icon{color:var(--amber);background:rgba(255,176,32,.12);box-shadow:inset 0 0 0 1px rgba(255,176,32,.24)}
.qa-title{font:700 13.5px/1.3 var(--font-display)}
.qa-sub{margin-top:3px;font-size:11.5px;color:var(--text-3);line-height:1.4}

/* ---------------- Profile & settings ---------------- */
.setting-row{
  display:flex;align-items:center;gap:13px;width:100%;
  min-height:60px;padding:12px 18px;text-align:left;
  border-bottom:1px solid var(--line-soft);
  transition:background var(--t-fast) var(--ease);
}
.setting-row:last-child{border-bottom:0}
button.setting-row:hover{background:rgba(255,255,255,.035)}
.setting-icon{
  width:36px;height:36px;flex:none;border-radius:12px;display:grid;place-items:center;
  color:var(--neon);background:rgba(168,85,247,.11);box-shadow:inset 0 0 0 1px rgba(168,85,247,.2);
}
.setting-icon.blue{color:var(--blue);background:rgba(22,131,255,.12);box-shadow:inset 0 0 0 1px rgba(22,131,255,.24)}
.setting-icon.purple{color:#A78BFA;background:rgba(124,58,237,.14);box-shadow:inset 0 0 0 1px rgba(124,58,237,.24)}
.setting-icon.danger{color:var(--error);background:rgba(255,77,109,.12);box-shadow:inset 0 0 0 1px rgba(255,77,109,.24)}
.setting-main{flex:1;min-width:0}
.setting-title{font-size:14px;font-weight:600;line-height:1.3}
.setting-sub{margin-top:3px;font-size:11.5px;color:var(--text-3);line-height:1.4}
.setting-chevron{color:var(--text-3);flex:none}

/* iOS-style switch, used for the notifications toggle. */
.switch{
  position:relative;width:50px;height:30px;flex:none;border-radius:var(--r-pill);
  background:rgba(255,255,255,.10);border:1px solid var(--line-soft);
  transition:background var(--t-mid) var(--ease),border-color var(--t-mid) var(--ease);
  -webkit-tap-highlight-color:transparent;
}
.switch::after{
  content:'';position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;
  background:#8FA8C3;box-shadow:0 2px 6px rgba(0,0,0,.4);
  transition:transform var(--t-mid) var(--ease),background var(--t-mid) var(--ease);
}
.switch[aria-checked="true"]{background:linear-gradient(135deg,var(--neon),var(--neon-green));border-color:transparent}
.switch[aria-checked="true"]::after{transform:translateX(20px);background:#fff}
/* A bank with no USSD flow yet cannot be enabled, so its switch is inert. */
.switch:disabled{opacity:.4;cursor:not-allowed}

/* Per-device bank toggle rows. The label stacks the bank name over an optional
   note ("No USSD flow yet") for a bank the handset cannot run. */
.bank-row .row-label{flex-direction:column;align-items:flex-start;gap:2px}
.row-note{font-size:10.5px;font-weight:600;letter-spacing:.02em;color:var(--text-3)}

/* ---------------- Notifications feed ---------------- */
.notif{
  display:flex;align-items:flex-start;gap:12px;
  padding:13px;border-radius:var(--r-lg);
  background:linear-gradient(158deg,rgba(12,34,66,.78),rgba(6,18,38,.72));
  border:1px solid var(--line-soft);
}
.notif.is-unread{border-color:rgba(168,85,247,.28);box-shadow:inset 0 0 0 1px rgba(168,85,247,.10)}
.notif-icon{
  width:36px;height:36px;flex:none;border-radius:12px;display:grid;place-items:center;
  color:var(--neon);background:rgba(168,85,247,.11);box-shadow:inset 0 0 0 1px rgba(168,85,247,.2);
}
.notif-icon.danger{color:var(--error);background:rgba(255,77,109,.12);box-shadow:inset 0 0 0 1px rgba(255,77,109,.22)}
.notif-icon.warn{color:var(--amber);background:rgba(255,176,32,.12);box-shadow:inset 0 0 0 1px rgba(255,176,32,.22)}
.notif-icon.blue{color:var(--blue);background:rgba(22,131,255,.12);box-shadow:inset 0 0 0 1px rgba(22,131,255,.22)}
.notif-main{flex:1;min-width:0}
.notif-title{font-size:13.5px;font-weight:600;line-height:1.35}
.notif-body{margin-top:3px;font-size:11.5px;color:var(--text-2);line-height:1.45}
.notif-time{margin-top:6px;font-size:10.5px;color:var(--text-3)}

/* Definition grid reused by the About panel. */
/* Definition grid reused by the About panel. */
.defs{display:flex;flex-direction:column;padding:0 18px 16px}
`;

/** Routed views, toolbars, settings grids and the view loading state. */
export const VIEWS_CSS = `
/* Only one routed view is mounted-visible at a time. */
.view{display:flex;flex-direction:column;gap:22px;animation:view-in var(--t-mid) var(--ease)}
.view[hidden]{display:none}
@keyframes view-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.view.is-loading-view{opacity:.72;pointer-events:none}

/* Toolbar: search plus filter selects, above every routed table. */
.toolbar{
  display:flex;align-items:center;gap:10px;flex-wrap:wrap;
  padding:0 20px 16px;
}
.toolbar-search{position:relative;flex:1;min-width:200px}
.toolbar-search .ico{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--text-2);pointer-events:none}
.toolbar-search input{
  width:100%;height:38px;padding:0 12px 0 34px;
  border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.04);
  font-size:13px;
  transition:border-color var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease);
}
.toolbar-search input:focus{outline:none;border-color:rgba(0,229,195,.55);box-shadow:0 0 0 3px rgba(0,229,195,.12)}
.toolbar-field select{
  height:38px;padding:0 30px 0 12px;border-radius:10px;
  border:1px solid var(--line);background:rgba(255,255,255,.04);
  font-size:12.5px;color:var(--text);cursor:pointer;
  transition:border-color var(--t-fast) var(--ease);
}
.toolbar-field select:focus{outline:none;border-color:rgba(0,229,195,.55)}
.toolbar-field select option{background:#081A30;color:var(--text)}

/* Settings view: two readable definition grids. */
.settings-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:18px;padding:0 20px 20px}
.settings-panel{
  padding:16px;border-radius:var(--r-md);
  background:rgba(255,255,255,.028);border:1px solid var(--line-soft);
}
.settings-h{
  margin:0 0 12px;font:700 10px/1 var(--font);
  letter-spacing:.13em;text-transform:uppercase;color:var(--primary);
}
.settings-list{margin:0;display:flex;flex-direction:column;gap:1px}
.settings-row{
  display:flex;align-items:center;justify-content:space-between;gap:16px;
  padding:9px 0;border-bottom:1px solid var(--line-soft);
}
.settings-row:last-child{border-bottom:0}
.settings-row dt{margin:0;font-size:12.5px;color:var(--text-2)}
.settings-row dd{
  margin:0;font-size:12.5px;font-weight:600;text-align:right;
  font-variant-numeric:tabular-nums;word-break:break-word;
}

.muted-action{color:rgba(143,168,195,.6);font-size:13px}

@media(max-width:720px){
  .toolbar{padding:0 16px 14px}
  .toolbar-search{flex-basis:100%}
  .settings-grid{grid-template-columns:1fr;padding:0 16px 16px}
  .settings-row{align-items:flex-start;flex-direction:column;gap:2px}
  .settings-row dd{text-align:left}
}
`;
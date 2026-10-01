/** Form controls and the custom listbox used for channel + target device. */
export const CONTROLS = `
@keyframes fade-up{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.form{padding:0 20px 20px;display:flex;flex-direction:column;gap:16px}
.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.field-group{display:flex;flex-direction:column;gap:7px;min-width:0}
.field-group.span-2{grid-column:1 / -1}
.field-label{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--text-2);
}
.field-label .optional{font-size:10px;font-weight:500;letter-spacing:.04em;text-transform:none;color:rgba(143,168,195,.7)}
.field-note{font-size:10.5px;font-weight:500;letter-spacing:.02em;text-transform:none;color:var(--text-2)}
.field-note.is-live{color:var(--success)}
.field.has-error input{border-color:rgba(239,68,68,.6);box-shadow:0 0 0 3px rgba(239,68,68,.12)}
.field-error{display:none;font-size:11.5px;color:var(--danger);align-items:center;gap:5px}
.field.has-error .field-error{display:flex}

.input-wrap{position:relative;display:flex;align-items:center}
.input-wrap .input-icon{position:absolute;left:12px;color:var(--text-2);pointer-events:none}
.input-wrap .suffix{position:absolute;right:12px;font-size:11.5px;font-weight:600;color:var(--text-2);pointer-events:none}
input[type=text],input[type=password],input[type=number],input[type=search],textarea{
  width:100%;border-radius:var(--r-sm);border:1px solid var(--line);
  background:rgba(255,255,255,.04);
  padding:0 13px;height:42px;font-size:13.5px;
  transition:border-color var(--t-fast) var(--ease),background var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease);
}
.input-wrap.has-icon input{padding-left:38px}
textarea{height:auto;min-height:74px;padding:11px 13px;resize:vertical;line-height:1.5;font-family:inherit}
input:focus,textarea:focus{outline:none;border-color:rgba(0,229,195,.55);background:rgba(255,255,255,.06);box-shadow:0 0 0 3px rgba(0,229,195,.12)}
input::placeholder,textarea::placeholder{color:rgba(143,168,195,.68)}
input[type=number]{-moz-appearance:textfield}
input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
/* Custom listbox (channel + target device). */
.dropdown{position:relative}
.select{
  display:flex;align-items:center;gap:10px;width:100%;
  height:42px;padding:0 12px;
  border-radius:var(--r-sm);border:1px solid var(--line);background:rgba(255,255,255,.04);
  text-align:left;
  transition:border-color var(--t-fast) var(--ease),background var(--t-fast) var(--ease);
}
.select:hover{border-color:var(--line-strong);background:rgba(255,255,255,.06)}
.select-value{display:flex;align-items:center;gap:9px;min-width:0;flex:1;font-size:13.5px}
.select .chevron{color:var(--text-2);transition:transform var(--t-fast) var(--ease)}
.dropdown.open .select{border-color:rgba(0,229,195,.55);background:rgba(255,255,255,.07)}
.dropdown.open .select .chevron{transform:rotate(180deg)}
.select-menu{
  position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:30;margin:0;padding:6px;list-style:none;
  border-radius:var(--r-md);border:1px solid var(--line-strong);
  background:rgba(8,24,44,.98);backdrop-filter:blur(16px);
  box-shadow:var(--shadow);
  max-height:264px;overflow-y:auto;
  opacity:0;visibility:hidden;transform:translateY(-6px);
  transition:opacity var(--t-fast) var(--ease),transform var(--t-fast) var(--ease),visibility var(--t-fast);
}
.dropdown.open .select-menu{opacity:1;visibility:visible;transform:none}
.option{
  display:flex;align-items:center;gap:11px;
  padding:9px 10px;border-radius:10px;cursor:pointer;
  transition:background var(--t-fast) var(--ease);
}
.option:hover,.option:focus-visible{background:rgba(255,255,255,.06);outline:none}
.option[aria-disabled=true]{opacity:.42;cursor:not-allowed}
.option.selected{background:rgba(0,229,195,.10)}
.option-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.option-copy strong{font-size:13px;font-weight:600}
.option-copy small{font-size:11px;color:var(--text-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.option .check{color:var(--primary);opacity:0;transition:opacity var(--t-fast) var(--ease)}
.option.selected .check{opacity:1}

.channel-dot{width:8px;height:8px;flex:none;border-radius:50%}
.channel-dot.telebirr{background:#29B6F6;box-shadow:0 0 8px rgba(41,182,246,.55)}
.channel-dot.cbe{background:#F5C518;box-shadow:0 0 8px rgba(245,197,24,.5)}
.channel-dot.auto{background:#A78BFA;box-shadow:0 0 8px rgba(167,139,250,.5)}
.channel-dot.device{background:var(--primary);box-shadow:0 0 8px rgba(0,229,195,.55)}
.channel-dot.offline{background:#64748B;box-shadow:none}
.mini-badge{
  flex:none;padding:3px 8px;border-radius:7px;
  font:700 9.5px/1.4 var(--font);letter-spacing:.06em;text-transform:uppercase;
}
.mini-badge.auto{color:#C4B5FD;background:rgba(139,92,246,.16);box-shadow:inset 0 0 0 1px rgba(167,139,250,.40)}
.mini-badge.active{color:#7FF0D8;background:rgba(0,229,195,.14);box-shadow:inset 0 0 0 1px rgba(0,229,195,.34)}

.form-foot{display:flex;flex-direction:column;gap:12px}
.form-hint{display:flex;align-items:flex-start;gap:8px;font-size:11.5px;line-height:1.5;color:var(--text-2)}
.form-hint .ico{margin-top:1px;flex:none;color:rgba(143,168,195,.8)}
.form-hint strong{color:#C7D8EA;font-weight:600}

/* Inline submit feedback (success / error) inside the form. */
.form-feedback{
  display:none;align-items:flex-start;gap:9px;
  padding:11px 13px;border-radius:var(--r-sm);font-size:12.5px;line-height:1.45;
  animation:fade-up var(--t-mid) var(--ease);
}
.form-feedback.show{display:flex}
.form-feedback.success{color:#C7F9E6;background:rgba(0,214,143,.10);border:1px solid rgba(0,214,143,.30)}
.form-feedback.error{color:#FFD6D6;background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.32)}
.form-feedback .ico{flex:none;margin-top:1px}
`;
/** Base reset, typography and the shared card / button primitives. */
export const BASE = `
*,*::before,*::after{box-sizing:border-box}
html,body{height:100%}
body{
  margin:0;
  background:var(--bg-0);
  color:var(--text);
  font:14px/1.55 var(--font);
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  overflow-x:hidden;
}
/* Subtle radial lighting instead of a full-bleed gradient wash. */
body::before{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(900px 520px at 6% -6%,rgba(0,229,195,.10),transparent 62%),
    radial-gradient(820px 480px at 98% -10%,rgba(22,131,255,.12),transparent 60%),
    radial-gradient(1100px 780px at 50% 116%,rgba(124,58,237,.09),transparent 66%);
}
h1,h2,h3,h4,p{margin:0}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0}
a{color:inherit;text-decoration:none}
table{border-collapse:collapse;width:100%}
svg{display:block}
::selection{background:rgba(0,229,195,.30)}
:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.ico{flex:none}

/* --- Card: glassmorphism, hairline border, soft lift on hover --- */
.card{
  position:relative;
  background:linear-gradient(158deg,rgba(255,255,255,.045),rgba(255,255,255,.008) 46%,rgba(255,255,255,.020));
  backdrop-filter:blur(16px) saturate(140%);
  -webkit-backdrop-filter:blur(16px) saturate(140%);
  border:1px solid var(--line);
  border-radius:var(--r-lg);
  box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.05);
  transition:border-color var(--t-mid) var(--ease),box-shadow var(--t-mid) var(--ease),transform var(--t-mid) var(--ease);
}
.card.is-interactive:hover{
  border-color:var(--line-strong);
  box-shadow:var(--shadow),0 0 0 1px rgba(0,229,195,.10),inset 0 1px 0 rgba(255,255,255,.07);
  transform:translateY(-2px);
}
.card-head{
  display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
  padding:18px 20px 14px;
}
.card-title{font:700 15px/1.3 var(--font-display);letter-spacing:-.01em}
.card-sub{margin-top:4px;font-size:12.5px;color:var(--text-2);line-height:1.45}

/* --- Buttons --- */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:0 16px;height:40px;border-radius:var(--r-sm);
  font-size:13.5px;font-weight:600;letter-spacing:.01em;
  border:1px solid var(--line);
  background:rgba(255,255,255,.035);
  transition:background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease),
             transform var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease),opacity var(--t-fast) var(--ease);
  white-space:nowrap;
}
.btn:hover{background:rgba(255,255,255,.075);border-color:var(--line-strong)}
.btn:active{transform:translateY(1px)}
.btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
.btn-primary{
  background:linear-gradient(135deg,var(--primary),#14C9FF);
  border-color:transparent;color:#012B26;
  box-shadow:0 6px 20px rgba(0,229,195,.26);
}
.btn-primary:hover:not(:disabled){
  background:linear-gradient(135deg,#17F0D0,#35D2FF);
  box-shadow:0 8px 26px rgba(0,229,195,.36);
}
.btn-block{width:100%}
.btn.is-busy{opacity:.7;cursor:progress}
/* Sheen sweep on hover for the primary action. */
.btn-primary{position:relative;overflow:hidden}
.btn-primary::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(100deg,transparent 28%,rgba(255,255,255,.42) 50%,transparent 72%);
  transform:translateX(-130%);transition:transform .7s var(--ease);
}
.btn-primary:hover:not(:disabled)::before{transform:translateX(130%)}

/* --- Text link (e.g. "View All") --- */
.link-more{
  display:inline-flex;align-items:center;gap:6px;flex:none;
  font-size:12.5px;font-weight:600;color:var(--text-2);
  padding:6px 10px;margin:-6px -10px;border-radius:9px;
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease);
}
.link-more:hover{color:var(--primary);background:rgba(0,229,195,.08)}
.link-more .ico{transition:transform var(--t-fast) var(--ease)}
.link-more:hover .ico{transform:translateX(3px)}

/* --- Empty states --- */
.empty-state{
  display:flex;flex-direction:column;align-items:center;gap:10px;
  padding:30px 18px;color:var(--text-2);font-size:13px;text-align:center;
}
.empty-state .ico{width:34px;height:34px;color:rgba(143,168,195,.55)}

/* --- Loading skeletons --- */
@keyframes shimmer{100%{transform:translateX(100%)}}
.skel{
  position:relative;overflow:hidden;border-radius:7px;
  background:rgba(255,255,255,.055);
}
.skel::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent);
  animation:shimmer 1.35s infinite;
}
.skel-line{height:11px}
.skel-row{display:grid;grid-template-columns:1.4fr 1fr .7fr .8fr .7fr;gap:18px;padding:15px 20px}

/* --- Toast --- */
@keyframes toast-in{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
.toast{
  position:fixed;left:50%;bottom:26px;z-index:80;
  display:flex;align-items:center;gap:10px;
  max-width:min(560px,calc(100vw - 32px));padding:12px 16px;
  border-radius:var(--r-sm);border:1px solid var(--line-strong);
  background:rgba(10,27,48,.96);backdrop-filter:blur(14px);
  box-shadow:var(--shadow);font-size:13.5px;font-weight:500;
  opacity:0;pointer-events:none;transform:translateY(12px) scale(.97);
  transition:opacity var(--t-mid) var(--ease),transform var(--t-mid) var(--ease);
}
.toast.show{opacity:1;transform:none;animation:toast-in var(--t-mid) var(--ease)}
.toast.success{border-color:rgba(0,214,143,.42);color:#C7F9E6}
.toast.success .ico{color:var(--success)}
.toast.error{border-color:rgba(239,68,68,.46);color:#FFD6D6}
.toast.error .ico{color:var(--danger)}

@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin .85s linear infinite}
`;
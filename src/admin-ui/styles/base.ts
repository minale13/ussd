/** Base reset, typography and the shared card / button primitives. */
export const BASE = `
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0;
  min-height:100dvh;
  background:linear-gradient(180deg,var(--bg-1) 0%,var(--bg-0) 46%,#01040C 100%);
  background-attachment:fixed;
  color:var(--text);
  font:14px/1.55 var(--font);
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  overflow-x:hidden;
}
/* Aurora lighting behind the whole app. Fixed, so it does not repaint on scroll. */
body::before{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(760px 460px at 8% -4%,rgba(0,229,195,.16),transparent 62%),
    radial-gradient(680px 420px at 100% 2%,rgba(22,131,255,.15),transparent 60%),
    radial-gradient(900px 620px at 50% 112%,rgba(0,224,143,.10),transparent 66%);
}
h1,h2,h3,h4,p{margin:0}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer;background:none;border:0}
a{color:inherit;text-decoration:none}
ul{margin:0;padding:0;list-style:none}
svg{display:block}
::selection{background:rgba(0,229,195,.30)}
:focus-visible{outline:2px solid var(--neon);outline-offset:2px}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.ico{flex:none}

/* --- Card: glowing rounded panel, the base of every screen --- */
.card{
  position:relative;
  background:linear-gradient(158deg,rgba(10,30,60,.92),rgba(6,18,38,.88));
  backdrop-filter:blur(16px) saturate(140%);
  -webkit-backdrop-filter:blur(16px) saturate(140%);
  border:1px solid var(--line);
  border-radius:var(--r-xl);
  box-shadow:var(--glow),var(--shadow),inset 0 1px 0 rgba(255,255,255,.05);
  transition:border-color var(--t-mid) var(--ease),box-shadow var(--t-mid) var(--ease),transform var(--t-mid) var(--ease);
}
.card.is-interactive:active{transform:scale(.985)}
.card-head{
  display:flex;align-items:flex-start;justify-content:space-between;gap:14px;
  padding:18px 18px 12px;
}
.card-title{font:700 15.5px/1.3 var(--font-display);letter-spacing:-.01em}
.card-sub{margin-top:4px;font-size:12.5px;color:var(--text-2);line-height:1.45}

/* Section label above a group of cards, e.g. "RECENT ACTIVITY". */
.eyebrow{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:0 4px;
  font:700 10px/1 var(--font);letter-spacing:.15em;text-transform:uppercase;
  color:var(--text-3);
}

/* --- Buttons: 48px tall so they are comfortable thumb targets --- */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:0 18px;min-height:var(--tap);border-radius:var(--r-md);
  font-size:14px;font-weight:600;letter-spacing:.01em;
  border:1px solid var(--line);
  background:rgba(255,255,255,.04);
  transition:background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease),
             transform var(--t-fast) var(--ease),box-shadow var(--t-fast) var(--ease),opacity var(--t-fast) var(--ease);
  white-space:nowrap;-webkit-tap-highlight-color:transparent;
}
.btn:hover{background:rgba(255,255,255,.075);border-color:var(--line-strong)}
.btn:active{transform:translateY(1px)}
.btn:disabled{opacity:.55;cursor:not-allowed;transform:none}
.btn-primary{
  position:relative;overflow:hidden;
  background:linear-gradient(135deg,var(--neon),var(--neon-green));
  border-color:transparent;color:#012B26;font-weight:700;
  box-shadow:0 8px 24px rgba(0,229,195,.30);
}
.btn-primary:hover:not(:disabled){
  background:linear-gradient(135deg,#17F0D0,#3CF0A8);
  box-shadow:0 10px 30px rgba(0,229,195,.42);
}
/* Sheen sweep on the primary action. */
.btn-primary::before{
  content:'';position:absolute;inset:0;pointer-events:none;
  background:linear-gradient(100deg,transparent 28%,rgba(255,255,255,.45) 50%,transparent 72%);
  transform:translateX(-130%);transition:transform .7s var(--ease);
}
.btn-primary:hover:not(:disabled)::before{transform:translateX(130%)}
.btn-block{width:100%}
.btn.is-busy{opacity:.7;cursor:progress}
.btn-ghost{background:transparent;border-color:var(--line-soft)}
.btn-danger{color:#FFD3DC;border-color:rgba(255,77,109,.32);background:rgba(255,77,109,.10)}
.btn-danger:hover{background:rgba(255,77,109,.18);border-color:rgba(255,77,109,.5)}

/* --- Text link (e.g. "View All") --- */
.link-more{
  display:inline-flex;align-items:center;gap:5px;flex:none;
  min-height:32px;padding:0 8px;border-radius:10px;
  font-size:12.5px;font-weight:600;color:var(--neon);
  transition:background var(--t-fast) var(--ease);
}
.link-more:hover{background:rgba(0,229,195,.10)}
.link-more .ico{transition:transform var(--t-fast) var(--ease)}
.link-more:hover .ico{transform:translateX(3px)}

/* --- Pills: Online / Offline / COMPLETED / PENDING --- */
.pill{
  display:inline-flex;align-items:center;gap:6px;
  height:24px;padding:0 10px;border-radius:var(--r-pill);
  font:700 10.5px/1 var(--font);letter-spacing:.05em;text-transform:uppercase;
  white-space:nowrap;
}
.pill .dot{width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.pill.online{color:#7BF3C6;background:rgba(0,224,143,.12);box-shadow:inset 0 0 0 1px rgba(0,224,143,.26)}
.pill.offline{color:#FFC4CE;background:rgba(255,77,109,.12);box-shadow:inset 0 0 0 1px rgba(255,77,109,.26)}
.pill.blocked{color:#FFD79B;background:rgba(255,176,32,.12);box-shadow:inset 0 0 0 1px rgba(255,176,32,.26)}
.pill.settled{color:#7BF3C6;background:rgba(0,224,143,.12);box-shadow:inset 0 0 0 1px rgba(0,224,143,.26)}
.pill.pending{color:#9BD4FF;background:rgba(22,131,255,.14);box-shadow:inset 0 0 0 1px rgba(22,131,255,.28)}
.pill.failed{color:#FFC4CE;background:rgba(255,77,109,.12);box-shadow:inset 0 0 0 1px rgba(255,77,109,.26)}
.pill.cancelled{color:var(--text-2);background:rgba(255,255,255,.05);box-shadow:inset 0 0 0 1px var(--line-soft)}

/* Channel dot, shared by the payout form and the transaction cards. */
.channel-dot{width:8px;height:8px;border-radius:50%;flex:none}
.channel-dot.telebirr{background:var(--neon);box-shadow:0 0 8px rgba(0,229,195,.7)}
.channel-dot.cbe{background:var(--blue);box-shadow:0 0 8px rgba(22,131,255,.7)}
.channel-dot.device{background:var(--neon-green);box-shadow:0 0 8px rgba(0,224,143,.7)}
.channel-dot.auto{background:var(--text-3)}
.channel-dot.offline{background:var(--text-3)}

/* Count chip in a card header. */
.count-chip{
  flex:none;height:26px;padding:0 11px;display:inline-flex;align-items:center;
  border-radius:var(--r-pill);font:700 11px/1 var(--font);
  color:#BDF5E4;background:rgba(0,229,195,.10);
  box-shadow:inset 0 0 0 1px rgba(0,229,195,.24);
  font-variant-numeric:tabular-nums;
}

/* --- Empty states --- */
.empty-state{
  display:flex;flex-direction:column;align-items:center;gap:10px;
  padding:34px 20px;color:var(--text-2);font-size:13px;text-align:center;
}
.empty-state .ico{width:34px;height:34px;color:rgba(143,168,195,.5)}

/* --- Loading skeletons --- */
@keyframes shimmer{100%{transform:translateX(100%)}}
.skel{position:relative;overflow:hidden;border-radius:7px;background:rgba(255,255,255,.055)}
.skel::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent);
  animation:shimmer 1.35s infinite;
}
.skel-line{height:11px}
.skel-card{height:74px;border-radius:var(--r-lg)}

/* --- Toast, docked above the bottom nav on mobile --- */
@keyframes toast-in{from{opacity:0;transform:translate(-50%,14px) scale(.97)}to{opacity:1;transform:translate(-50%,0)}}
.toast{
  position:fixed;left:50%;bottom:calc(var(--nav-h) + 22px);z-index:90;
  display:flex;align-items:center;gap:10px;
  width:max-content;max-width:min(520px,calc(100vw - 28px));
  padding:12px 16px;border-radius:var(--r-md);border:1px solid var(--line-strong);
  background:rgba(8,22,44,.97);backdrop-filter:blur(14px);
  box-shadow:var(--shadow);font-size:13.5px;font-weight:500;
  opacity:0;pointer-events:none;transform:translate(-50%,14px) scale(.97);
  transition:opacity var(--t-mid) var(--ease),transform var(--t-mid) var(--ease);
}
.toast.show{opacity:1;transform:translate(-50%,0);animation:toast-in var(--t-mid) var(--ease)}
.toast.success{border-color:rgba(0,224,143,.45);color:#C7F9E6}
.toast.success .ico{color:var(--success)}
.toast.error{border-color:rgba(255,77,109,.48);color:#FFD6DE}
.toast.error .ico{color:var(--error)}

@keyframes spin{to{transform:rotate(360deg)}}
.spin{animation:spin .85s linear infinite}
`;
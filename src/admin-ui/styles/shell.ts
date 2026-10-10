/**
 * The app shell.
 *
 * Mobile-first: on a phone the app is a single full-height column with a sticky
 * top bar and a fixed bottom navigation bar, and the splash/login screens cover
 * the whole viewport. From min-width 768px up the same column is centred and
 * widened and the navigation becomes a left rail - one DOM, two layouts.
 */
export const SHELL = `
/* ---------------- App frame ---------------- */
.app{
  position:relative;z-index:1;
  display:flex;flex-direction:column;
  min-height:100dvh;
  max-width:var(--shell-max);
  margin:0 auto;
}

/* Content scrolls under the bars; the padding reserves their space. */
.content{
  flex:1;
  display:flex;flex-direction:column;gap:16px;
  padding:14px 16px calc(var(--nav-h) + 26px);
}

/* ---------------- Splash ---------------- */
@keyframes splash-fade{to{opacity:0;visibility:hidden}}
.splash{
  position:fixed;inset:0;z-index:100;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;
  padding:32px;text-align:center;
  background:linear-gradient(180deg,var(--bg-1) 0%,var(--bg-0) 60%,#01040C 100%);
}
/* Visible only while the client checks the gateway, then faded out. */
body:not(.is-booting) .splash{animation:splash-fade var(--t-slow) var(--ease) forwards;pointer-events:none}
.splash-mark{
  width:92px;height:92px;border-radius:28px;display:grid;place-items:center;
  color:#2E1065;
  background:linear-gradient(135deg,var(--neon),var(--neon-green));
  box-shadow:0 0 0 1px rgba(168,85,247,.4),0 18px 50px rgba(168,85,247,.34);
}
.splash-name{font:800 21px/1.25 var(--font-display);letter-spacing:-.01em}
.splash-tag{margin-top:6px;font-size:12.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-2)}
/* Connection status indicator under the brand. */
.splash-status{
  display:inline-flex;align-items:center;gap:9px;
  padding:9px 16px;border-radius:var(--r-pill);
  font-size:12.5px;font-weight:600;color:var(--text-2);
  background:rgba(255,255,255,.04);border:1px solid var(--line-soft);
}
.splash-status .dot{width:8px;height:8px;border-radius:50%;background:var(--text-3)}
.splash-status.is-online{color:#E9D5FF;border-color:rgba(168,85,247,.3);background:rgba(168,85,247,.08)}
.splash-status.is-online .dot{background:var(--neon);animation:pulse-dot 1.6s ease-in-out infinite}
.splash-status.is-offline{color:#FFD6DE;border-color:rgba(255,77,109,.32);background:rgba(255,77,109,.08)}
.splash-status.is-offline .dot{background:var(--error)}

/* Locked: the app is present but inert until the operator signs in, so the
   login overlay is not competing with live figures it cannot show yet. */
body.is-locked .app{visibility:hidden}
body.is-locked .splash{display:none}

/* Unlocked: both overlays are gone, not merely transparent. The splash and the
   login card are fixed, full-viewport layers above the app frame (z-index 1),
   so an overlay that was only faded out - or whose fade never ran because the
   boot sequence threw - would keep covering the dashboard and swallowing clicks.
   display:none removes them from the box entirely, which is what leaves the
   underlying UI fully visible and interactive. */
body.unlocked .splash,
body.unlocked .login{display:none}

/* ---------------- Login ---------------- */
.login{
  position:fixed;inset:0;z-index:95;
  display:flex;flex-direction:column;justify-content:center;gap:22px;
  padding:32px 22px;
  background:linear-gradient(180deg,var(--bg-1) 0%,var(--bg-0) 60%,#01040C 100%);
  overflow-y:auto;
}
.login-mark{
  width:64px;height:64px;border-radius:20px;display:grid;place-items:center;
  color:#2E1065;
  background:linear-gradient(135deg,var(--neon),var(--neon-green));
  box-shadow:0 0 0 1px rgba(168,85,247,.34),0 14px 36px rgba(168,85,247,.28);
}
.login-head{display:flex;flex-direction:column;gap:8px}
.login-title{font:800 26px/1.2 var(--font-display);letter-spacing:-.02em}
.login-sub{font-size:13.5px;color:var(--text-2);line-height:1.5}
.login-form{display:flex;flex-direction:column;gap:14px}
.login-foot{margin-top:6px;font-size:11.5px;line-height:1.6;color:var(--text-3)}
/* Sign In busy state. The spinner is a sibling of the label so swapping the text
   cannot disturb the button box, and [hidden] is restored explicitly because the
   inline-flex below would otherwise defeat the attribute. */
.unlock-spinner{display:inline-flex;align-items:center;margin-right:8px}
.unlock-spinner[hidden]{display:none}
#unlock.is-pending{cursor:progress;opacity:.82}

/* ---------------- Top bar ---------------- */
.topbar{
  position:sticky;top:0;z-index:50;
  display:flex;align-items:center;gap:12px;
  min-height:64px;padding:10px 16px;
  background:rgba(3,11,26,.80);
  backdrop-filter:blur(18px) saturate(150%);
  -webkit-backdrop-filter:blur(18px) saturate(150%);
  border-bottom:1px solid var(--line-soft);
}
.topbar-titles{min-width:0;flex:1}
.topbar-title{
  font:700 16px/1.25 var(--font-display);letter-spacing:-.01em;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.topbar-sub{margin-top:2px;font-size:11.5px;color:var(--text-2);line-height:1.3}

.icon-btn{
  position:relative;width:var(--tap);height:var(--tap);flex:none;
  display:grid;place-items:center;border-radius:14px;color:var(--text-2);
  border:1px solid transparent;
  transition:color var(--t-fast) var(--ease),background var(--t-fast) var(--ease),border-color var(--t-fast) var(--ease);
  -webkit-tap-highlight-color:transparent;
}
.icon-btn:hover{color:var(--neon);background:rgba(168,85,247,.10);border-color:var(--line-soft)}
.notif-badge{
  position:absolute;top:4px;right:4px;min-width:17px;height:17px;padding:0 5px;
  display:none;place-items:center;border-radius:9px;
  background:var(--error);color:#fff;font:700 10px/17px var(--font);
  box-shadow:0 0 0 2px #04101F;font-variant-numeric:tabular-nums;
}

@keyframes pulse-dot{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(168,85,247,.5)}50%{opacity:.75;box-shadow:0 0 0 6px rgba(168,85,247,0)}}
/* Live-gateway chip, hidden on the narrowest screens where space is tight. */
.system-status{
  display:inline-flex;align-items:center;gap:7px;
  height:32px;padding:0 12px;flex:none;
  border-radius:var(--r-pill);font-size:11.5px;font-weight:600;color:#E9D5FF;
  background:rgba(0,214,143,.09);border:1px solid rgba(0,214,143,.26);
}
.system-status .dot{width:7px;height:7px;border-radius:50%;background:var(--success);animation:pulse-dot 2.4s ease-in-out infinite}
.system-status.is-offline{color:#FFD6D6;background:rgba(255,77,109,.09);border-color:rgba(255,77,109,.3)}
.system-status.is-offline .dot{background:var(--error);animation:none}

/* ---------------- Bottom navigation ---------------- */
.bottom-nav{
  position:fixed;left:0;right:0;bottom:0;z-index:70;
  display:flex;align-items:stretch;
  height:calc(var(--nav-h) + env(safe-area-inset-bottom,0px));
  padding-bottom:env(safe-area-inset-bottom,0px);
  background:rgba(3,11,26,.92);
  backdrop-filter:blur(20px) saturate(150%);
  -webkit-backdrop-filter:blur(20px) saturate(150%);
  border-top:1px solid var(--line-soft);
}
.nav-item{
  position:relative;flex:1;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
  min-height:var(--tap);padding:8px 4px;
  font-size:10px;font-weight:600;letter-spacing:.03em;
  color:var(--text-3);text-align:center;
  -webkit-tap-highlight-color:transparent;
  transition:color var(--t-fast) var(--ease);
}
.nav-item .ico{transition:transform var(--t-mid) var(--ease)}
.nav-item.is-active{color:var(--neon)}
.nav-item.is-active .ico{transform:translateY(-1px);filter:drop-shadow(0 0 8px rgba(168,85,247,.55))}
/* Active marker: a short neon bar on the top edge of the tab. */
.nav-item.is-active::before{
  content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);
  width:26px;height:3px;border-radius:0 0 3px 3px;
  background:linear-gradient(90deg,var(--neon),var(--neon-green));
  box-shadow:0 0 12px rgba(168,85,247,.7);
}

/* ---------------- Slide-up sheet (notifications, menus) ---------------- */
.scrim{
  position:fixed;inset:0;z-index:75;
  background:rgba(2,8,20,.66);backdrop-filter:blur(3px);
  opacity:0;pointer-events:none;transition:opacity var(--t-mid) var(--ease);
}
.scrim.is-open{opacity:1;pointer-events:auto}
.sheet{
  position:fixed;left:0;right:0;bottom:0;z-index:80;
  max-height:82dvh;display:flex;flex-direction:column;
  border-radius:28px 28px 0 0;
  background:linear-gradient(180deg,rgba(11,30,60,.98),rgba(5,14,30,.99));
  border-top:1px solid var(--line);
  box-shadow:0 -20px 60px rgba(0,0,0,.6);
  transform:translateY(101%);
  transition:transform var(--t-slow) var(--ease);
}
.sheet.is-open{transform:none}
.sheet-grip{width:44px;height:4px;margin:10px auto 4px;flex:none;border-radius:2px;background:rgba(143,168,195,.35)}
.sheet-head{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:8px 18px 12px;flex:none;
}
.sheet-title{font:700 16px/1.3 var(--font-display)}
.sheet-body{
  flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;
  padding:0 16px 24px;
  display:flex;flex-direction:column;gap:10px;
}

.notif-badge.has-items{display:grid}
.avatar{
  width:var(--tap);height:var(--tap);flex:none;border-radius:14px;display:grid;place-items:center;
  font:800 13px/1 var(--font-display);color:#2E1065;
  background:linear-gradient(135deg,var(--neon),var(--neon-green));
  box-shadow:0 6px 18px rgba(168,85,247,.24);
  box-shadow:0 6px 18px rgba(168,85,247,.24);
}
`;

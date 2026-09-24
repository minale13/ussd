import type { FastifyReply, FastifyRequest } from 'fastify';

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>USSD Gateway | Operations Console</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%2334d399'/%3E%3Cstop offset='1' stop-color='%2322d3ee'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='32' height='32' rx='9' fill='%23090d16'/%3E%3Cpath d='M7 21l6-6 4 4 8-8.5' fill='none' stroke='url(%23g)' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap">
<style>
:root{
  color-scheme:dark;
  --bg:#090d16;
  --text:#f6f9fc;
  --text-dim:#c9d4e3;
  --muted:#8a9ab2;
  --faint:#64748b;
  --line:rgba(255,255,255,.08);
  --line-strong:rgba(255,255,255,.14);
  --emerald:#10b981;
  --emerald-bright:#34d399;
  --cyan:#22d3ee;
  --gold:#f59e0b;
  --gold-bright:#fbbf24;
  --rose:#fb7185;
  --font-body:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --font-display:'Plus Jakarta Sans','Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;
  --grad-primary:linear-gradient(135deg,#34d399,#22d3ee 92%);
  --grad-emerald:linear-gradient(118deg,#d1fae5,#34d399 44%,#22d3ee);
  --grad-gold:linear-gradient(118deg,#fde68a,#fbbf24 48%,#f59e0b);
  --grad-cyan:linear-gradient(118deg,#e0f2fe,#67e8f9 48%,#22d3ee);
  --glass:linear-gradient(158deg,rgba(255,255,255,.058),rgba(255,255,255,.012) 42%,rgba(255,255,255,.022));
  --shadow:0 30px 70px rgba(2,6,23,.55);
  --radius:22px;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 var(--font-body);-webkit-font-smoothing:antialiased}
body::before{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background:
    radial-gradient(820px 460px at 10% -8%,rgba(16,185,129,.17),transparent 62%),
    radial-gradient(880px 520px at 96% -14%,rgba(34,211,238,.15),transparent 60%),
    radial-gradient(1020px 760px at 52% 118%,rgba(245,158,11,.08),transparent 66%),
    radial-gradient(620px 420px at 82% 30%,rgba(56,189,248,.05),transparent 60%);
}
body::after{
  content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background:radial-gradient(1200px 720px at 50% 40%,transparent 52%,rgba(2,4,10,.6));
}
h1,h2,h3,p{margin:0}
button,input,select,textarea{font:inherit}
button{cursor:pointer}
svg{display:block}
::selection{background:rgba(52,211,153,.35)}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.shell{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:30px 28px 54px}
.glass{
  background:var(--glass);
  backdrop-filter:blur(16px) saturate(150%);
  -webkit-backdrop-filter:blur(16px) saturate(150%);
  border:1px solid var(--line);
  border-radius:var(--radius);
  box-shadow:var(--shadow),inset 0 1px 0 rgba(255,255,255,.06);
}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%{transform:scale(.5);opacity:.9}70%{transform:scale(1.55);opacity:0}100%{transform:scale(1.55);opacity:0}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:22px;flex-wrap:wrap;margin-bottom:20px}
.brand{display:flex;align-items:center;gap:14px}
.brand-mark{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;color:#03131b;background:linear-gradient(140deg,rgba(52,211,153,.95),rgba(34,211,238,.9));box-shadow:0 16px 36px rgba(16,185,129,.32),inset 0 1px 0 rgba(255,255,255,.5)}
.brand-mark svg{width:24px;height:24px}
.eyebrow{color:#67e8f9;font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}
.brand h1{font-family:var(--font-display);font-size:21px;font-weight:800;letter-spacing:-.02em;margin-top:3px}
.brand h1 .accent{background-image:var(--grad-gold);-webkit-background-clip:text;background-clip:text;color:transparent}
.top-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.status{display:flex;align-items:center;gap:9px;padding:9px 15px;border-radius:999px;font-size:12.5px;font-weight:700;color:#a7f3d0;background:linear-gradient(135deg,rgba(16,185,129,.16),rgba(34,211,238,.08));border:1px solid rgba(52,211,153,.38);box-shadow:0 0 26px rgba(16,185,129,.22),inset 0 1px 0 rgba(255,255,255,.08)}
.status .dot{position:relative;width:8px;height:8px;border-radius:50%;background:var(--emerald-bright);box-shadow:0 0 14px var(--emerald-bright)}
.status .dot::after{content:'';position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(52,211,153,.55);animation:pulse 2.4s ease-out infinite}
.sync{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:12.5px}
.sync svg{width:15px;height:15px;color:var(--faint)}
.icon-button{width:42px;height:42px;border-radius:13px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--text-dim);display:grid;place-items:center;transition:transform .2s,border-color .2s,color .2s,box-shadow .25s}
.icon-button svg{width:17px;height:17px}
.icon-button:hover{color:var(--text);border-color:rgba(255,255,255,.22);transform:translateY(-1px);box-shadow:0 14px 28px rgba(2,6,23,.5)}
.icon-button.is-loading svg{animation:spin .9s linear infinite}
.icon-button[disabled]{opacity:.6;cursor:not-allowed}
.access{display:grid;grid-template-columns:minmax(240px,1fr) auto;align-items:center;gap:18px 24px;padding:20px 22px;margin-bottom:20px}
.access-copy{display:flex;align-items:center;gap:14px}
.access-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;color:#cbd5e1;border:1px solid var(--line-strong);background:linear-gradient(140deg,rgba(148,163,184,.18),rgba(255,255,255,.035));transition:color .3s,border-color .3s,box-shadow .3s}
.access-icon svg{width:20px;height:20px}
body.unlocked .access-icon{color:#6ee7b7;border-color:rgba(52,211,153,.4);box-shadow:0 0 24px rgba(16,185,129,.24)}
.access-copy h2{font-family:var(--font-display);font-size:15px;font-weight:700}
.access-copy p{color:var(--muted);font-size:12.5px;margin-top:2px}
.access-row{display:flex;align-items:center;gap:12px;justify-content:flex-end;flex-wrap:wrap}
.input-wrap{position:relative;display:flex;align-items:center}
.input-icon{position:absolute;left:14px;color:#5f7391;pointer-events:none}
.input-icon svg{width:17px;height:17px}
.key-field{width:min(380px,58vw)}
input,textarea,select{width:100%;padding:12px 14px;border-radius:13px;border:1px solid var(--line);background:rgba(2,6,23,.62);color:var(--text);outline:none;transition:border-color .22s,box-shadow .22s,background .22s}
input.has-icon{padding-left:42px}
.key-field input{padding-right:48px}
input:focus,textarea:focus,select:focus{border-color:rgba(52,211,153,.55);background:rgba(2,6,23,.84);box-shadow:0 0 0 4px rgba(16,185,129,.14),0 0 26px rgba(34,211,238,.12)}
input::placeholder,textarea::placeholder{color:#5c6b84}
.key-toggle{position:absolute;right:9px;width:32px;height:32px;border:0;border-radius:10px;background:transparent;color:#5f7391;display:grid;place-items:center;transition:color .2s,background .2s}
.key-toggle svg{width:16px;height:16px}
.key-toggle .eye-closed{display:none}
.key-field.revealed .eye-open{display:none}
.key-field.revealed .eye-closed{display:block}
.key-toggle:hover{color:var(--text-dim);background:rgba(255,255,255,.05)}
.btn{display:inline-flex;align-items:center;gap:9px;padding:12px 18px;border-radius:13px;border:1px solid transparent;font-family:var(--font-display);font-size:13.5px;font-weight:700;letter-spacing:.01em;transition:transform .2s,box-shadow .25s,filter .25s}
.btn svg{width:16px;height:16px}
.btn.primary{background-image:var(--grad-primary);color:#04121c;box-shadow:0 16px 34px rgba(16,185,129,.28),inset 0 1px 0 rgba(255,255,255,.45)}
.btn.primary:hover{transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 20px 44px rgba(16,185,129,.36),0 0 0 1px rgba(52,211,153,.35),inset 0 1px 0 rgba(255,255,255,.45)}
.btn.primary:active{transform:translateY(0)}
.btn[disabled]{opacity:.55;cursor:not-allowed;transform:none;filter:none}
.btn.is-busy svg{display:none}
.btn.is-busy::after{content:'';width:14px;height:14px;border-radius:50%;border:2px solid rgba(4,18,28,.3);border-top-color:#04121c;animation:spin .8s linear infinite}
.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-bottom:20px}
.metric{position:relative;overflow:hidden;padding:22px;transition:transform .25s,border-color .25s,box-shadow .25s}
.metric::after{content:'';position:absolute;right:-32%;bottom:-64%;width:230px;height:230px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(16,185,129,.16),transparent 65%)}
.metric.gold::after{background:radial-gradient(circle,rgba(245,158,11,.15),transparent 65%)}
.metric.cyan::after{background:radial-gradient(circle,rgba(34,211,238,.16),transparent 65%)}
.metric:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.16);box-shadow:var(--shadow),0 0 0 1px rgba(52,211,153,.26),0 0 46px rgba(16,185,129,.16),inset 0 1px 0 rgba(255,255,255,.07)}
.metric-icon{transition:transform .32s ease,box-shadow .32s ease,border-color .32s ease}
.metric:hover .metric-icon{transform:translateY(-2px) scale(1.05)}
.metric-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
.metric-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;border:1px solid}
.metric-icon svg{width:21px;height:21px}
.metric-icon.emerald{color:#6ee7b7;border-color:rgba(52,211,153,.38);background:linear-gradient(140deg,rgba(16,185,129,.24),rgba(34,211,238,.06));box-shadow:0 0 26px rgba(16,185,129,.28),inset 0 1px 0 rgba(255,255,255,.1)}
.metric-icon.gold{color:#fcd34d;border-color:rgba(251,191,36,.36);background:linear-gradient(140deg,rgba(245,158,11,.22),rgba(251,113,133,.06));box-shadow:0 0 26px rgba(245,158,11,.26),inset 0 1px 0 rgba(255,255,255,.1)}
.metric-icon.cyan{color:#67e8f9;border-color:rgba(34,211,238,.36);background:linear-gradient(140deg,rgba(34,211,238,.22),rgba(59,130,246,.08));box-shadow:0 0 26px rgba(34,211,238,.26),inset 0 1px 0 rgba(255,255,255,.1)}
.chip{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.chip svg{width:12px;height:12px}
.chip.emerald{color:#86efac;background:rgba(16,185,129,.12);border:1px solid rgba(52,211,153,.3)}
.chip.gold{color:#fcd34d;background:rgba(245,158,11,.12);border:1px solid rgba(251,191,36,.3)}
.chip.cyan{color:#67e8f9;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.3)}
.metric-label{color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.metric-value{display:flex;align-items:baseline;gap:10px;margin-top:8px;font-family:var(--font-display);font-size:33px;font-weight:800;letter-spacing:-.025em;font-variant-numeric:tabular-nums}
.metric-value .amount{-webkit-background-clip:text;background-clip:text;color:transparent}
.metric.emerald .amount{background-image:var(--grad-emerald)}
.metric.gold .amount{background-image:var(--grad-gold)}
.metric.cyan .amount{background-image:var(--grad-cyan)}
.unit{font-family:var(--font-body);font-size:11px;font-weight:800;letter-spacing:.14em;color:var(--muted);padding:4px 8px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.04)}
.metric-foot{margin-top:12px;color:var(--faint);font-size:12.5px}
.workspace{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:18px;align-items:start}
.panel{padding:22px}
.panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:20px}
.panel-heading{display:flex;align-items:center;gap:13px}
.panel-icon{width:42px;height:42px;border-radius:13px;display:grid;place-items:center;color:#94a3b8;border:1px solid var(--line-strong);background:rgba(255,255,255,.04)}
.panel-icon svg{width:19px;height:19px}
.panel-icon.gold{color:#fcd34d;border-color:rgba(251,191,36,.32);background:linear-gradient(140deg,rgba(245,158,11,.2),rgba(255,255,255,.03));box-shadow:0 0 22px rgba(245,158,11,.2)}
.panel-icon.cyan{color:#67e8f9;border-color:rgba(34,211,238,.32);background:linear-gradient(140deg,rgba(34,211,238,.2),rgba(255,255,255,.03));box-shadow:0 0 22px rgba(34,211,238,.2)}
.panel-head h2{font-family:var(--font-display);font-size:16px;font-weight:700;letter-spacing:-.01em}
.panel-head p{color:var(--muted);font-size:12.5px;margin-top:2px}
.count-chip{white-space:nowrap;font-size:11.5px;font-weight:700;color:#7dd3fc;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.28);padding:6px 11px;border-radius:999px}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.field-group{display:flex;flex-direction:column;gap:8px}
.field-group.span-2{grid-column:1/-1}
.field-label{font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#93a5bd}
.optional{color:#5b6b84;text-transform:none;letter-spacing:0;font-weight:500}
.amount-wrap .currency-tag{position:absolute;left:11px;top:50%;transform:translateY(-50%);font-size:10.5px;font-weight:800;letter-spacing:.1em;color:#6ee7b7;background:rgba(16,185,129,.13);border:1px solid rgba(52,211,153,.34);border-radius:9px;padding:5px 8px}
.amount-wrap input{padding-left:66px}
textarea{resize:vertical;min-height:86px}
.dropdown{position:relative}
.select{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:12px 14px;border-radius:13px;border:1px solid var(--line);background:rgba(2,6,23,.62);color:var(--text);transition:border-color .22s,box-shadow .22s,background .22s}
.select:hover{border-color:var(--line-strong)}
.dropdown.open .select{border-color:rgba(52,211,153,.55);background:rgba(2,6,23,.84);box-shadow:0 0 0 4px rgba(16,185,129,.14),0 0 26px rgba(34,211,238,.12)}
.select-value{display:flex;align-items:center;gap:10px;font-weight:600}
.select .chevron{color:var(--faint);transition:transform .25s}
.select .chevron svg{width:16px;height:16px}
.dropdown.open .chevron{transform:rotate(180deg)}
.channel-dot{width:9px;height:9px;border-radius:50%;flex:none}
.channel-dot.telebirr{background:linear-gradient(135deg,#34d399,#22d3ee);box-shadow:0 0 12px rgba(52,211,153,.85)}
.channel-dot.cbe{background:linear-gradient(135deg,#fbbf24,#f59e0b);box-shadow:0 0 12px rgba(251,191,36,.85)}
.select-menu{position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:40;list-style:none;margin:0;padding:6px;border-radius:15px;background:rgba(9,14,24,.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid var(--line-strong);box-shadow:0 26px 60px rgba(2,6,23,.7);opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .2s,transform .2s,visibility .2s}
.dropdown.open .select-menu{opacity:1;visibility:visible;transform:none}
.option{display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:11px;cursor:pointer;transition:background .18s}
.option:hover,.option:focus-visible{background:rgba(255,255,255,.055);outline:none}
.option.selected{background:linear-gradient(90deg,rgba(16,185,129,.16),rgba(34,211,238,.09))}
.option strong{display:block;font-size:13px;font-weight:700}
.option small{display:block;color:var(--muted);font-size:11.5px;margin-top:1px}
.option .check{margin-left:auto;color:#6ee7b7;opacity:0;transition:opacity .18s}
.option.selected .check{opacity:1}
.option .check svg{width:15px;height:15px}
.form-foot{margin-top:20px;display:flex;flex-direction:column;gap:14px}
.form-hint{display:flex;gap:9px;align-items:flex-start;color:var(--muted);font-size:12.5px;line-height:1.5;padding:11px 13px;border-radius:12px;background:rgba(56,189,248,.05);border:1px dashed rgba(56,189,248,.22)}
.form-hint svg{width:15px;height:15px;color:#67e8f9;flex:none;margin-top:1px}
.form-hint strong{color:#e2e8f0}
.cta{justify-content:center;width:100%;padding:14px 18px;font-size:14px}
.table-wrap{overflow-x:auto;margin:0 -6px;padding:0 6px}
table{width:100%;border-collapse:separate;border-spacing:0 8px;font-size:13px}
th{text-align:left;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#7186a1;padding:0 14px 4px}
th.th-action{width:118px}
tbody td{padding:13px 14px;vertical-align:middle;border-top:1px solid rgba(255,255,255,.05);border-bottom:1px solid rgba(255,255,255,.05);background:rgba(255,255,255,.014);transition:background .25s,border-color .25s}
tbody td:first-child{border-left:1px solid rgba(255,255,255,.05);border-radius:14px 0 0 14px}
tbody td:last-child{border-right:1px solid rgba(255,255,255,.05);border-radius:0 14px 14px 0;text-align:right}
tbody tr{transition:transform .25s}
tbody tr:hover{transform:translateY(-1px)}
tbody tr:hover td{background:linear-gradient(90deg,rgba(16,185,129,.075),rgba(34,211,238,.05));border-color:rgba(52,211,153,.24)}
.device-id{font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;font-size:12.5px;color:#e2e8f0;word-break:break-all;letter-spacing:.01em}
.device-model{color:var(--muted);font-size:12px;margin-top:3px;display:flex;align-items:center;gap:6px}
.pill{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap}
.pill .dot{width:6.5px;height:6.5px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}
.pill.active{color:#a7f3d0;background:linear-gradient(135deg,rgba(16,185,129,.22),rgba(34,211,238,.13));border:1px solid rgba(52,211,153,.45);box-shadow:0 0 22px rgba(16,185,129,.24),inset 0 1px 0 rgba(255,255,255,.12)}
.pill.blocked{color:#fecdd3;background:linear-gradient(135deg,rgba(244,63,94,.16),rgba(251,113,133,.08));border:1px solid rgba(251,113,133,.45);box-shadow:0 0 22px rgba(244,63,94,.2),inset 0 1px 0 rgba(255,255,255,.1)}
.seen{color:var(--text-dim);font-size:12.5px;white-space:nowrap}
.seen small{display:block;color:#5b6b84;font-size:11.5px;margin-top:2px}
.action-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:11px;font-size:12px;font-weight:700;border:1px solid var(--line-strong);background:rgba(255,255,255,.035);color:var(--text-dim);transition:transform .22s,border-color .22s,background .22s,color .22s,box-shadow .25s}
.action-btn svg{width:14px;height:14px}
.action-btn:hover{transform:translateY(-1px)}
.action-btn.block:hover{border-color:rgba(251,113,133,.5);background:rgba(244,63,94,.12);color:#fda4af;box-shadow:0 12px 28px rgba(244,63,94,.18)}
.action-btn.unblock:hover{border-color:rgba(52,211,153,.5);background:rgba(16,185,129,.12);color:#6ee7b7;box-shadow:0 12px 28px rgba(16,185,129,.18)}
.action-btn[disabled]{opacity:.5;cursor:wait;transform:none}
.empty-state{display:flex;flex-direction:column;align-items:center;gap:10px;padding:32px 12px;color:var(--muted);font-size:13px;text-align:center}
.empty-state svg{width:26px;height:26px;color:#4b5c75}
tbody td[colspan]{text-align:center;border-radius:14px}
.footer{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-top:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,.06);color:#5b6b84;font-size:12px}
.live{display:flex;align-items:center;gap:8px}
.live .dot{width:6px;height:6px;border-radius:50%;background:var(--emerald-bright);box-shadow:0 0 10px var(--emerald-bright);animation:blink 2.8s infinite}
.toast{position:fixed;right:24px;bottom:24px;z-index:60;display:flex;align-items:center;gap:11px;max-width:400px;padding:14px 16px;border-radius:15px;font-size:13.5px;font-weight:600;color:var(--text);background:rgba(9,14,24,.94);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--line-strong);box-shadow:0 26px 60px rgba(2,6,23,.65);opacity:0;visibility:hidden;transform:translateY(14px) scale(.98);transition:opacity .28s,transform .28s,visibility .28s;pointer-events:none}
.toast.show{opacity:1;visibility:visible;transform:none}
.toast svg{width:18px;height:18px;flex:none}
.toast.success{border-color:rgba(52,211,153,.45);box-shadow:0 26px 60px rgba(2,6,23,.65),0 0 34px rgba(16,185,129,.2)}
.toast.success svg{color:#6ee7b7}
.toast.error{border-color:rgba(251,113,133,.45);box-shadow:0 26px 60px rgba(2,6,23,.65),0 0 34px rgba(244,63,94,.2)}
.toast.error svg{color:#fda4af}
.is-shimmer{position:relative;overflow:hidden}
body.is-loading .is-shimmer::before{content:'';position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.085) 50%,transparent 80%);animation:shimmer 1.4s infinite}
@keyframes riseIn{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
.panel,.access{position:relative;animation:riseIn .5s ease both}
.panel::before,.access::before{content:'';position:absolute;left:11%;right:11%;top:-1px;height:1px;border-radius:2px;pointer-events:none;background:linear-gradient(90deg,transparent,rgba(52,211,153,.5),rgba(34,211,238,.42),transparent);opacity:.8}
.field-label-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.field-note{font-size:11px;font-weight:600;letter-spacing:0;text-transform:none;color:#5b6b84}
.field-note.is-live{color:#7dd3fc}
.mini-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;border:1px solid var(--line-strong);color:var(--muted);background:rgba(255,255,255,.04)}
.mini-badge.auto{color:#c4b5fd;border-color:rgba(167,139,250,.42);background:rgba(139,92,246,.14);box-shadow:0 0 18px rgba(139,92,246,.2)}
.mini-badge.active{color:#86efac;border-color:rgba(52,211,153,.44);background:rgba(16,185,129,.15);box-shadow:0 0 18px rgba(16,185,129,.22)}
.select .mini-badge{margin-left:auto}
.channel-dot.device{background:linear-gradient(135deg,#67e8f9,#38bdf8);box-shadow:0 0 12px rgba(56,189,248,.85)}
.channel-dot.auto{background:linear-gradient(135deg,#c4b5fd,#818cf8);box-shadow:0 0 12px rgba(139,92,246,.8)}
.channel-dot.offline{background:linear-gradient(135deg,#94a3b8,#64748b);box-shadow:0 0 10px rgba(148,163,184,.45)}
.select-menu{max-height:288px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin}
.select-menu::-webkit-scrollbar{width:8px}
.select-menu::-webkit-scrollbar-track{background:transparent}
.select-menu::-webkit-scrollbar-thumb{background:rgba(148,163,184,.3);border-radius:9px;border:2px solid rgba(9,14,24,.92)}
.option{position:relative;overflow:hidden;transition:background .18s,transform .18s}
.option:hover,.option:focus-visible{background:linear-gradient(90deg,rgba(255,255,255,.075),rgba(255,255,255,.02));transform:translateX(2px)}
.option::before{content:'';position:absolute;left:0;top:16%;bottom:16%;width:2px;border-radius:2px;background:linear-gradient(180deg,#34d399,#22d3ee);opacity:0;transition:opacity .18s}
.option:hover::before,.option:focus-visible::before,.option.selected::before{opacity:1}
.option[aria-disabled="true"]{opacity:.5;cursor:not-allowed}
.option[aria-disabled="true"]:hover,.option[aria-disabled="true"]:focus-visible{background:none;transform:none}
.option[aria-disabled="true"]:hover::before,.option[aria-disabled="true"]:focus-visible::before{opacity:0}
.option-copy{min-width:0;flex:1}
.option-copy small{font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,monospace;letter-spacing:.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.option-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;white-space:nowrap}
.option-badge .dot{width:5px;height:5px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
.option-badge.active{color:#86efac;background:rgba(16,185,129,.16);border:1px solid rgba(52,211,153,.4)}
.option-badge.blocked{color:#fda4af;background:rgba(244,63,94,.14);border:1px solid rgba(251,113,133,.42)}
.option-badge.auto{color:#c4b5fd;background:rgba(139,92,246,.16);border:1px solid rgba(167,139,250,.42)}
.btn.primary{position:relative;overflow:hidden}
.btn.primary::before{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 26%,rgba(255,255,255,.34) 50%,transparent 74%);transform:translateX(-130%);transition:transform .7s ease}
.btn.primary:hover::before{transform:translateX(130%)}
@media(max-width:1120px){
  .workspace{grid-template-columns:1fr}
  .metrics{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media(max-width:780px){
  .shell{padding:22px 16px 44px}
  .metrics{grid-template-columns:1fr}
  .access{grid-template-columns:1fr}
  .access-row{justify-content:stretch}
  .key-field{width:100%}
  .access-row .btn{width:100%;justify-content:center}
  .form-grid{grid-template-columns:1fr}
  .toast{left:16px;right:16px;max-width:none}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
}
</style>
</head>
<body>
<main class="shell">
<header class="topbar">
  <div class="brand">
    <div class="brand-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16.5 9 11l3.5 3.5L20 7"/><path d="M14.5 7H20v5.5"/></svg></div>
    <div>
      <div class="eyebrow">Auto-withdrawal gateway</div>
      <h1>USSD Gateway <span class="accent">Console</span></h1>
    </div>
  </div>
  <div class="top-actions">
    <div class="sync" id="last-sync"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg><span>Awaiting sync</span></div>
    <div class="status" id="gateway-status"><span class="dot"></span>Gateway Status: Active</div>
    <button class="icon-button" id="refresh" type="button" title="Refresh dashboard" aria-label="Refresh dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8.1 8.1 0 0 0-15.5-2M4 5v4h4M4 13a8.1 8.1 0 0 0 15.5 2M20 19v-4h-4"/></svg></button>
  </div>
</header>

<section class="glass access" aria-label="Operator access">
  <div class="access-copy">
    <div class="access-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4.5" y="10" width="15" height="10.5" rx="3"/><path d="M8.5 10V7.6a3.5 3.5 0 0 1 7 0V10"/><path d="M12 14.5v2.5"/></svg></div>
    <div>
      <h2>Operator access</h2>
      <p>Authorise with the admin key to stream live settlement data and device controls.</p>
    </div>
  </div>
  <div class="access-row">
    <div class="input-wrap key-field" id="key-field">
      <span class="input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.8 12.2 19 4M15.5 7.5l2 2M18 5l2 2"/></svg></span>
      <input class="has-icon" id="key" type="password" placeholder="Enter admin API key" autocomplete="off" spellcheck="false">
      <button class="key-toggle" id="key-toggle" type="button" aria-label="Show admin key" title="Show admin key"><svg class="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg><svg class="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l16 16"/><path d="M9.9 5.9A10.6 10.6 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.3 4M6.2 8.1A17 17 0 0 0 2.5 12S6 18.2 12 18.2c1.2 0 2.2-.2 3.1-.6"/></svg></button>
    </div>
    <button class="btn primary" id="unlock" type="button">Unlock console <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button>
  </div>
</section>
<section class="metrics" aria-label="Financial overview">
  <article class="glass metric emerald is-shimmer">
    <div class="metric-head">
      <div class="metric-icon emerald"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5h17v11h-17z"/><path d="M3.5 8.5 5.5 4h13l2 4.5"/><path d="M12 12v4.5M12 16.5 10 14.5M12 16.5l2-2"/></svg></div>
      <span class="chip emerald"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l5-5 4 4 5.5-6"/></svg>Posted</span>
    </div>
    <div class="metric-label">Total cash-in</div>
    <div class="metric-value"><span class="amount" id="cash">0.00</span><span class="unit">ETB</span></div>
    <p class="metric-foot">Settled deposits across gateway wallets</p>
  </article>
  <article class="glass metric gold is-shimmer">
    <div class="metric-head">
      <div class="metric-icon gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5v13M7.5 13l4.5 4.5 4.5-4.5"/><path d="M4.5 20.5h15"/></svg></div>
      <span class="chip gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>Completed</span>
    </div>
    <div class="metric-label">Total withdrawals</div>
    <div class="metric-value"><span class="amount" id="withdrawals">0.00</span><span class="unit">ETB</span></div>
    <p class="metric-foot">Completed payout settlements</p>
  </article>
  <article class="glass metric cyan is-shimmer">
    <div class="metric-head">
      <div class="metric-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.8v8.4M9.4 10.6c0-1.1 5.2-1.1 5.2 0s-5.2 1.1-5.2 2.2 5.2 1.1 5.2 0"/></svg></div>
      <span class="chip cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 6v6l4 2.5"/></svg>Available</span>
    </div>
    <div class="metric-label">Remaining balance</div>
    <div class="metric-value"><span class="amount" id="balance">0.00</span><span class="unit">ETB</span></div>
    <p class="metric-foot">Live balance across funded wallets</p>
  </article>
</section>
<section class="workspace">
  <article class="glass panel">
    <div class="panel-head">
      <div class="panel-heading">
        <div class="panel-icon gold"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10.5 13.5"/><path d="M21 3l-6.8 18-3.7-7.5L3 9.8 21 3Z"/></svg></div>
        <div>
          <h2>Direct withdrawal</h2>
          <p>Queue an outbound payout and route it to a specific gateway device.</p>
        </div>
      </div>
    </div>
    <form id="withdrawal-form" autocomplete="off">
      <div class="form-grid">
        <div class="field-group span-2">
          <label class="field-label" for="phone">Destination phone</label>
          <div class="input-wrap">
            <span class="input-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="2.5" width="11" height="19" rx="3"/><path d="M11 18.5h2"/></svg></span>
            <input class="has-icon" id="phone" type="tel" inputmode="tel" required minlength="6" maxlength="64" placeholder="09XX XXX XXXX">
          </div>
        </div>
        <div class="field-group">
          <label class="field-label" for="amount">Amount</label>
          <div class="input-wrap amount-wrap">
            <span class="currency-tag">ETB</span>
            <input id="amount" type="number" min="0.01" step="0.01" required placeholder="0.00">
          </div>
        </div>
        <div class="field-group">
          <span class="field-label" id="channel-label">Payment channel</span>
          <div class="dropdown" id="channel-dropdown">
            <button class="select" id="channel-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="channel-label">
              <span class="select-value"><span class="channel-dot telebirr" id="channel-dot"></span><span id="channel-value">Telebirr</span></span>
              <span class="chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg></span>
            </button>
            <ul class="select-menu" id="channel-menu" role="listbox" aria-labelledby="channel-label">
              <li class="option selected" role="option" tabindex="0" data-value="TELEBIRR" aria-selected="true">
                <span class="channel-dot telebirr"></span>
                <span><strong>Telebirr</strong><small>Mobile money payout</small></span>
                <span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
              </li>
              <li class="option" role="option" tabindex="0" data-value="CBE" aria-selected="false">
                <span class="channel-dot cbe"></span>
                <span><strong>CBE</strong><small>Commercial Bank of Ethiopia</small></span>
                <span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
              </li>
            </ul>
          </div>
        </div>
        <div class="field-group span-2">
          <div class="field-label-row">
            <span class="field-label" id="target-label">Target device</span>
            <span class="field-note" id="target-note">Awaiting device data</span>
          </div>
          <div class="dropdown" id="target-dropdown">
            <button class="select" id="target-button" type="button" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="target-label">
              <span class="select-value"><span class="channel-dot auto" id="target-dot"></span><span id="target-value">Any available device</span></span>
              <span class="mini-badge auto" id="target-badge">Auto</span>
              <span class="chevron"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9.5l6 6 6-6"/></svg></span>
            </button>
            <ul class="select-menu" id="target-menu" role="listbox" aria-labelledby="target-label">
              <li class="option selected" role="option" tabindex="0" data-value="ANY" aria-selected="true">
                <span class="channel-dot auto"></span>
                <span class="option-copy"><strong>Any Available Device</strong><small>Auto-assign &#183; the first device to poll claims it</small></span>
                <span class="option-badge auto">Auto</span>
                <span class="check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
              </li>
            </ul>
          </div>
        </div>
        <div class="field-group span-2">
          <label class="field-label" for="notes">Notes <span class="optional">optional</span></label>
          <textarea id="notes" maxlength="512" rows="3" placeholder="Internal reference, batch id or operator note..."></textarea>
        </div>
      </div>
      <div class="form-foot">
        <p class="form-hint"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>Creates a <strong>PENDING</strong> withdrawal and reserves the amount from the gateway wallet. Targeted payouts are claimable only by the selected device, while <strong>Any</strong> is first-come, first-served.</p>
        <button class="btn primary cta" id="submit-withdrawal" type="submit">Create withdrawal <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg></button>
      </div>
    </form>
  </article>
  <article class="glass panel">
    <div class="panel-head">
      <div class="panel-heading">
        <div class="panel-icon cyan"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="13" rx="3"/><path d="M8.5 20.5h7M12 17.5v3"/></svg></div>
        <div>
          <h2>Connected devices</h2>
          <p>Manage gateway access and activity.</p>
        </div>
      </div>
      <span class="count-chip" id="device-count">0 devices</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Device</th><th>Status</th><th>Last seen</th><th class="th-action"><span class="sr-only">Actions</span></th></tr></thead>
        <tbody id="devices"><tr><td colspan="4"><div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4.5" y="10" width="15" height="10.5" rx="3"/><path d="M8.5 10V7.6a3.5 3.5 0 0 1 7 0V10"/></svg>Unlock the console to load registered devices.</div></td></tr></tbody>
      </table>
    </div>
  </article>
</section>

<footer class="footer">
  <span>USSD Gateway Console &middot; ETB settlement &middot; Admin API protected</span>
  <span class="live"><span class="dot"></span>Auto-refresh 30s</span>
</footer>
</main>
<noscript><p class="form-hint" style="margin-top:18px">Enable JavaScript to use the console.</p></noscript>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/admin/app.js" defer></script>
</body>
</html>
`;

const CLIENT = `
(function () {
  'use strict';

  var REFRESH_MS = 30000;
  var ANY_TARGET = 'ANY';
  var CHANNEL_LABELS = { TELEBIRR: 'Telebirr', CBE: 'CBE' };
  var MENUS = {
    channel: { dropdown: 'channel-dropdown', button: 'channel-button', menu: 'channel-menu' },
    target: { dropdown: 'target-dropdown', button: 'target-button', menu: 'target-menu' }
  };
  var state = { channel: 'TELEBIRR', targetDevice: ANY_TARGET, devices: [], unlocked: false, loading: false, firstLoad: true };
  var toastTimer = null;

  var SVG_BLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/></svg>';
  var SVG_UNBLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
  var SVG_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>';
  var SVG_ERROR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V13M12 16.4h.01"/></svg>';
  var SVG_EMPTY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="13" rx="3"/><path d="M8.5 20.5h7M12 17.5v3"/></svg>';
  var SVG_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char];
    });
  }

  function money(value) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function notify(message, type) {
    var toast = byId('toast');
    toast.className = 'toast show ' + (type === 'error' ? 'error' : 'success');
    toast.innerHTML = (type === 'error' ? SVG_ERROR : SVG_OK) + '<span>' + escapeHtml(message) + '</span>';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.className = 'toast';
    }, 4200);
  }

  function api(path, options) {
    var request = options || {};
    return fetch(path, {
      method: request.method || 'GET',
      headers: Object.assign({ 'content-type': 'application/json', 'x-admin-key': byId('key').value.trim() }, request.headers || {}),
      body: request.body
    }).then(function (response) {
      return response.json().catch(function () {
        return {};
      }).then(function (body) {
        if (!response.ok) throw new Error(body.error || 'Request failed with status ' + response.status);
        return body;
      });
    });
  }

  function setAmount(node, value, animate) {
    var target = Number(value || 0);
    if (!animate || !window.requestAnimationFrame) {
      node.textContent = money(target);
      return;
    }
    var started = performance.now();
    function frame(now) {
      var progress = Math.min((now - started) / 700, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = money(target * eased);
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function timeAgo(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return 'unknown';
    var seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
    if (seconds < 45) return 'moments ago';
    var minutes = Math.round(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    var hours = Math.round(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.round(hours / 24);
    if (days < 30) return days + 'd ago';
    return Math.round(days / 30) + 'mo ago';
  }

  function renderMetrics(overview, animate) {
    setAmount(byId('cash'), overview.total_cash_in, animate);
    setAmount(byId('withdrawals'), overview.total_withdrawals, animate);
    setAmount(byId('balance'), overview.remaining_balance, animate);
    byId('last-sync').querySelector('span').textContent = 'Synced ' + new Date().toLocaleTimeString();
  }

  function renderDevices(devices) {
    var tbody = byId('devices');
    state.devices = devices;
    renderTargetOptions();
    byId('device-count').textContent = devices.length + ' device' + (devices.length === 1 ? '' : 's');
    if (!devices.length) {
      tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">' + SVG_EMPTY + 'No devices have polled the gateway yet.</div></td></tr>';
      return;
    }
    tbody.innerHTML = devices.map(function (device) {
      var active = Boolean(device.active_status);
      var seen = new Date(device.last_seen_at);
      var seenText = isNaN(seen.getTime()) ? 'Unknown' : seen.toLocaleString();
      var seenTitle = isNaN(seen.getTime()) ? '' : seen.toISOString();
      return '<tr>' +
        '<td><div class="device-id">' + escapeHtml(device.device_id) + '</div><div class="device-model">' + escapeHtml(device.phone_model || 'Unknown model') + '</div></td>' +
        '<td><span class="pill ' + (active ? 'active' : 'blocked') + '"><span class="dot"></span>' + (active ? 'Active' : 'Blocked') + '</span></td>' +
        '<td><div class="seen" title="' + escapeHtml(seenTitle) + '">' + escapeHtml(seenText) + '<small>' + escapeHtml(timeAgo(device.last_seen_at)) + '</small></div></td>' +
        '<td><button type="button" class="action-btn ' + (active ? 'block' : 'unblock') + '" data-action="toggle" data-device-id="' + escapeHtml(device.device_id) + '" data-active="' + active + '">' + (active ? SVG_BLOCK + 'Block' : SVG_UNBLOCK + 'Unblock') + '</button></td>' +
        '</tr>';
    }).join('');
  }

  function setLoading(loading) {
    state.loading = loading;
    document.body.classList.toggle('is-loading', loading);
    byId('refresh').classList.toggle('is-loading', loading);
    byId('refresh').disabled = loading;
    byId('unlock').disabled = loading;
  }

  function load(options) {
    var silent = Boolean(options && options.silent);
    if (state.loading) return Promise.resolve();
    if (!byId('key').value.trim()) {
      notify('Enter your admin API key to open the console.', 'error');
      byId('key').focus();
      return Promise.resolve();
    }
    var wasUnlocked = state.unlocked;
    setLoading(true);
    return Promise.all([api('/api/admin/overview'), api('/api/admin/devices')]).then(function (responses) {
      renderMetrics(responses[0].overview, state.firstLoad);
      renderDevices(responses[1].devices || []);
      state.firstLoad = false;
      state.unlocked = true;
      document.body.classList.add('unlocked');
      if (!silent) notify(wasUnlocked ? 'Console synced with live gateway data.' : 'Console unlocked. Live settlement data is streaming.');
    }).catch(function (error) {
      var message = error && error.message ? error.message : 'Unable to reach the gateway.';
      if (message === 'Admin authentication required') {
        message = 'Admin key rejected. Check the ADMIN_API_KEY value.';
        state.unlocked = false;
        document.body.classList.remove('unlocked');
      }
      notify(message, 'error');
    }).then(function () {
      setLoading(false);
    });
  }
  function menuRef(key) {
    var ref = MENUS[key];
    return { root: byId(ref.dropdown), button: byId(ref.button), menu: byId(ref.menu) };
  }

  function setMenuOpen(key, open) {
    var ref = menuRef(key);
    ref.root.classList.toggle('open', open);
    ref.button.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function markMenuSelection(key, value) {
    Array.prototype.forEach.call(menuRef(key).menu.querySelectorAll('[role="option"]'), function (option) {
      var selected = option.getAttribute('data-value') === value;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function selectOption(key, option, onSelect) {
    onSelect(option.getAttribute('data-value'));
    setMenuOpen(key, false);
    menuRef(key).button.focus();
  }

  function bindMenu(key, onSelect) {
    var ref = menuRef(key);
    ref.button.addEventListener('click', function (event) {
      event.stopPropagation();
      var open = !ref.root.classList.contains('open');
      Object.keys(MENUS).forEach(function (other) {
        setMenuOpen(other, false);
      });
      setMenuOpen(key, open);
    });
    ref.button.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        setMenuOpen(key, false);
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      setMenuOpen(key, true);
      var first = ref.menu.querySelector('[role="option"]:not([aria-disabled="true"])');
      if (first) first.focus();
    });
    ref.menu.addEventListener('click', function (event) {
      var option = event.target.closest('[role="option"]');
      if (!option || option.getAttribute('aria-disabled') === 'true') return;
      selectOption(key, option, onSelect);
    });
    ref.menu.addEventListener('keydown', function (event) {
      var option = event.target.closest('[role="option"]');
      if (event.key === 'Escape') {
        setMenuOpen(key, false);
        ref.button.focus();
        return;
      }
      if (!option) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        var options = Array.prototype.slice.call(ref.menu.querySelectorAll('[role="option"]'));
        var step = event.key === 'ArrowDown' ? 1 : -1;
        var current = options.indexOf(option);
        for (var jump = 1; jump <= options.length; jump += 1) {
          var candidate = options[(current + step * jump + options.length * jump) % options.length];
          if (candidate && candidate.getAttribute('aria-disabled') !== 'true') {
            candidate.focus();
            return;
          }
        }
        return;
      }
      if ((event.key === 'Enter' || event.key === ' ') && option.getAttribute('aria-disabled') !== 'true') {
        event.preventDefault();
        selectOption(key, option, onSelect);
      }
    });
  }

  function setChannel(value) {
    state.channel = value;
    byId('channel-value').textContent = CHANNEL_LABELS[value] || value;
    byId('channel-dot').className = 'channel-dot ' + (value === 'CBE' ? 'cbe' : 'telebirr');
    markMenuSelection('channel', value);
  }

  function findDevice(deviceId) {
    var match = null;
    state.devices.forEach(function (device) {
      if (device.device_id === deviceId) match = device;
    });
    return match;
  }

  function setTargetDevice(value) {
    var device = value && value !== ANY_TARGET ? findDevice(value) : null;
    if (device && !device.active_status) device = null;
    state.targetDevice = device ? device.device_id : ANY_TARGET;
    var activeCount = state.devices.filter(function (item) {
      return item.active_status;
    }).length;
    byId('target-value').textContent = device ? device.phone_model || device.device_id : 'Any available device';
    byId('target-dot').className = 'channel-dot ' + (device ? 'device' : 'auto');
    var badge = byId('target-badge');
    badge.className = 'mini-badge ' + (device ? 'active' : 'auto');
    badge.textContent = device ? 'Active' : 'Auto';
    var note = byId('target-note');
    note.textContent = state.devices.length ? activeCount + ' of ' + state.devices.length + ' devices active' : 'No devices registered yet';
    note.classList.toggle('is-live', activeCount > 0);
    markMenuSelection('target', state.targetDevice);
  }

  function renderTargetOptions() {
    var options = ['<li class="option" role="option" tabindex="0" data-value="' + ANY_TARGET + '" aria-selected="false">' +
      '<span class="channel-dot auto"></span>' +
      '<span class="option-copy"><strong>Any Available Device</strong><small>Auto-assign &#183; the first device to poll claims it</small></span>' +
      '<span class="option-badge auto">Auto</span>' +
      '<span class="check">' + SVG_CHECK + '</span></li>'];
    state.devices.forEach(function (device) {
      var active = Boolean(device.active_status);
      options.push('<li class="option" role="option" tabindex="0" data-value="' + escapeHtml(device.device_id) + '" aria-disabled="' + (active ? 'false' : 'true') + '" aria-selected="false">' +
        '<span class="channel-dot ' + (active ? 'device' : 'offline') + '"></span>' +
        '<span class="option-copy"><strong>' + escapeHtml(device.phone_model || 'Unknown model') + '</strong><small>' + escapeHtml(device.device_id) + '</small></span>' +
        '<span class="option-badge ' + (active ? 'active' : 'blocked') + '"><span class="dot"></span>' + (active ? 'Active' : 'Blocked') + '</span>' +
        '<span class="check">' + SVG_CHECK + '</span></li>');
    });
    byId('target-menu').innerHTML = options.join('');
    setTargetDevice(state.targetDevice);
  }

  function toggleDevice(deviceId, nextActive, button) {
    button.disabled = true;
    return api('/api/admin/devices/' + encodeURIComponent(deviceId), { method: 'PATCH', body: JSON.stringify({ activeStatus: nextActive }) }).then(function () {
      notify(nextActive ? 'Device reactivated for gateway access.' : 'Device blocked from claiming withdrawals.');
      return load({ silent: true });
    }).catch(function (error) {
      notify(error && error.message ? error.message : 'Unable to update device status.', 'error');
    }).then(function () {
      button.disabled = false;
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    var form = event.target;
    var submit = byId('submit-withdrawal');
    var payload = {
      destinationPhone: byId('phone').value.trim(),
      amount: Number(byId('amount').value),
      channel: state.channel,
      notes: byId('notes').value.trim() || undefined,
      targetDeviceId: state.targetDevice
    };
    if (!payload.destinationPhone || !(payload.amount > 0)) {
      notify('Provide a destination phone number and an amount above zero.', 'error');
      return;
    }
    submit.disabled = true;
    submit.classList.add('is-busy');
    api('/api/admin/withdrawals', { method: 'POST', body: JSON.stringify(payload) }).then(function (result) {
      var reference = result && result.withdrawal ? result.withdrawal.transaction_id : 'unknown';
      var target = state.targetDevice === ANY_TARGET ? null : findDevice(state.targetDevice);
      form.reset();
      setChannel('TELEBIRR');
      notify('Withdrawal ' + reference + ' queued ' + (target ? 'for ' + (target.phone_model || target.device_id) + '.' : 'for auto-assignment.'));
      return load({ silent: true });
    }).catch(function (error) {
      var message = error && error.message ? error.message : 'Unable to create the withdrawal.';
      notify(message, 'error');
      if (message.toLowerCase().indexOf('device') !== -1) return load({ silent: true });
    }).then(function () {
      submit.disabled = false;
      submit.classList.remove('is-busy');
    });
  }

  function init() {
    byId('unlock').addEventListener('click', function () { load(); });
    byId('refresh').addEventListener('click', function () { load(); });
    byId('key').addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        load();
      }
    });
    byId('key-toggle').addEventListener('click', function () {
      var input = byId('key');
      var reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      byId('key-field').classList.toggle('revealed', reveal);
      byId('key-toggle').setAttribute('aria-label', reveal ? 'Hide admin key' : 'Show admin key');
      byId('key-toggle').title = reveal ? 'Hide admin key' : 'Show admin key';
      input.focus();
    });
    byId('withdrawal-form').addEventListener('submit', handleSubmit);
    bindMenu('channel', setChannel);
    bindMenu('target', setTargetDevice);
    document.addEventListener('click', function () {
      Object.keys(MENUS).forEach(function (key) {
        setMenuOpen(key, false);
      });
    });
    byId('devices').addEventListener('click', function (event) {
      var button = event.target.closest('[data-action="toggle"]');
      if (!button) return;
      toggleDevice(button.getAttribute('data-device-id'), button.getAttribute('data-active') !== 'true', button);
    });
    setInterval(function () {
      if (state.unlocked && document.visibilityState === 'visible') load({ silent: true });
    }, REFRESH_MS);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
`;

export async function dashboard(_request: FastifyRequest, reply: FastifyReply) {
  return reply.header('cache-control', 'no-store').type('text/html; charset=utf-8').send(PAGE);
}

export async function dashboardScript(_request: FastifyRequest, reply: FastifyReply) {
  return reply.header('cache-control', 'no-store').type('application/javascript; charset=utf-8').send(CLIENT);
}

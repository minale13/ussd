/** Content area, grids and responsive breakpoints. */
export const GRID = `
.content{padding:26px 26px 46px;display:flex;flex-direction:column;gap:22px;max-width:1560px}
.page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;flex-wrap:wrap}
.page-title{font:800 25px/1.2 var(--font-display);letter-spacing:-.02em}
.page-sub{margin-top:6px;font-size:13.5px;color:var(--text-2)}
.clock{
  display:flex;align-items:center;gap:11px;
  padding:11px 16px;border-radius:var(--r-md);
  background:linear-gradient(158deg,rgba(255,255,255,.05),rgba(255,255,255,.01));
  border:1px solid var(--line);
}
.clock .ico{color:var(--primary)}
.clock-date{font-size:13px;font-weight:600;line-height:1.3}
.clock-time{margin-top:2px;font-size:11.5px;color:var(--text-2);letter-spacing:.03em}

.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.panels{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1.25fr) minmax(0,.9fr);gap:18px;align-items:start}

.scrim{display:none}
@media(max-width:1280px){
  .panels{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
  .panels > .panel-quick{grid-column:1 / -1}
}
@media(max-width:1120px){
  .stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .panels{grid-template-columns:minmax(0,1fr)}
}
@media(max-width:900px){
  .sidebar{
    transform:translateX(-100%);
    transition:transform var(--t-slow) var(--ease);
    box-shadow:0 0 60px rgba(0,0,0,.6);
  }
  body.nav-open .sidebar{transform:none}
  .main{margin-left:0}
  .nav-toggle{display:grid}
  .scrim{
    display:block;position:fixed;inset:0;z-index:55;
    background:rgba(2,8,20,.62);backdrop-filter:blur(2px);
    opacity:0;pointer-events:none;transition:opacity var(--t-mid) var(--ease);
  }
  body.nav-open .scrim{opacity:1;pointer-events:auto}
}
@media(max-width:720px){
  .header{height:auto;min-height:var(--header-h);padding:12px 16px;flex-wrap:wrap}
  .search{order:3;max-width:none;flex-basis:100%}
  .content{padding:18px 16px 40px;gap:18px}
  .stats{grid-template-columns:minmax(0,1fr)}
  .page-title{font-size:21px}
  .admin-meta{display:none}
  .clock{width:100%}
}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
}
`;
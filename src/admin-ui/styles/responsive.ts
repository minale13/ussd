/**
 * Responsive overrides, mobile-first.
 *
 * The base layout is a single phone-width column with a bottom nav. Each block
 * below relaxes one constraint as the viewport grows, so nothing here is needed
 * for the phone case to look right.
 */
export const RESPONSIVE = `
/* --- Tablet: widen the column and lift it off the page edge. --- */
@media(min-width:768px){
  .app{
    --shell-max:640px;
    max-width:var(--shell-max);
    margin:0 auto;
    border-left:1px solid var(--line-soft);
    border-right:1px solid var(--line-soft);
  }
  .content{padding:20px 24px calc(var(--nav-h) + 34px);gap:18px}
  .balance{padding:24px}
  .balance-amount{font-size:38px}
  .greet-hello{font-size:24px}
  .list{padding:0 18px 18px;gap:12px}
  .qa-item{min-height:132px;padding:18px}
}

/* --- Desktop: real estate is plentiful, so the bottom nav becomes a left
   rail and the content can sit two-up. The same markup serves both. --- */
@media(min-width:1100px){
  .app{
    --shell-max:1180px;
    flex-direction:row;align-items:flex-start;
  }
  .bottom-nav{
    position:sticky;top:0;left:auto;right:auto;bottom:auto;
    width:230px;height:100dvh;flex:none;flex-direction:column;
    padding:20px 14px;gap:4px;
    border-top:0;border-right:1px solid var(--line-soft);
  }
  .nav-item{
    flex:none;flex-direction:row;justify-content:flex-start;gap:12px;
    min-height:48px;padding:11px 14px;border-radius:14px;
    font-size:13.5px;letter-spacing:0;
  }
  .nav-item:hover{background:rgba(255,255,255,.05);color:var(--text)}
  .nav-item .ico{transform:none}
  .nav-item.is-active .ico{transform:none}
  /* The top marker becomes a left marker in the rail. */
  .nav-item.is-active::before{
    top:50%;left:0;transform:translateY(-50%);
    width:3px;height:22px;border-radius:0 3px 3px 0;
  }
  .nav-item.is-active{background:rgba(0,229,195,.09)}
  .shell-main{flex:1;min-width:0;display:flex;flex-direction:column}
  .content{padding:24px 30px 48px}
  .summary{grid-template-columns:repeat(4,minmax(0,1fr))}
  .qa-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
  /* Two columns: a wide primary card beside a narrower supporting one. */
  .split{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:18px;align-items:start}
  .sheet{
    left:auto;right:28px;bottom:28px;top:28px;width:400px;
    max-height:none;border-radius:26px;transform:translateX(calc(100% + 40px));
  }
  .sheet.is-open{transform:none}
  .toast{bottom:28px}
  /* The splash/login are no longer full-bleed on a wide screen. */
  .splash,.login{max-width:520px;margin:0 auto;inset:0}
  .splash{border-radius:0}
}

@media(min-width:1500px){
  .app{--shell-max:1320px}
  .content{padding:28px 40px 56px}
}

/* --- Very wide phones: stop the summary grid from stretching. --- */
@media(max-width:359px){
  .summary{grid-template-columns:minmax(0,1fr)}
  .balance-amount{font-size:29px}
  .qa-grid{grid-template-columns:minmax(0,1fr)}
}

@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important}
}
`;

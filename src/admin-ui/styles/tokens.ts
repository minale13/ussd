/**
 * Design tokens for the admin console.
 *
 * Kept as a plain exported string rather than a .css file because the console is
 * served straight from the Node process as a single inline <style> block: there is
 * no bundler and no static asset pipeline in this project.
 */
export const TOKENS = `
:root{
  color-scheme:dark;

  /* Midnight surfaces. Near-black at the edges, deep navy in the middle: the
     app is designed dark-first so the neon accents carry all the contrast. */
  --bg-0:#02060F;
  --bg-1:#04122B;
  --bg-2:#071C38;
  --card:#0A1E3C;
  --card-2:#0C2749;

  /* Neon accents. Turquoise leads; green is the "settled/positive" sibling. */
  --neon:#00E5C3;
  --neon-dim:#0FB9A0;
  --neon-green:#00E08F;
  --blue:#1683FF;
  --purple:#7C3AED;
  --amber:#FFB020;
  --danger:#FF4D6D;

  /* Semantic states. */
  --success:#00E08F;
  --warning:#FFB020;
  --error:#FF4D6D;

  /* Type. */
  --text:#F4F9FF;
  --text-2:#8FA8C3;
  --text-3:#63799A;

  /* Hairline borders, deliberately low alpha so cards read as glowing glass. */
  --line:rgba(0,229,195,.18);
  --line-soft:rgba(120,190,255,.12);
  --line-strong:rgba(0,229,195,.40);

  /* Radii. Large and round: the reference design is a soft, glowing card system. */
  --r-sm:12px;
  --r-md:16px;
  --r-lg:20px;
  --r-xl:26px;
  --r-pill:999px;

  /* Motion. 150-300ms, ease-out, never bouncy. */
  --t-fast:150ms;
  --t-mid:220ms;
  --t-slow:320ms;
  --ease:cubic-bezier(.4,0,.2,1);

  /* Neon glow. Every raised surface carries a soft turquoise halo. */
  --glow:0 0 0 1px rgba(0,229,195,.20), 0 10px 30px rgba(0,229,195,.13);
  --glow-strong:0 0 0 1px rgba(0,229,195,.45), 0 14px 42px rgba(0,229,195,.26);
  --shadow:0 18px 44px rgba(1,7,18,.55);
  --shadow-sm:0 8px 22px rgba(1,7,18,.42);

  /* Shell metrics. The column is a phone width by default and widens with
     min() on tablet/desktop, so one layout serves every breakpoint. */
  --nav-h:66px;
  --tap:44px;
  --shell-max:480px;

  --font:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --font-display:'Plus Jakarta Sans','Inter',ui-sans-serif,system-ui,sans-serif;
}
`;
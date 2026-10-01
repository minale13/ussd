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

  /* Surfaces: deep navy, near-black at the edges, never a flat grey. */
  --bg-0:#020B1A;
  --bg-1:#061426;
  --bg-2:#081A30;
  --card:#0A1B30;
  --card-2:#0B2038;

  /* Brand accents. Cyan/teal leads; blue and purple support. */
  --primary:#00E5C3;
  --primary-dim:#0FB9A0;
  --blue:#1683FF;
  --purple:#7C3AED;

  /* Semantic states. */
  --success:#00D68F;
  --warning:#F59E0B;
  --danger:#EF4444;

  /* Type. */
  --text:#F8FAFC;
  --text-2:#8FA8C3;

  /* Hairline borders, deliberately low alpha so cards read as glass. */
  --line:rgba(80,160,220,0.20);
  --line-soft:rgba(80,160,220,0.12);
  --line-strong:rgba(80,160,220,0.34);

  /* Radii: 12-18px per the design spec. */
  --r-sm:12px;
  --r-md:14px;
  --r-lg:18px;

  /* Motion. 150-250ms, ease-out, never bouncy. */
  --t-fast:150ms;
  --t-mid:200ms;
  --t-slow:250ms;
  --ease:cubic-bezier(.4,0,.2,1);

  --shadow:0 18px 44px rgba(1,7,18,.55);
  --shadow-sm:0 8px 22px rgba(1,7,18,.42);
  --glow-primary:0 0 0 1px rgba(0,229,195,.28), 0 8px 26px rgba(0,229,195,.18);

  --sidebar-w:258px;
  --header-h:66px;

  --font:'Inter',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  --font-display:'Plus Jakarta Sans','Inter',ui-sans-serif,system-ui,sans-serif;
}
`;
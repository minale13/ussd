/**
 * Assembles the console stylesheet from its parts.
 *
 * Order matters: tokens must come first so every later rule can reference the
 * custom properties, and the responsive overrides must come last so they win.
 */
import { TOKENS } from './styles/tokens.js';
import { BASE } from './styles/base.js';
import { LAYOUT } from './styles/layout.js';
import { GRID } from './styles/grid.js';
import { COMPONENTS } from './styles/components.js';
import { CONTROLS } from './styles/controls.js';
import { DATA } from './styles/data.js';
import { PANELS } from './styles/panels.js';
import { VIEWS_CSS } from './styles/views.js';

export const STYLESHEET = [TOKENS, BASE, LAYOUT, GRID, COMPONENTS, CONTROLS, DATA, PANELS, VIEWS_CSS].join('\n');
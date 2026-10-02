/**
 * Assembles the app stylesheet from its parts.
 *
 * Order matters: tokens must come first so every later rule can reference the
 * custom properties, and the responsive overrides come last so they win.
 */
import { TOKENS } from './styles/tokens.js';
import { BASE } from './styles/base.js';
import { SHELL } from './styles/shell.js';
import { SCREENS } from './styles/screens.js';
import { RESPONSIVE } from './styles/responsive.js';

export const STYLESHEET = [TOKENS, BASE, SHELL, SCREENS, RESPONSIVE].join('\n');
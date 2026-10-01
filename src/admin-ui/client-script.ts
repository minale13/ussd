import { CLIENT_CORE } from './client/01-core.js';
import { CLIENT_RENDER } from './client/02-render.js';
import { CLIENT_FLEET } from './client/03-fleet.js';
import { CLIENT_LEDGER } from './client/04-ledger.js';
import { CLIENT_FORMS } from './client/05-forms.js';
import { CLIENT_APP } from './client/06-app.js';
import { CLIENT_ROUTER } from './client/08-router.js';
import { CLIENT_VIEWS } from './client/09-views.js';
import { CLIENT_REALTIME } from './client/10-realtime.js';
import { CLIENT_INIT } from './client/07-init.js';

/**
 * The full client bundle.
 *
 * The parts are concatenated inside the single IIFE that CLIENT_CORE opens
 * and CLIENT_INIT closes, so they share one scope without a module loader.
 * Function declarations hoist, so ordering here is for readability only.
 */
export const CLIENT_SCRIPT = [
  CLIENT_CORE, CLIENT_RENDER, CLIENT_FLEET, CLIENT_LEDGER, CLIENT_FORMS,
  CLIENT_ROUTER, CLIENT_VIEWS, CLIENT_REALTIME, CLIENT_APP, CLIENT_INIT
].join('\n');

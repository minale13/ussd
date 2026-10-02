import { CLIENT_CORE } from './client/01-core.js';
import { CLIENT_RENDER } from './client/02-render.js';
import { CLIENT_DETAIL } from './client/03-detail.js';
import { CLIENT_FORMS } from './client/04-forms.js';
import { CLIENT_SUBMIT } from './client/05-submit.js';
import { CLIENT_ROUTER } from './client/06-router.js';
import { CLIENT_APP } from './client/07-app.js';
import { CLIENT_REALTIME } from './client/10-realtime.js';
import { CLIENT_INIT } from './client/09-init.js';

/**
 * The full client bundle.
 *
 * The parts are concatenated inside the single IIFE that CLIENT_CORE opens
 * and CLIENT_INIT closes, so they share one scope without a module loader.
 * Function declarations hoist, so ordering here is for readability only.
 */
export const CLIENT_SCRIPT = [
  CLIENT_CORE, CLIENT_RENDER, CLIENT_DETAIL, CLIENT_FORMS, CLIENT_SUBMIT,
  CLIENT_ROUTER, CLIENT_APP, CLIENT_REALTIME, CLIENT_INIT
].join('\n');

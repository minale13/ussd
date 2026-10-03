import Fastify, { type FastifyError } from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import rawBody from 'fastify-raw-body';
import { authenticate } from './middleware/auth.js';
import * as withdrawal from './controllers/withdrawal.controller.js';
import * as webhook from './controllers/webhook.controller.js';
import * as admin from './controllers/admin.controller.js';
import { dashboard as adminDashboard, dashboardScript as adminDashboardScript } from './controllers/admin-dashboard.controller.js';
import { appAgentStyles, appAgentUi } from './controllers/app-ui.controller.js';
import { adminLogin } from './controllers/admin-login.controller.js';
import { eventStream } from './controllers/admin-events.controller.js';
import { smsCallback, smsEvents, authenticateGatewayDevice } from './controllers/sms.controller.js';
import { env, envResolution } from './config/env.js';
import { authenticateAdmin } from './middleware/admin-auth.js';

export function buildApp() {
  const app = Fastify({
    // Only honour X-Forwarded-* when a platform proxy is actually in front of
    // the service; see TRUST_PROXY in config/env.ts.
    trustProxy: env.TRUST_PROXY,
    logger: { redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.destination'] }
  });
  app.register(helmet);
  app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  app.register(rawBody, { field: 'rawBody', global: false, encoding: 'utf8', runFirst: true });

  // An uncaught route error must not become an opaque platform failure. Vercel
  // reports an unhandled exception as FUNCTION_INVOCATION_FAILED, which tells an
  // operator nothing about what actually went wrong, so the message is logged in
  // full here and the client gets a JSON body naming it.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    const status = error.statusCode ?? 500;
    reply.code(status).send({
      success: false,
      error: status === 500 ? 'Internal server error' : error.message
    });
  });
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ success: false, error: `Route ${request.method} ${request.url} not found` });
  });

  app.get('/health', async () => ({
    status: envResolution.missing.length === 0 ? 'ok' : 'degraded',
    database: envResolution.missing.includes('DATABASE_URL') ? 'disabled' : 'required',
    redis: envResolution.missing.includes('REDIS_URL') ? 'disabled' : 'required',
    admin: envResolution.adminConfigured ? 'configured' : 'not configured',
    // Names only, never values, so the response is safe to expose publicly.
    // This is what makes a half-finished Vercel dashboard diagnosable: the
    // endpoint reports 200 and lists exactly which variables are absent.
    missing: envResolution.missing
  }));
  // The bare host is the App Agent UI that ships in the APK. It used to redirect
  // to /admin, which meant the two surfaces could never be told apart and the
  // console login was the first thing anyone saw at the root. They are separate
  // documents now; /admin is the only route that serves the dashboard.
  app.get('/', appAgentUi);
  app.get('/tailwind.css', appAgentStyles);
  app.get('/admin', adminDashboard);
  // Every screen of the app is a real, bookmarkable URL. They all serve the same
  // single-page shell; the client router picks the screen from the pathname, so a
  // hard refresh or a shared link lands in the right place. The four bottom-nav
  // destinations plus the screens reached by drilling in.
  for (const section of ['transactions', 'devices', 'more', 'send', 'device', 'notifications', 'profile']) {
    app.get(`/admin/${section}`, adminDashboard);
  }
  app.get('/admin/app.js', adminDashboardScript);
  // Credential-only sign-in. Kept off the authenticated reads below because it is
  // the one admin route that must answer while the operator is still locked, and
  // answering it must not depend on the database being reachable.
  app.post('/api/admin/login', adminLogin);
  app.get('/api/admin/login', async (_request, reply) => reply.redirect('/admin', 302));
  app.get('/api/admin/overview', { preHandler: authenticateAdmin }, admin.overview);
  app.get('/api/admin/devices', { preHandler: authenticateAdmin }, admin.devices);
  app.get('/api/admin/transactions', { preHandler: authenticateAdmin }, admin.transactions);
  app.get('/api/admin/withdrawals', { preHandler: authenticateAdmin }, admin.withdrawals);
  app.post('/api/admin/withdrawals/:id/cancel', { preHandler: authenticateAdmin }, admin.cancelWithdrawalRequest);
  app.get('/api/admin/users', { preHandler: authenticateAdmin }, admin.users);
  app.get('/api/admin/activity', { preHandler: authenticateAdmin }, admin.activity);
  app.get('/api/admin/settings', { preHandler: authenticateAdmin }, admin.settings);
  app.patch('/api/admin/devices/:deviceId', { preHandler: authenticateAdmin }, admin.updateDevice);
  app.post('/api/admin/devices/:deviceId/restart', { preHandler: authenticateAdmin }, admin.restartDevice);
  app.post('/api/admin/withdrawals', { preHandler: authenticateAdmin }, admin.manualWithdrawal);
  app.post('/api/withdrawals', { preHandler: authenticate }, withdrawal.create);
  app.get('/api/withdrawals/pending', { preHandler: authenticate }, withdrawal.pending);
  app.get('/api/withdrawals/:id', { preHandler: authenticate }, withdrawal.get);
  app.post('/api/withdrawals/:id/cancel', { preHandler: authenticate }, withdrawal.cancel);
  app.post('/api/webhooks/payment', { config: { rawBody: true } }, webhook.payment);

  // Inbound SMS forwarded by the Android gateway. Authenticated with the same
  // device identity the phone already uses for polling.
  app.post('/api/gateway/sms-callback', { preHandler: authenticateGatewayDevice }, smsCallback);

  // SMS activity for the console, and the live event stream that pushes new
  // messages to an open dashboard. Both are admin-authenticated.
  app.get('/api/admin/sms', { preHandler: authenticateAdmin }, smsEvents);
  app.get('/api/admin/stream', { preHandler: authenticateAdmin }, eventStream);
  return app;
}
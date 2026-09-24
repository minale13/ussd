import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import rawBody from 'fastify-raw-body';
import { authenticate } from './middleware/auth.js';
import * as withdrawal from './controllers/withdrawal.controller.js';
import * as webhook from './controllers/webhook.controller.js';
import * as admin from './controllers/admin.controller.js';
import { dashboard as adminDashboard, dashboardScript as adminDashboardScript } from './controllers/admin-dashboard.controller.js';
import { env } from './config/env.js';
import { authenticateAdmin } from './middleware/admin-auth.js';

export function buildApp() {
  const app = Fastify({ logger: { redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.destination'] } });
  app.register(helmet);
  app.register(rateLimit, { max: 100, timeWindow: '1 minute' });
  app.register(rawBody, { field: 'rawBody', global: false, encoding: 'utf8', runFirst: true });
  app.get('/health', async () => ({
    status: env.LOCAL_INFRA_FALLBACK && env.NODE_ENV === 'development' ? 'degraded' : 'ok',
    database: env.LOCAL_INFRA_FALLBACK && env.NODE_ENV === 'development' ? 'disabled' : 'required',
    redis: env.LOCAL_INFRA_FALLBACK && env.NODE_ENV === 'development' ? 'disabled' : 'required'
  }));
  app.get('/admin', adminDashboard);
  app.get('/admin/app.js', adminDashboardScript);
  app.get('/api/admin/overview', { preHandler: authenticateAdmin }, admin.overview);
  app.get('/api/admin/devices', { preHandler: authenticateAdmin }, admin.devices);
  app.patch('/api/admin/devices/:deviceId', { preHandler: authenticateAdmin }, admin.updateDevice);
  app.post('/api/admin/withdrawals', { preHandler: authenticateAdmin }, admin.manualWithdrawal);
  app.post('/api/withdrawals', { preHandler: authenticate }, withdrawal.create);
  app.get('/api/withdrawals/pending', { preHandler: authenticate }, withdrawal.pending);
  app.get('/api/withdrawals/:id', { preHandler: authenticate }, withdrawal.get);
  app.post('/api/withdrawals/:id/cancel', { preHandler: authenticate }, withdrawal.cancel);
  app.post('/api/webhooks/payment', { config: { rawBody: true } }, webhook.payment);
  return app;
}
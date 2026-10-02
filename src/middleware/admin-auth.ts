import type { FastifyReply, FastifyRequest } from 'fastify';
import { env, envResolution } from '../config/env.js';

/**
 * The console signs in with two values: the administrator username typed on the
 * login screen and the password, which is the admin API key. Both travel as
 * headers on every admin call (`x-admin-username` / `x-admin-key`) because the
 * client keeps them in the form only - never in storage, a cookie or the URL.
 *
 * When the deployment has no real key, config/env.ts substitutes a per-process
 * random one so the process can still boot. Accepting that placeholder would hand
 * out admin access to anyone who guessed a 48-character secret, so this refuses
 * outright instead and reports 503. An unconfigured console stays closed; it
 * never opens by accident.
 */
export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!envResolution.adminConfigured) {
    await reply.code(503).send({
      success: false,
      error: 'Admin console is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in the deployment environment.'
    });
    return;
  }
  const username = request.headers['x-admin-username'];
  const key = request.headers['x-admin-key'];
  if (username !== env.ADMIN_USERNAME || key !== env.ADMIN_API_KEY) {
    await reply.code(401).send({ success: false, error: 'Admin authentication required' });
  }
}
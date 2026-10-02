import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

/**
 * The console signs in with two values: the administrator username typed on the
 * login screen and the password, which is the admin API key. Both travel as
 * headers on every admin call (`x-admin-username` / `x-admin-key`) because the
 * client keeps them in the form only - never in storage, a cookie or the URL.
 */
export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const username = request.headers['x-admin-username'];
  const key = request.headers['x-admin-key'];
  if (username !== env.ADMIN_USERNAME || key !== env.ADMIN_API_KEY) {
    await reply.code(401).send({ success: false, error: 'Admin authentication required' });
  }
}
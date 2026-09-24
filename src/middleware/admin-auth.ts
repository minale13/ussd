import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

export async function authenticateAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.headers['x-admin-key'] !== env.ADMIN_API_KEY) {
    await reply.code(401).send({ success: false, error: 'Admin authentication required' });
  }
}
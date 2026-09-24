import type { FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = request.headers['x-user-id'];
  if (typeof userId !== 'string' || userId.length < 10) {
    await reply.code(401).send({ success: false, error: 'Authentication required' });
    return;
  }
  request.userId = userId;
}
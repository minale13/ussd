import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { processPaymentWebhook } from '../webhooks/payment.webhook.js';

const webhookSchema = z.object({
  eventId: z.string().min(1).max(256),
  eventType: z.string().min(1).max(128),
  providerTransactionId: z.string().min(1).max(256),
  status: z.enum(['COMPLETED', 'FAILED']),
  failureReason: z.string().max(512).optional()
});

export async function payment(request: FastifyRequest, reply: FastifyReply) {
  const parsed = webhookSchema.safeParse(request.body);
  const signature = request.headers['x-provider-signature'];
  if (!parsed.success || typeof signature !== 'string') return reply.code(400).send({ success: false, error: 'Invalid webhook request' });
  try {
    const rawBody = (request as FastifyRequest & { rawBody?: string }).rawBody ?? JSON.stringify(request.body);
    const result = await processPaymentWebhook('generic', parsed.data, rawBody, signature);
    return reply.send({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_WEBHOOK_SIGNATURE') return reply.code(401).send({ success: false, error: 'Invalid webhook signature' });
    if (error instanceof Error && error.message === 'UNKNOWN_WITHDRAWAL') return reply.code(404).send({ success: false, error: 'Unknown withdrawal' });
    request.log.error({ err: error }, 'payment webhook processing failed');
    return reply.code(500).send({ success: false, error: 'Unable to process webhook' });
  }
}
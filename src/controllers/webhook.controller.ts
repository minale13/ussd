import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { envResolution } from '../config/env.js';
import { processPaymentWebhook } from '../webhooks/payment.webhook.js';

const webhookSchema = z.object({
  eventId: z.string().min(1).max(256),
  eventType: z.string().min(1).max(128),
  providerTransactionId: z.string().min(1).max(256),
  status: z.enum(['COMPLETED', 'FAILED']),
  failureReason: z.string().max(512).optional()
});

export async function payment(request: FastifyRequest, reply: FastifyReply) {
  // Without a real secret, config/env.ts substitutes a per-process random
  // placeholder so the function still boots. Verifying against that would reject
  // every genuine callback, and reporting it as 401 would point the operator at
  // the provider's signing when the real problem is an unset deployment variable.
  // Refusing explicitly keeps this failing closed - an unconfigured endpoint
  // never accepts a forged webhook - while naming the cause.
  if (envResolution.missing.includes('PAYMENT_WEBHOOK_SECRET')) {
    return reply.code(503).send({
      success: false,
      error: 'Payment webhook is not configured. Set PAYMENT_WEBHOOK_SECRET in the deployment environment.'
    });
  }

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
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ingestSms, listSmsEvents } from '../services/sms.service.js';
import { publish } from '../events/bus.js';

const smsSchema = z.object({
  body: z.string().trim().min(1).max(4096),
  sender: z.string().trim().max(64).nullish(),
  receivedAt: z.string().datetime().nullish(),
  channel: z.enum(['TELEBIRR', 'CBE']).nullish()
});

declare module 'fastify' {
  interface FastifyRequest {
    deviceId?: string;
  }
}

/**
 * Device identity for gateway callbacks.
 *
 * Reuses the same trust model as `GET /api/withdrawals/pending`: the handset
 * presents its stable `x-device-id` (ANDROID_ID) plus the gateway `x-user-id`.
 * There is no per-device secret in the existing design, so this is deliberately
 * no weaker than the polling endpoint - but it is also not stronger, and a
 * device secret would be the right hardening if this surface is ever exposed
 * beyond a private network.
 */
export async function authenticateGatewayDevice(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const deviceId = request.headers['x-device-id'];
  const userId = request.headers['x-user-id'];
  if (typeof deviceId !== 'string' || deviceId.length < 4 || deviceId.length > 128) {
    await reply.code(401).send({ success: false, error: 'A valid x-device-id is required' });
    return;
  }
  if (typeof userId !== 'string' || userId.length < 10) {
    await reply.code(401).send({ success: false, error: 'Authentication required' });
    return;
  }
  request.deviceId = deviceId;
}

/**
 * Receives an inbound SMS forwarded by the Android gateway.
 *
 * Always answers 200 for a well-formed message, including a duplicate: the
 * handset has no useful recovery for a non-2xx and would retry forever. Parse
 * failures are reported in the body (`parsed: false`) and the raw message is
 * still stored, because an operator needs to see messages the parser missed.
 */
export async function smsCallback(request: FastifyRequest, reply: FastifyReply) {
  const parsed = smsSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.code(400).send({ success: false, error: 'Invalid SMS payload' });
  }

  const result = await ingestSms({
    deviceId: request.deviceId as string,
    body: parsed.data.body,
    sender: parsed.data.sender ?? null,
    receivedAt: parsed.data.receivedAt ?? null,
    channel: parsed.data.channel ?? null
  });

  // Only a genuinely new message wakes the console.
  if (result.stored) {
    publish({
      type: 'sms',
      deviceId: request.deviceId as string,
      bankBalance: result.bankBalance,
      parsed: result.parsed as unknown as Record<string, unknown>
    });
  }

  return reply.code(result.stored ? 201 : 200).send({
    success: true,
    stored: result.stored,
    duplicate: !result.stored,
    parsed: {
      provider: result.parsed.provider,
      channel: result.parsed.channel,
      direction: result.parsed.direction,
      amount: result.parsed.amount,
      reference: result.parsed.reference,
      counterparty: result.parsed.counterparty,
      balance: result.parsed.balance,
      recognised: result.parsed.balance !== null || result.parsed.amount !== null
    },
    bank_balance: result.bankBalance
  });
}

/** Recent SMS activity for the Logs view. Admin-authenticated. */
export async function smsEvents(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as { deviceId?: string; limit?: string };
  return reply.send({ success: true, events: await listSmsEvents(query.deviceId, Number(query.limit ?? 50)) });
}
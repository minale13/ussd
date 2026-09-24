import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../config/env.js';
import { cancelWithdrawal, claimPendingWithdrawals, createWithdrawal, getWithdrawal } from '../services/withdrawal.service.js';
import { moneyToCents, normalizeMoney } from '../utils/money.js';

export const createSchema = z.object({
  userId: z.string().uuid(),
  amount: z.string().trim().regex(/^\d+(\.\d{1,2})?$/).transform(normalizeMoney),
  currency: z.string().length(3).toUpperCase(),
  destinationType: z.enum(['PHONE', 'ACCOUNT']),
  destination: z.string().trim().min(6).max(64)
});

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success || parsed.data.userId !== request.userId) return reply.code(400).send({ success: false, error: 'Invalid withdrawal request' });
  const amount = moneyToCents(parsed.data.amount);
  if (amount <= 0n || amount < moneyToCents(env.MIN_WITHDRAWAL) || amount > moneyToCents(env.MAX_WITHDRAWAL)) {
    return reply.code(400).send({ success: false, error: 'Amount outside allowed limits' });
  }
  const key = request.headers['idempotency-key'];
  if (typeof key !== 'string' || key.length < 8 || key.length > 128 || key.trim() !== key) return reply.code(400).send({ success: false, error: 'Idempotency-Key is required' });
  try {
    const result = await createWithdrawal({ ...parsed.data, idempotencyKey: key });
    return reply.code(result.existing ? 200 : 202).send({ success: true, transactionId: result.withdrawal.transaction_id, status: result.withdrawal.status, withdrawal: result.withdrawal });
  } catch (error) {
    if (error instanceof Error && error.message === 'INSUFFICIENT_BALANCE') return reply.code(409).send({ success: false, error: 'Insufficient balance' });
    if (error instanceof Error && error.message === 'WALLET_NOT_FOUND') return reply.code(404).send({ success: false, error: 'Wallet not found' });
    request.log.error({ err: error }, 'withdrawal creation failed');
    return reply.code(500).send({ success: false, error: 'Unable to create withdrawal' });
  }
}

export async function get(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  const result = await getWithdrawal(params.id, request.userId!);
  if (!result) return reply.code(404).send({ success: false, error: 'Withdrawal not found' });
  return reply.send({ success: true, withdrawal: result });
}

export async function cancel(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as { id: string };
  try {
    const result = await cancelWithdrawal(params.id, request.userId!);
    return reply.send({ success: true, withdrawal: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') return reply.code(404).send({ success: false, error: 'Withdrawal not found' });
    if (error instanceof Error && error.message === 'INVALID_STATE_TRANSITION') return reply.code(409).send({ success: false, error: 'Withdrawal cannot be cancelled in its current state' });
    request.log.error({ err: error }, 'withdrawal cancellation failed');
    return reply.code(500).send({ success: false, error: 'Unable to cancel withdrawal' });
  }
}

export async function pending(request: FastifyRequest, reply: FastifyReply) {
  const limit = Math.min(Math.max(Number((request.query as { limit?: string }).limit ?? 1), 1), 10);
  const deviceId = request.headers['x-device-id'];
  const phoneModel = request.headers['x-phone-model'];
  if (typeof deviceId !== 'string' || typeof phoneModel !== 'string' || !deviceId || !phoneModel) {
    return reply.code(400).send({ success: false, error: 'Device ID and phone model are required' });
  }
  try {
    return reply.send({ success: true, withdrawals: await claimPendingWithdrawals(deviceId, phoneModel, limit) });
  } catch (error) {
    if (error instanceof Error && error.message === 'DEVICE_BLOCKED') return reply.code(403).send({ success: false, error: 'Device is blocked' });
    throw error;
  }
}
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const withdrawalQueue = new Queue<{ withdrawalId: string }>('withdrawals', { connection: redis });

export async function enqueueWithdrawal(withdrawalId: string): Promise<void> {
  await withdrawalQueue.add('process-withdrawal', { withdrawalId }, {
    jobId: withdrawalId,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 1000,
    removeOnFail: 5000
  });
}
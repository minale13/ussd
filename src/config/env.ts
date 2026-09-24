import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOCAL_INFRA_FALLBACK: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  ADMIN_API_KEY: z.string().min(16),
  ADMIN_WITHDRAWAL_USER_ID: z.string().uuid(),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16),
  MIN_WITHDRAWAL: z.string().regex(/^\d+(\.\d{1,2})?$/).default('1.00'),
  MAX_WITHDRAWAL: z.string().regex(/^\d+(\.\d{1,2})?$/).default('100000.00'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(10),
  PROCESSING_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(300)
});

export function parseEnv(source: NodeJS.ProcessEnv = process.env) {
  return envSchema.parse(source);
}

export const env = parseEnv();
import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOCAL_INFRA_FALLBACK: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  PORT: z.coerce.number().int().positive().default(3000),
  // Cloud platforms route to the container through their own edge, so the
  // default is the wildcard address. Overridable for hosts that front the
  // service with a private interface.
  HOST: z.string().min(1).default('0.0.0.0'),
  // TLS is terminated by the platform (Render, Vercel, Fly) and the real client
  // arrives in X-Forwarded-For. Fastify ignores that header unless trustProxy
  // is on, which would make the rate limiter treat every caller as one IP and
  // record the edge address as the hand-out IP. Off by default so a directly
  // exposed instance never trusts a client-supplied header.
  TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  // The outbox publisher is a setInterval that retries publishing committed
  // withdrawals to Redis. A long-lived host wants it; a serverless instance
  // does not, because every cold start would spawn another copy and be frozen
  // between invocations anyway. Set false on serverless and run the worker as a
  // separate long-lived service instead.
  OUTBOX_PUBLISHER_ENABLED: z.enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  // The console signs in with a username plus this key. Eight characters is the
  // floor; longer, random secrets are still strongly recommended for anything
  // that is not a local preview.
  ADMIN_API_KEY: z.string().min(8),
  ADMIN_USERNAME: z.string().min(1).default('admin'),
  ADMIN_WITHDRAWAL_USER_ID: z.string().uuid(),
  PAYMENT_WEBHOOK_SECRET: z.string().min(16),
  MIN_WITHDRAWAL: z.string().regex(/^\d+(\.\d{1,2})?$/).default('1.00'),
  MAX_WITHDRAWAL: z.string().regex(/^\d+(\.\d{1,2})?$/).default('100000.00'),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(10),
  PROCESSING_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(300)
});

/**
 * Folds the deployment-friendly aliases onto the canonical variable names.
 *
 * Hosted dashboards, CI secrets and hand-written .env files routinely spell the
 * two operator secrets either way, so both spellings are accepted and resolved
 * once, here, instead of at every use site:
 *
 *   ADMIN_PASSWORD -> ADMIN_API_KEY            (the console sign-in password)
 *   WEBHOOK_SECRET -> PAYMENT_WEBHOOK_SECRET   (the provider HMAC signing key)
 *
 * The canonical name always wins, so an existing .env or a CI secret store that
 * already sets ADMIN_API_KEY keeps behaving exactly as before. Everything still
 * arrives through process.env; nothing is read from a config file directly.
 */
export function normaliseEnvAliases(source: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const merged: NodeJS.ProcessEnv = { ...source };
  if (!merged.ADMIN_API_KEY && merged.ADMIN_PASSWORD) merged.ADMIN_API_KEY = merged.ADMIN_PASSWORD;
  if (!merged.PAYMENT_WEBHOOK_SECRET && merged.WEBHOOK_SECRET) {
    merged.PAYMENT_WEBHOOK_SECRET = merged.WEBHOOK_SECRET;
  }
  return merged;
}

export function parseEnv(source: NodeJS.ProcessEnv = process.env) {
  return envSchema.parse(normaliseEnvAliases(source));
}

export const env = parseEnv();
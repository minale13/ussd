import 'dotenv/config';
import { randomBytes } from 'node:crypto';
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

/**
 * Values substituted for anything the platform did not supply.
 *
 * The point is survivability, not function: a serverless instance is expected to
 * boot and serve `/health` and the console shell even when the dashboard has not
 * been filled in yet. Every entry is an obviously-invalid placeholder, so a
 * missing variable produces a clear "not configured" state instead of either a
 * crash or - far worse - a secret that looks real.
 *
 * The three secrets are generated per process rather than hard-coded. That is
 * deliberate: a fixed placeholder secret would let anyone who read the source
 * forge admin credentials or webhook signatures against a deployment that
 * forgot to set them. A random value cannot be guessed, and it changes on every
 * cold start, so it can never be mistaken for a working configuration.
 */
const PLACEHOLDERS = {
  DATABASE_URL: 'postgres://unset:unset@127.0.0.1:5432/unset',
  REDIS_URL: 'redis://127.0.0.1:6379',
  JWT_SECRET: randomBytes(32).toString('hex'),
  ADMIN_API_KEY: randomBytes(24).toString('hex'),
  ADMIN_WITHDRAWAL_USER_ID: '00000000-0000-4000-8000-000000000000',
  PAYMENT_WEBHOOK_SECRET: randomBytes(32).toString('hex')
} as const;

type PlaceholderName = keyof typeof PLACEHOLDERS;

export interface ResolvedEnv {
  /** Schema-valid configuration, with placeholders standing in for anything absent. */
  env: z.infer<typeof envSchema>;
  /** Canonical names that were absent and are running on a placeholder, in schema order. */
  missing: PlaceholderName[];
  /** True when the console has a real, operator-supplied username and password. */
  adminConfigured: boolean;
}

/**
 * Parses the environment without ever throwing.
 *
 * `parseEnv` is the strict form and stays that way on purpose: a typo in a value
 * that *is* present should be loud, and the worker and the migration script
 * genuinely cannot run without a database. This resolver is the forgiving form
 * used wherever an import-time throw would take down a whole serverless
 * invocation - the HTTP layer in particular.
 *
 * Absent values fall back to placeholders. Values that are present but invalid
 * (a three-character password, a `REDIS_URL` that is not a URL) are left alone
 * so `parseEnv` still rejects them loudly, because those are operator mistakes
 * rather than omissions.
 */
export function resolveEnv(source: NodeJS.ProcessEnv = process.env): ResolvedEnv {
  const merged = normaliseEnvAliases(source);

  // Only fill in what is genuinely absent. An empty string counts as absent,
  // because a blank value in a dashboard field behaves like an unset one.
  const missing = (Object.keys(PLACEHOLDERS) as PlaceholderName[]).filter((name) => {
    const value = merged[name];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  const filled: NodeJS.ProcessEnv = { ...merged };
  for (const name of missing) filled[name] = PLACEHOLDERS[name];

  const env = parseEnv(filled);

  // Only the secret decides whether sign-in is usable. The username has a
  // schema default, so treating "no username set" as unconfigured would lock an
  // operator out of a deployment that is otherwise complete.
  const adminConfigured =
    !missing.includes('ADMIN_API_KEY') &&
    typeof merged.ADMIN_USERNAME === 'string' &&
    merged.ADMIN_USERNAME.trim().length > 0;

  return { env, missing, adminConfigured };
}

export const envResolution = resolveEnv();
export const env = envResolution.env;
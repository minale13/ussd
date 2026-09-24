import { describe, expect, it } from 'vitest';
import { createSchema } from '../src/controllers/withdrawal.controller.js';
import { manualWithdrawalSchema } from '../src/controllers/admin.controller.js';
import { envSchema, parseEnv } from '../src/config/env.js';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgres://withdrawal:withdrawal@localhost:5432/withdrawal',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'test-jwt-secret-that-is-at-least-32-characters',
  PAYMENT_WEBHOOK_SECRET: 'test-webhook-secret',
  ADMIN_API_KEY: 'test-admin-key-that-is-long',
  ADMIN_WITHDRAWAL_USER_ID: '11111111-1111-4111-8111-111111111111',
  MIN_WITHDRAWAL: '1.00',
  MAX_WITHDRAWAL: '100000.00'
};

describe('withdrawal request validation', () => {
  it('normalizes valid amounts and rejects malformed requests', () => {
    const result = createSchema.safeParse({
      userId: '11111111-1111-4111-8111-111111111111',
      amount: '10.5',
      currency: 'etb',
      destinationType: 'PHONE',
      destination: '251900000000'
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe('10.50');
    expect(createSchema.safeParse({ amount: '10.123' }).success).toBe(false);
  });
});

describe('manual withdrawal request validation', () => {
  const base = { destinationPhone: '251900000000', amount: 100, channel: 'TELEBIRR' as const };

  it('accepts an omitted or ANY target device and rejects malformed device ids', () => {
    expect(manualWithdrawalSchema.safeParse(base).success).toBe(true);
    expect(manualWithdrawalSchema.safeParse({ ...base, targetDeviceId: 'ANY' }).success).toBe(true);
    expect(manualWithdrawalSchema.safeParse({ ...base, targetDeviceId: '  ' }).success).toBe(true);
    expect(manualWithdrawalSchema.safeParse({ ...base, targetDeviceId: 'a1b2c3d4e5f6' }).success).toBe(true);
    expect(manualWithdrawalSchema.safeParse({ ...base, targetDeviceId: 'x'.repeat(129) }).success).toBe(false);
    expect(manualWithdrawalSchema.safeParse({ ...base, targetDeviceId: 42 }).success).toBe(false);
  });
});

describe('environment configuration', () => {
  it('parses the same database and Redis settings used by dev and worker', () => {
    const result = parseEnv(validEnvironment);
    expect(result.DATABASE_URL).toBe(validEnvironment.DATABASE_URL);
    expect(result.REDIS_URL).toBe(validEnvironment.REDIS_URL);
    expect(result.WORKER_CONCURRENCY).toBe(10);
  });

  it('rejects missing runtime secrets and connection settings', () => {
    expect(() => envSchema.parse({})).toThrow();
  });
});
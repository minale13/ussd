import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

describe('local startup configuration', () => {
  it('enables explicit local infrastructure fallback only when configured', () => {
    const base = {
      DATABASE_URL: 'postgres://withdrawal:withdrawal@localhost:5432/withdrawal',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'unit-test-jwt-secret-that-is-at-least-32-characters',
      PAYMENT_WEBHOOK_SECRET: 'unit-test-webhook-secret',
      ADMIN_API_KEY: 'unit-test-admin-key-that-is-long',
      ADMIN_WITHDRAWAL_USER_ID: '11111111-1111-4111-8111-111111111111'
    };
    expect(parseEnv({ ...base, NODE_ENV: 'development', LOCAL_INFRA_FALLBACK: 'true' }).LOCAL_INFRA_FALLBACK).toBe(true);
    expect(parseEnv({ ...base, NODE_ENV: 'development', LOCAL_INFRA_FALLBACK: 'false' }).LOCAL_INFRA_FALLBACK).toBe(false);
  });
});
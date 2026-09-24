import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

process.env.DATABASE_URL ??= 'postgres://withdrawal:withdrawal@localhost:5432/withdrawal';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.JWT_SECRET ??= 'test-jwt-secret-that-is-at-least-32-characters';
process.env.PAYMENT_WEBHOOK_SECRET ??= 'test-webhook-secret';

const { verifyWebhookSignature } = await import('../src/webhooks/payment.webhook.js');

describe('payment webhook signatures', () => {
  it('accepts the provider signature and rejects tampering', () => {
    const body = JSON.stringify({ eventId: 'evt-1', status: 'COMPLETED' });
    const digest = createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET!).update(body).digest('hex');
    expect(verifyWebhookSignature(body, digest)).toBe(true);
    expect(verifyWebhookSignature(body, `sha256=${digest}`)).toBe(true);
    expect(verifyWebhookSignature(`${body} `, digest)).toBe(false);
  });
});
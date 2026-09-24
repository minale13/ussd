import { describe, expect, it } from 'vitest';
import { MockPaymentProvider } from '../src/payments/payment-provider.js';

describe('MockPaymentProvider', () => {
  it('returns the same provider transaction for repeated initiation', async () => {
    const provider = new MockPaymentProvider();
    const input = { transactionId: 'WD-1', amount: '10.00', currency: 'ETB', destinationType: 'PHONE', destination: '251900000000' };
    const first = await provider.initiateWithdrawal(input);
    const second = await provider.initiateWithdrawal(input);
    expect(second).toEqual(first);
    expect(await provider.checkWithdrawalStatus(first.providerTransactionId)).toEqual(first);
  });
});
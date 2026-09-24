import { describe, expect, it } from 'vitest';
import { MockPaymentProvider, PermanentProviderError, TemporaryProviderError } from '../src/payments/payment-provider.js';

const input = { transactionId: 'WD-MOCK', amount: '10.00', currency: 'ETB', destinationType: 'PHONE', destination: '251900000000' };

describe('MockPaymentProvider outcomes', () => {
  it('simulates failure', async () => {
    await expect(new MockPaymentProvider('FAILED').initiateWithdrawal(input)).rejects.toBeInstanceOf(PermanentProviderError);
  });

  it('simulates timeout without losing the provider transaction', async () => {
    const provider = new MockPaymentProvider('TIMEOUT');
    await expect(provider.initiateWithdrawal(input)).rejects.toBeInstanceOf(TemporaryProviderError);
    await expect(provider.checkWithdrawalStatus('MOCK-WD-MOCK')).resolves.toEqual({ providerTransactionId: 'MOCK-WD-MOCK', status: 'PENDING' });
  });

  it('simulates an unresolved pending transaction', async () => {
    await expect(new MockPaymentProvider('PENDING').initiateWithdrawal(input)).resolves.toEqual({ providerTransactionId: 'MOCK-WD-MOCK', status: 'PENDING' });
  });
});
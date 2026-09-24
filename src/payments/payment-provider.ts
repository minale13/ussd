export type ProviderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type MockOutcome = 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'PENDING';

export interface InitiateWithdrawalInput {
  transactionId: string;
  amount: string;
  currency: string;
  destinationType: string;
  destination: string;
}

export interface ProviderTransaction {
  providerTransactionId: string;
  status: ProviderStatus;
}

export interface PaymentProvider {
  initiateWithdrawal(input: InitiateWithdrawalInput): Promise<ProviderTransaction>;
  checkWithdrawalStatus(providerTransactionId: string): Promise<ProviderTransaction>;
  getTransaction(providerTransactionId: string): Promise<ProviderTransaction>;
}

export class TemporaryProviderError extends Error {
  constructor(message: string, readonly providerTransactionId?: string) {
    super(message);
  }
}
export class PermanentProviderError extends Error {}

export class MockPaymentProvider implements PaymentProvider {
  private readonly transactions = new Map<string, ProviderTransaction>();

  constructor(private readonly outcome: MockOutcome = 'SUCCESS') {}

  async initiateWithdrawal(input: InitiateWithdrawalInput): Promise<ProviderTransaction> {
    const existing = this.transactions.get(input.transactionId);
    if (existing) return existing;
    if (this.outcome === 'TIMEOUT') {
      this.transactions.set(input.transactionId, { providerTransactionId: `MOCK-${input.transactionId}`, status: 'PENDING' });
      throw new TemporaryProviderError('Mock provider timeout', `MOCK-${input.transactionId}`);
    }
    if (this.outcome === 'FAILED') throw new PermanentProviderError('Mock provider rejected withdrawal');
    const transaction = { providerTransactionId: `MOCK-${input.transactionId}`, status: this.outcome === 'PENDING' ? 'PENDING' as const : 'COMPLETED' as const };
    this.transactions.set(input.transactionId, transaction);
    return transaction;
  }

  async checkWithdrawalStatus(providerTransactionId: string): Promise<ProviderTransaction> {
    return [...this.transactions.values()].find((item) => item.providerTransactionId === providerTransactionId) ?? {
      providerTransactionId,
      status: 'PENDING'
    };
  }

  async getTransaction(providerTransactionId: string): Promise<ProviderTransaction> {
    return this.checkWithdrawalStatus(providerTransactionId);
  }
}
export const withdrawalStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'] as const;
export type WithdrawalStatus = (typeof withdrawalStatuses)[number];

export const allowedTransitions: Record<WithdrawalStatus, readonly WithdrawalStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: []
};

export function canTransition(from: WithdrawalStatus, to: WithdrawalStatus): boolean {
  return allowedTransitions[from].includes(to);
}
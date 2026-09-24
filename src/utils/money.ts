const MONEY_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

export function normalizeMoney(value: string): string {
  const trimmed = value.trim();
  if (!MONEY_PATTERN.test(trimmed)) throw new Error('INVALID_AMOUNT');
  const [whole, fraction = ''] = trimmed.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

export function moneyToCents(value: string): bigint {
  const normalized = normalizeMoney(value);
  const [whole, fraction] = normalized.split('.');
  if (whole === undefined || fraction === undefined) throw new Error('INVALID_AMOUNT');
  return BigInt(whole) * 100n + BigInt(fraction);
}
import { describe, expect, it } from 'vitest';
import { moneyToCents, normalizeMoney } from '../src/utils/money.js';

describe('money validation', () => {
  it('normalizes decimal input without floating-point arithmetic', () => {
    expect(normalizeMoney('10')).toBe('10.00');
    expect(normalizeMoney('10.5')).toBe('10.50');
    expect(moneyToCents('0.29')).toBe(29n);
    expect(moneyToCents('100000.00')).toBe(10000000n);
  });

  it('rejects invalid decimal formats', () => {
    expect(() => normalizeMoney('1.234')).toThrow('INVALID_AMOUNT');
    expect(() => normalizeMoney('-1.00')).toThrow('INVALID_AMOUNT');
    expect(() => normalizeMoney('1e3')).toThrow('INVALID_AMOUNT');
  });
});
import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/types/withdrawal.js';

describe('withdrawal state machine', () => {
  it('allows the normal lifecycle', () => {
    expect(canTransition('PENDING', 'PROCESSING')).toBe(true);
    expect(canTransition('PROCESSING', 'COMPLETED')).toBe(true);
  });

  it('rejects terminal-state changes and skipping processing', () => {
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
    expect(canTransition('COMPLETED', 'FAILED')).toBe(false);
    expect(canTransition('CANCELLED', 'PROCESSING')).toBe(false);
  });
});
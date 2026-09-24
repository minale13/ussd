import { describe, expect, it } from 'vitest';
import { normalizeTargetDeviceId } from '../src/utils/target-device.js';

describe('target device normalization', () => {
  it('treats ANY, blank and missing values as an unassigned withdrawal', () => {
    expect(normalizeTargetDeviceId('ANY')).toBeNull();
    expect(normalizeTargetDeviceId('any')).toBeNull();
    expect(normalizeTargetDeviceId('  Any  ')).toBeNull();
    expect(normalizeTargetDeviceId('')).toBeNull();
    expect(normalizeTargetDeviceId('   ')).toBeNull();
    expect(normalizeTargetDeviceId(undefined)).toBeNull();
    expect(normalizeTargetDeviceId(null)).toBeNull();
    expect(normalizeTargetDeviceId(42)).toBeNull();
  });

  it('keeps a concrete device id and trims surrounding whitespace', () => {
    expect(normalizeTargetDeviceId('  a1b2c3d4e5f6  ')).toBe('a1b2c3d4e5f6');
    expect(normalizeTargetDeviceId('ANYDEVICE-01')).toBe('ANYDEVICE-01');
  });
});

import { describe, expect, it } from 'vitest';
import {
  BANKS,
  BANK_DEFINITIONS,
  bankLabel,
  isBankCode,
  normalizeBank,
  normalizeBankList,
  sanitizeEnabledBanks,
  ussdPrefixFor
} from '../src/utils/banks.js';
import { resolveEnabledBanks, resolveWithdrawalBank } from '../src/services/withdrawal.service.js';

/**
 * The multi-bank registry and the two resolvers the claim path relies on.
 *
 * These pin the contracts the Android client and the per-device toggles depend
 * on: the legacy `CBE` channel folds to CBEBIRR everywhere, an unknown value
 * never throws, and a device's enabled set is authoritative once it is set.
 */
describe('bank registry', () => {
  it('exposes the five supported banks with labels', () => {
    expect(BANKS).toEqual(['TELEBIRR', 'CBEBIRR', 'AWASH', 'DASHEN', 'ABYSSINIA']);
    expect(BANKS.every((code) => BANK_DEFINITIONS[code].label.length > 0)).toBe(true);
    expect(bankLabel('CBEBIRR')).toBe('CBE Birr');
    expect(bankLabel('ABYSSINIA')).toBe('Bank of Abyssinia');
    // An unknown code falls back to the code itself rather than crashing.
    expect(bankLabel('WESTERNUNION')).toBe('WESTERNUNION');
  });

  it('knows a USSD prefix only for the banks the handset can dial', () => {
    expect(ussdPrefixFor('TELEBIRR')).toBe('*806#');
    expect(ussdPrefixFor('CBEBIRR')).toBe('*889#');
    // No known payout flow yet, so the client must skip rather than mis-dial.
    expect(ussdPrefixFor('AWASH')).toBeNull();
    expect(ussdPrefixFor('DASHEN')).toBeNull();
    expect(ussdPrefixFor('ABYSSINIA')).toBeNull();
  });

  it('recognises only canonical codes', () => {
    expect(isBankCode('TELEBIRR')).toBe(true);
    expect(isBankCode('CBEBIRR')).toBe(true);
    // The legacy channel label is an alias, not a canonical code.
    expect(isBankCode('CBE')).toBe(false);
    expect(isBankCode('telebirr')).toBe(false);
    expect(isBankCode('')).toBe(false);
    expect(isBankCode(42)).toBe(false);
  });
});

describe('normalizeBank', () => {
  it('folds the legacy CBE channel onto CBEBIRR', () => {
    expect(normalizeBank('CBE')).toBe('CBEBIRR');
    expect(normalizeBank('cbe')).toBe('CBEBIRR');
    expect(normalizeBank('TELEBIRR')).toBe('TELEBIRR');
    expect(normalizeBank('  awash ')).toBe('AWASH');
  });

  it('falls back to Telebirr for unknown, blank or non-string input', () => {
    expect(normalizeBank('WESTERNUNION')).toBe('TELEBIRR');
    expect(normalizeBank('')).toBe('TELEBIRR');
    expect(normalizeBank(null)).toBe('TELEBIRR');
    expect(normalizeBank(undefined)).toBe('TELEBIRR');
    expect(normalizeBank(7)).toBe('TELEBIRR');
  });
});

describe('normalizeBankList', () => {
  it('accepts a JSON string, an array, and de-duplicates', () => {
    expect(normalizeBankList('["TELEBIRR","CBEBIRR"]')).toEqual(['TELEBIRR', 'CBEBIRR']);
    expect(normalizeBankList(['TELEBIRR', 'TELEBIRR', 'CBE'])).toEqual(['TELEBIRR', 'CBEBIRR']);
  });

  it('returns an empty list for null, junk or all-unknown input', () => {
    // Empty is meaningful: "no bank enabled", never a silent fall back to all.
    expect(normalizeBankList(null)).toEqual([]);
    expect(normalizeBankList('not json')).toEqual([]);
    expect(normalizeBankList(['WESTERNUNION', ''])).toEqual([]);
    expect(normalizeBankList(42)).toEqual([]);
  });
});

describe('sanitizeEnabledBanks', () => {
  it('keeps only known banks in canonical order', () => {
    expect(sanitizeEnabledBanks(['ABYSSINIA', 'CBE', 'TELEBIRR'])).toEqual(['TELEBIRR', 'CBEBIRR', 'ABYSSINIA']);
  });

  it('drops unknown entries and collapses duplicates', () => {
    expect(sanitizeEnabledBanks(['TELEBIRR', 'TELEBIRR', 'NOPE'])).toEqual(['TELEBIRR']);
  });
});

describe('resolveEnabledBanks', () => {
  it('is limited to exactly the stored set once configured', () => {
    expect(resolveEnabledBanks({ enabled_banks: ['CBEBIRR', 'AWASH'] })).toEqual(['CBEBIRR', 'AWASH']);
    // A JSON string (as the pg client may hand back JSONB) is parsed too.
    expect(resolveEnabledBanks({ enabled_banks: '["TELEBIRR"]' })).toEqual(['TELEBIRR']);
  });

  it('falls back to the single legacy channel for an un-migrated device', () => {
    expect(resolveEnabledBanks({ enabled_banks: null, channel: 'CBE' })).toEqual(['CBEBIRR']);
    expect(resolveEnabledBanks({ enabled_banks: [], channel: 'TELEBIRR' })).toEqual(['TELEBIRR']);
  });

  it('returns an empty set when nothing is configured', () => {
    // The claim path treats empty as "any bank", so a brand-new handset is never
    // stranded ignoring every payout.
    expect(resolveEnabledBanks({})).toEqual([]);
    expect(resolveEnabledBanks({ enabled_banks: null, channel: null })).toEqual([]);
  });
});

describe('resolveWithdrawalBank', () => {
  it('prefers the canonical bank, then the legacy channel, then Telebirr', () => {
    expect(resolveWithdrawalBank({ bank: 'AWASH', channel: 'CBE' })).toBe('AWASH');
    expect(resolveWithdrawalBank({ bank: null, channel: 'CBE' })).toBe('CBEBIRR');
    expect(resolveWithdrawalBank({})).toBe('TELEBIRR');
  });
});

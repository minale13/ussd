/**
 * The single source of truth for the banks the gateway can route a payout to.
 *
 * A "bank" is a real Ethiopian financial institution (Telebirr, CBEBirr, Awash,
 * Dashen, Bank of Abyssinia) and is distinct from the legacy `channel` label that
 * predates multi-bank support. The first two banks keep their historical codes
 * so every existing row, webhook and client keeps working unchanged; the legacy
 * `CBE` label is treated as an alias of `CBEBIRR` because CBEBirr *is* Commercial
 * Bank of Ethiopia's mobile wallet.
 *
 * Every code is short, uppercase and stable: it is persisted in the database and
 * on the wire, so a code must never be renamed - only aliased.
 */
export const BANKS = ['TELEBIRR', 'CBEBIRR', 'AWASH', 'DASHEN', 'ABYSSINIA'] as const;

export type BankCode = (typeof BANKS)[number];

interface BankDefinition {
  /** Human label for the admin console. */
  label: string;
  /** USSD menu prefix the Android client dials, or null for a bank with no known USSD payout flow. */
  ussdPrefix: string | null;
  /** Legacy channel codes this bank supersedes, so older rows resolve to it. */
  aliases?: readonly string[];
}

export const BANK_DEFINITIONS: Record<BankCode, BankDefinition> = {
  TELEBIRR: { label: 'Telebirr', ussdPrefix: '*806#' },
  CBEBIRR: { label: 'CBE Birr', ussdPrefix: '*889#', aliases: ['CBE'] },
  AWASH: { label: 'Awash Bank', ussdPrefix: null },
  DASHEN: { label: 'Dashen Bank', ussdPrefix: null },
  ABYSSINIA: { label: 'Bank of Abyssinia', ussdPrefix: null }
};

/** Default bank applied when a device has not been configured with a preference. */
export const DEFAULT_BANK: BankCode = 'TELEBIRR';

/** Banks whose USSD payout flow the Android client can dial today. */
export const EXECUTABLE_BANKS = BANKS.filter((bank) => BANK_DEFINITIONS[bank].ussdPrefix !== null);

const BANK_SET = new Set<string>(BANKS);

/** True for a canonical bank code. */
export function isBankCode(value: unknown): value is BankCode {
  return typeof value === 'string' && BANK_SET.has(value);
}

/**
 * Resolves any stored or submitted value to its canonical bank code.
 *
 * Aliases (the legacy `CBE` channel label) map to their bank, so an old row reads
 * back as `CBEBIRR`. Unknown, empty or non-string input resolves to
 * [DEFAULT_BANK] rather than throwing: a bad value must never abort a claim or
 * break the console.
 */
export function normalizeBank(value: unknown): BankCode {
  if (typeof value !== 'string') return DEFAULT_BANK;
  const code = value.trim().toUpperCase();
  if (isBankCode(code)) return code;
  for (const bank of BANKS) {
    if (BANK_DEFINITIONS[bank].aliases?.includes(code)) return bank;
  }
  return DEFAULT_BANK;
}

/**
 * Coerces an arbitrary value (a JSON column, a header, a request body) into a
 * clean, de-duplicated list of bank codes.
 *
 * `enabled_banks` is stored as JSONB and may legitimately be null, an array or a
 * JSON string depending on the pg client, so this accepts all three. Each entry
 * is resolved through [normalizeBank], so a legacy alias (`CBE`) folds onto its
 * canonical bank (`CBEBIRR`) and the list round-trips correctly. A value that is
 * neither a known code nor a known alias is dropped: empty or all-unrecognised
 * input returns an empty list, which callers interpret as "no bank enabled" -
 * never as a silent fall back to every bank.
 */
export function normalizeBankList(value: unknown): BankCode[] {
  let list = value;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(list)) return [];
  const seen = new Set<BankCode>();
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const code = item.trim().toUpperCase();
    // A canonical code is kept verbatim; a known alias is folded onto its bank;
    // anything else is dropped rather than defaulted, so an unknown entry can
    // never silently widen a device's access to a bank the operator never set.
    if (isBankCode(code)) seen.add(code);
    else if (BANKS.some((bank) => BANK_DEFINITIONS[bank].aliases?.includes(code))) {
      seen.add(normalizeBank(code));
    }
  }
  return [...seen];
}

/**
 * Normalises an incoming bank-toggle payload from the admin console.
 *
 * A client may post a `banks` array of codes; anything unrecognised is dropped
 * and duplicates collapse. The result is returned in the canonical [BANKS] order
 * so the stored JSON is stable regardless of the order the toggles were clicked.
 */
export function sanitizeEnabledBanks(value: unknown): BankCode[] {
  const allowed = new Set(normalizeBankList(value));
  return BANKS.filter((bank) => allowed.has(bank));
}

/** The USSD prefix a device dials for a bank, or null when the bank has no USSD flow. */
export function ussdPrefixFor(bank: unknown): string | null {
  return BANK_DEFINITIONS[normalizeBank(bank)].ussdPrefix;
}

/** Display label for a bank code, falling back to the code itself if unknown. */
export function bankLabel(bank: unknown): string {
  return isBankCode(bank) ? BANK_DEFINITIONS[bank].label : String(bank);
}

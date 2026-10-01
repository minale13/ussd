/**
 * Parser for Ethiopian bank / mobile-money transaction SMS.
 *
 * DESIGN NOTE - please read before tuning.
 *
 * These messages are not a stable API: each provider rewords them, inserts
 * local-language variants and changes punctuation between campaigns. Rather
 * than one giant regex per provider (which silently stops matching the day a
 * bank edits a word), this parser works in two layers:
 *
 *   1. Provider detection - which institution sent it (Telebirr / CBE / ...).
 *   2. Field extraction - a shared set of *labelled* patterns that look for the
 *      concepts every one of these messages contains ("balance", "transaction
 *      id", "amount", credit/debit wording) regardless of who sent it.
 *
 * The consequence is deliberate: a message from a provider we have never seen
 * can still yield a balance and an amount, because layer 2 is provider-agnostic.
 * Everything is pure and unit tested - see tests/sms-parser.test.ts, which is
 * where a newly captured real message should be added as a fixture.
 */

export type SmsDirection = 'CREDIT' | 'DEBIT' | 'UNKNOWN';
export type SmsChannel = 'TELEBIRR' | 'CBE';

export type ParsedSms = {
  /** Which institution the message came from, or null when unrecognised. */
  provider: string | null;
  channel: SmsChannel | null;
  direction: SmsDirection;
  /** Decimal string, or null when the message did not carry one. */
  amount: string | null;
  reference: string | null;
  counterparty: string | null;
  /** Remaining account balance the bank reported, or null. */
  balance: string | null;
};

type ProviderSpec = {
  name: string;
  channel: SmsChannel;
  /** Matched against the sender and the body. */
  test: RegExp;
};

/**
 * Provider detection, ordered most specific first: a CBE message can mention
 * Telebirr in its body, so the more distinctive names come first.
 */
const PROVIDERS: ProviderSpec[] = [
  { name: 'TELEBIRR', channel: 'TELEBIRR', test: /\btelebirr\b|\bTEB\b|\bTBIR\b/i },
  { name: 'CBE', channel: 'CBE', test: /\bCBE\b|commercial bank of ethiopia|\bCBE ?Birr\b/i },
  { name: 'AWASH_BANK', channel: 'TELEBIRR', test: /\bawash\b/i },
  { name: 'DASHEN_BANK', channel: 'TELEBIRR', test: /\bdashen\b/i },
  { name: 'BOA', channel: 'CBE', test: /\bbank of abyssinia\b|\bBOA\b/i },
  { name: 'NBE_INTERBANK', channel: 'CBE', test: /\binterbank\b/i }
];

/** "1,250.00" / "1250" / "1250.5" -> "1250.00". Rejects anything non-numeric. */
function toAmount(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned).toFixed(2);
}

/**
 * A printed money figure: grouped ("1,250.00"), plain ("2000") or decimal
 * ("500.50").
 *
 * The grouped branch requires at least one thousands group (`+`, not `*`).
 * That ordering matters: with `*` the grouped alternative happily matches the
 * first three digits of "2000" and the figure is silently truncated to "200".
 * The separator is a comma or a non-breaking space because those are what the
 * banks actually print - allowing a plain space would let "Amount 5 2000 Birr"
 * group across a word boundary.
 */
const MONEY = String.raw`\d{1,3}(?:[,\u00A0]\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?`;

/**
 * Remaining balance. Ordered from most explicit label to loosest, because
 * providers disagree on which word they use and on where they put the currency
 * ("Balance: 500 ETB" and "Balance ETB 500" are both seen in the wild).
 */
const CURRENCY = String.raw`(?:birr|etb|br)`;
/** Optional currency token sitting between the label and the figure. */
const CURRENCY_PREFIX = String.raw`(?:${CURRENCY}\s*)?`;
const BALANCE_PATTERNS: RegExp[] = [
  new RegExp(String.raw`(?:remaining|available|current|account)\s+balance\s*(?:is|of|:)?\s*${CURRENCY_PREFIX}(${MONEY})`, 'i'),
  new RegExp(String.raw`(?:remaining|available|current)\s*bal(?:ance)?\.?\s*(?:is|of|:)?\s*${CURRENCY_PREFIX}(${MONEY})`, 'i'),
  new RegExp(String.raw`avail\s*bal(?:ance)?\.?\s*(?:is|of|:)?\s*${CURRENCY_PREFIX}(${MONEY})`, 'i'),
  new RegExp(String.raw`balance\s*(?:is|of|:)?\s*${CURRENCY_PREFIX}(${MONEY})`, 'i'),
  new RegExp(String.raw`(${MONEY})\s*${CURRENCY}\s*(?:remaining|available|left)`, 'i')
];

/**
 * Transaction id / reference / trace number.
 *
 * The captured token must contain a digit. Without that, prose leaks in: in
 * "Transaction Reference CBE123456789" a naive pattern happily returns the
 * word "Reference" as the reference.
 */
const REFERENCE_PATTERNS: RegExp[] = [
  new RegExp(String.raw`(?:transaction|trans|txn|ref(?:erence)?|trace|receipt)\s*(?:id|no\.?|number|#)?\s*[:#-]?\s*([A-Z0-9-]*\d[A-Z0-9-]{4,30})`, 'i'),
  new RegExp(String.raw`(?:^|\s)((?:FT|RTX|TRX|ETR)[A-Z0-9]{4,28})\b`, 'i')
];

/** Explicitly labelled amount, so a balance is never mistaken for the amount. */
const AMOUNT_PATTERNS: RegExp[] = [
  new RegExp(String.raw`amount\s*(?:of|is|:)?\s*(${MONEY})`, 'i'),
  new RegExp(String.raw`(?:etb|br|birr)\s*(${MONEY})\b`, 'i'),
  new RegExp(String.raw`(${MONEY})\s*(?:etb|birr|br)\b`, 'i')
];

const CREDIT_WORDS = /\b(received|credited|credit|deposit|deposited|refund|refunded)\b/i;
const DEBIT_WORDS = /\b(debited|withdrawn|withdrawal|sent|paid|payment to|transferred to|airtime|purchased)\b/i;

/** "from 0911…" / "to 0911…" / "from Some Name" -> the counterparty as printed. */
const COUNTERPARTY_PATTERNS: RegExp[] = [
  new RegExp(String.raw`(?:from|by)\s+((?:\+?251|0)[\d\s-]{8,15})`, 'i'),
  new RegExp(String.raw`(?:to|for)\s+((?:\+?251|0)[\d\s-]{8,15})`, 'i'),
  new RegExp(String.raw`(?:from|to)\s+([A-Z][A-Z\s.'-]{3,30})\s*(?:account|a/c|no\.?|\d{4,})`, 'i')
];

function firstMatch(patterns: RegExp[], text: string): RegExpMatchArray | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match;
  }
  return null;
}
/**
 * Classifies credit vs debit.
 *
 * Credit wins only when it is stated and no debit wording is present, because
 * these messages often contain both: "you have received 500 Birr from X for
 * payment of your bill" reads as an inbound transfer even though the phrase
 * "payment" appears.
 */
export function detectDirection(text: string): SmsDirection {
  const credit = CREDIT_WORDS.test(text);
  const debit = DEBIT_WORDS.test(text);
  if (credit && !debit) return 'CREDIT';
  if (debit && !credit) return 'DEBIT';
  if (credit && debit) return /\bfrom\b/i.test(text) ? 'CREDIT' : 'DEBIT';
  return 'UNKNOWN';
}

function detectProvider(text: string): ProviderSpec | null {
  return PROVIDERS.find((provider) => provider.test.test(text)) ?? null;
}

/**
 * Parses one inbound SMS body.
 *
 * Never throws. An unrecognised message still returns a record with every
 * field null and direction UNKNOWN, so the caller can store it for review
 * rather than silently dropping the message.
 */
export function parseSms(raw: string, hint?: { channel?: string }): ParsedSms {
  // Bank messages arrive hard-wrapped with doubled spaces; one normalisation
  // pass means every pattern above sees the same tidy text.
  const text = String(raw ?? '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  const provider = detectProvider(text);
  const balance = toAmount(firstMatch(BALANCE_PATTERNS, text)?.[1]);
  const direction = detectDirection(text);
  let amount = toAmount(firstMatch(AMOUNT_PATTERNS, text)?.[1]);

  // Fall back to the first money token that is not the one already claimed as
  // the balance, so a bare "500 Birr received" still yields an amount.
  //
  // This only runs when the message actually describes a movement. Without that
  // guard an OTP ("your code is 4821") or an order number would be recorded as
  // a transaction amount, which is worse than recording nothing.
  if (amount === null && direction !== 'UNKNOWN') {
    const loose = text.match(new RegExp(String.raw`\b(${MONEY})\b`, 'g'));
    const candidate = loose?.find((token) => toAmount(token) !== balance);
    amount = candidate ? toAmount(candidate) : null;
  }

  const reference = firstMatch(REFERENCE_PATTERNS, text)?.[1]?.trim() ?? null;
  const counterparty = firstMatch(COUNTERPARTY_PATTERNS, text)?.[1]?.trim() ?? null;
  const hinted = hint?.channel === 'CBE' || hint?.channel === 'TELEBIRR' ? hint.channel : null;

  return {
    provider: provider?.name ?? hinted,
    channel: provider?.channel ?? hinted,
    direction,
    amount,
    reference,
    counterparty,
    balance
  };
}
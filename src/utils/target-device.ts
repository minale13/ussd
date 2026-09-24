/** Sentinel accepted from the admin API and the console for "let any active device claim it". */
export const ANY_TARGET_DEVICE = 'ANY';

/**
 * Normalizes a target device request into the value persisted on withdrawals.
 * "ANY", an empty string, whitespace and non-string input all mean "any available device"
 * and are stored as NULL so the claim query stays a simple null check.
 */
export function normalizeTargetDeviceId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === ANY_TARGET_DEVICE) return null;
  return trimmed;
}

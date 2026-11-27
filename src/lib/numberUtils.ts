/**
 * Shared numeric & formula sanitization utilities to prevent NaN, Infinity,
 * division-by-zero, negative leakage, and IEEE-754 rounding glitches.
 */

export function toFiniteNumber(val: unknown, fallback = 0): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : fallback;
  }
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(',', '.');
    if (cleaned === '') return fallback;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function toNonNegativeNumber(val: unknown, fallback = 0): number {
  const num = toFiniteNumber(val, fallback);
  return num >= 0 ? num : Math.max(0, fallback);
}

export function clampNumber(val: unknown, min: number, max: number, fallback = min): number {
  const num = toFiniteNumber(val, fallback);
  return Math.max(min, Math.min(max, num));
}

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  const num = toFiniteNumber(numerator, 0);
  const den = toFiniteNumber(denominator, 0);
  if (!Number.isFinite(den) || den === 0) return fallback;
  const result = num / den;
  return Number.isFinite(result) ? result : fallback;
}

export function safePercent(part: number, total: number, fallback = 0): number {
  return safeDivide(toFiniteNumber(part, 0) * 100, total, fallback);
}

/**
 * Prevents floating-point noise like 1.0000000000000002 from rounding up to 2.
 */
export function ceilWithEpsilon(val: number): number {
  const safe = toNonNegativeNumber(val, 0);
  if (safe <= 1e-9) return 0;
  return Math.ceil(safe - 1e-9);
}

export function roundToDecimals(val: number, decimals = 2): number {
  const safe = toFiniteNumber(val, 0);
  const factor = 10 ** Math.max(0, decimals);
  return Math.round((safe + Number.EPSILON) * factor) / factor;
}

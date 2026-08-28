import type { Money } from './money.js';

export type TextDirection = 'rtl' | 'ltr';

export function assertSupportedLocale<T extends string>(value: string, enabled: readonly T[]): T {
  if (!(enabled as readonly string[]).includes(value)) {
    throw new RangeError(`Unsupported locale: ${value}`);
  }
  return value as T;
}

export function directionForLocale(locale: string, rtlLocales: readonly string[]): TextDirection {
  return rtlLocales.includes(locale) ? 'rtl' : 'ltr';
}

/** Unicode First-Strong-Isolate/PDI wrapper for dynamic mixed-direction text fragments. */
export function bidiIsolate(value: string): string {
  return `\u2068${value}\u2069`;
}

export function formatNumber(locale: string, value: number, options?: Intl.NumberFormatOptions): string {
  if (!Number.isFinite(value)) throw new TypeError('Number formatting requires a finite number.');
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatMoney(locale: string, value: Money): string {
  // Convert only for presentation after exact business representation is already established.
  const numeric = Number(value.amount);
  if (!Number.isFinite(numeric)) throw new RangeError('Money amount cannot be represented for display.');
  return new Intl.NumberFormat(locale, { style: 'currency', currency: value.currency }).format(numeric);
}

export function formatDateTime(
  locale: string,
  value: Date,
  options: Intl.DateTimeFormatOptions = {},
): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError('Date formatting requires a valid Date.');
  return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(value);
}

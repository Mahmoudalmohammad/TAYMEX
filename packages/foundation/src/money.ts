import { ApplicationError } from './errors.js';
import { formatDecimal, parseDecimal, rescaleCoefficient } from './decimal.js';

export type CurrencyCode = string & { readonly __currencyCode: unique symbol };
export type Money = Readonly<{ amount: string; currency: CurrencyCode }>;
export type MoneyRoundingMode = 'HALF_UP' | 'HALF_EVEN' | 'DOWN' | 'UP';

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export class MoneyError extends ApplicationError {
  constructor(code: string, message: string, category: 'validation' | 'conflict' = 'validation') {
    super({ code, category, message, safeMessageKey: category === 'conflict' ? 'errors.money.conflict' : 'errors.money.validation' });
    this.name = 'MoneyError';
  }
}

export function currencyCode(raw: string): CurrencyCode {
  const normalized = raw.trim().toUpperCase();
  if (!CURRENCY_PATTERN.test(normalized)) {
    throw new MoneyError('MONEY_INVALID_CURRENCY', 'Currency must be a three-letter uppercase code.');
  }
  return normalized as CurrencyCode;
}

export function money(
  rawAmount: string,
  rawCurrency: string,
  options: Readonly<{ maxScale?: number; allowNegative?: boolean }> = {},
): Money {
  let parts;
  try {
    parts = parseDecimal(rawAmount, { maxScale: options.maxScale ?? 18, allowNegative: options.allowNegative ?? true });
  } catch (cause) {
    throw new MoneyError('MONEY_INVALID_AMOUNT', cause instanceof Error ? cause.message : 'Invalid money amount.');
  }
  return Object.freeze({ amount: parts.normalized, currency: currencyCode(rawCurrency) });
}

function requireSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new MoneyError('MONEY_CURRENCY_MISMATCH', `Cannot combine ${left.currency} and ${right.currency}.`, 'conflict');
  }
}

export function addMoney(left: Money, right: Money): Money {
  requireSameCurrency(left, right);
  const a = parseDecimal(left.amount);
  const b = parseDecimal(right.amount);
  const scale = Math.max(a.scale, b.scale);
  const sum = rescaleCoefficient(a, scale) + rescaleCoefficient(b, scale);
  return Object.freeze({ amount: formatDecimal(sum, scale), currency: left.currency });
}

export function compareMoney(left: Money, right: Money): -1 | 0 | 1 {
  requireSameCurrency(left, right);
  const a = parseDecimal(left.amount);
  const b = parseDecimal(right.amount);
  const scale = Math.max(a.scale, b.scale);
  const av = rescaleCoefficient(a, scale);
  const bv = rescaleCoefficient(b, scale);
  return av < bv ? -1 : av > bv ? 1 : 0;
}

export function roundMoney(value: Money, targetScale: number, mode: MoneyRoundingMode): Money {
  if (!Number.isSafeInteger(targetScale) || targetScale < 0 || targetScale > 18) {
    throw new TypeError('targetScale must be an integer from 0 to 18.');
  }
  const parts = parseDecimal(value.amount);
  if (parts.scale <= targetScale) {
    const coefficient = rescaleCoefficient(parts, targetScale);
    return Object.freeze({ amount: formatDecimal(coefficient, targetScale), currency: value.currency });
  }

  const divisor = 10n ** BigInt(parts.scale - targetScale);
  const negative = parts.coefficient < 0n;
  const abs = negative ? -parts.coefficient : parts.coefficient;
  let quotient = abs / divisor;
  const remainder = abs % divisor;
  let increment = false;
  if (remainder !== 0n) {
    if (mode === 'UP') increment = true;
    if (mode === 'HALF_UP') increment = remainder * 2n >= divisor;
    if (mode === 'HALF_EVEN') {
      const twice = remainder * 2n;
      increment = twice > divisor || (twice === divisor && quotient % 2n === 1n);
    }
  }
  if (increment) quotient += 1n;
  const signed = negative ? -quotient : quotient;
  return Object.freeze({ amount: formatDecimal(signed, targetScale), currency: value.currency });
}

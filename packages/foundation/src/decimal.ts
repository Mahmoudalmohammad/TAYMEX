export type DecimalParts = Readonly<{
  coefficient: bigint;
  scale: number;
  normalized: string;
}>;

const DECIMAL_PATTERN = /^-?\d+(?:\.\d+)?$/;

export function parseDecimal(
  raw: string,
  options: Readonly<{ maxScale?: number; allowNegative?: boolean }> = {},
): DecimalParts {
  if (typeof raw !== 'string') throw new TypeError('Decimal value must be a string.');
  const value = raw.trim();
  if (!DECIMAL_PATTERN.test(value)) throw new TypeError(`Invalid decimal value: ${raw}`);
  const negative = value.startsWith('-');
  if (negative && options.allowNegative === false) throw new RangeError('Negative decimal values are not allowed.');
  const unsigned = negative ? value.slice(1) : value;
  const [wholeRaw = '0', fraction = ''] = unsigned.split('.');
  const maxScale = options.maxScale ?? 18;
  if (!Number.isSafeInteger(maxScale) || maxScale < 0 || maxScale > 30) throw new TypeError('maxScale must be an integer from 0 to 30.');
  if (fraction.length > maxScale) throw new RangeError(`Decimal scale ${fraction.length} exceeds maximum ${maxScale}.`);
  const whole = wholeRaw.replace(/^0+(?=\d)/, '') || '0';
  const digits = (whole + fraction).replace(/^0+(?=\d)/, '') || '0';
  let coefficient = BigInt(digits);
  if (negative && coefficient !== 0n) coefficient = -coefficient;
  const normalized = `${coefficient < 0n ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`.replace(/^-0(?=\.?0*$)/, '0');
  return Object.freeze({ coefficient, scale: fraction.length, normalized });
}

export function formatDecimal(coefficient: bigint, scale: number): string {
  if (!Number.isSafeInteger(scale) || scale < 0 || scale > 30) throw new TypeError('scale must be an integer from 0 to 30.');
  const negative = coefficient < 0n;
  const abs = negative ? -coefficient : coefficient;
  const raw = abs.toString().padStart(scale + 1, '0');
  const whole = scale === 0 ? raw : raw.slice(0, -scale);
  const fraction = scale === 0 ? '' : raw.slice(-scale);
  const sign = negative && abs !== 0n ? '-' : '';
  return `${sign}${whole}${fraction ? `.${fraction}` : ''}`;
}

export function rescaleCoefficient(parts: DecimalParts, targetScale: number): bigint {
  if (targetScale < parts.scale) throw new RangeError('Target scale would discard precision.');
  return parts.coefficient * (10n ** BigInt(targetScale - parts.scale));
}

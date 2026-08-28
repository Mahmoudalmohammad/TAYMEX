import { ApplicationError } from './errors.js';
import { formatDecimal, parseDecimal } from './decimal.js';

export const UNIT_DEFINITIONS = {
  W: { dimension: 'power', decimalExponent: 0 },
  kW: { dimension: 'power', decimalExponent: 3 },
  Wh: { dimension: 'energy', decimalExponent: 0 },
  kWh: { dimension: 'energy', decimalExponent: 3 },
  V: { dimension: 'voltage', decimalExponent: 0 },
  A: { dimension: 'current', decimalExponent: 0 },
  Ah: { dimension: 'charge', decimalExponent: 0 },
  VA: { dimension: 'apparent-power', decimalExponent: 0 },
  kVA: { dimension: 'apparent-power', decimalExponent: 3 },
  percent: { dimension: 'ratio-percent', decimalExponent: 0 },
} as const;

export type UnitCode = keyof typeof UNIT_DEFINITIONS;
export type Quantity = Readonly<{ value: string; unit: UnitCode }>;

export class QuantityError extends ApplicationError {
  constructor(code: string, message: string) {
    super({ code, category: 'validation', message, safeMessageKey: 'errors.quantity.validation' });
    this.name = 'QuantityError';
  }
}

export function quantity(
  rawValue: string,
  unit: UnitCode,
  options: Readonly<{ maxScale?: number; allowNegative?: boolean }> = {},
): Quantity {
  if (!(unit in UNIT_DEFINITIONS)) throw new QuantityError('QUANTITY_INVALID_UNIT', `Unknown unit: ${String(unit)}.`);
  let parsed;
  try {
    parsed = parseDecimal(rawValue, { maxScale: options.maxScale ?? 12, allowNegative: options.allowNegative ?? true });
  } catch (cause) {
    throw new QuantityError('QUANTITY_INVALID_VALUE', cause instanceof Error ? cause.message : 'Invalid quantity value.');
  }
  return Object.freeze({ value: parsed.normalized, unit });
}

/** Exact decimal conversion for the canonical power/energy/apparent-power scale units. */
export function convertQuantity(value: Quantity, target: UnitCode): Quantity {
  const sourceDef = UNIT_DEFINITIONS[value.unit];
  const targetDef = UNIT_DEFINITIONS[target];
  if (!targetDef) throw new QuantityError('QUANTITY_INVALID_UNIT', `Unknown target unit: ${String(target)}.`);
  if (sourceDef.dimension !== targetDef.dimension) {
    throw new QuantityError('QUANTITY_INCOMPATIBLE_UNITS', `Cannot convert ${value.unit} to ${target}.`);
  }
  if (value.unit === target) return value;

  const parts = parseDecimal(value.value, { maxScale: 18 });
  const exponentDelta = sourceDef.decimalExponent - targetDef.decimalExponent;
  let coefficient = parts.coefficient;
  let scale = parts.scale;
  if (exponentDelta > 0) {
    coefficient *= 10n ** BigInt(exponentDelta);
  } else if (exponentDelta < 0) {
    scale += -exponentDelta;
  }
  let formatted = formatDecimal(coefficient, scale);
  if (formatted.includes('.')) formatted = formatted.replace(/0+$/, '').replace(/\.$/, '');
  return Object.freeze({ value: formatted, unit: target });
}

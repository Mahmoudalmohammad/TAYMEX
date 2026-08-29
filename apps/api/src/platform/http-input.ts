import { ValidationError, requireNonBlank, requireOneOf, requirePositiveSafeInteger, requireUuid } from '@taymex/foundation';

export function requireObjectBody(value: unknown, allowedKeys: readonly string[], requiredKeys: readonly string[]): Record<string, unknown> {
  if (!isPlainObject(value)) throw invalid('$body', 'OBJECT', 'errors.validation.object');
  const keys = Object.keys(value);
  const unknown = keys.find((key) => !allowedKeys.includes(key));
  if (unknown) throw invalid(unknown, 'UNKNOWN_FIELD', 'errors.validation.unknownField');
  const missing = requiredKeys.find((key) => !Object.prototype.hasOwnProperty.call(value, key));
  if (missing) throw invalid(missing, 'REQUIRED', 'errors.validation.required');
  return value;
}

export function optionalString(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  return requireNonBlank(value as string, field, maxLength);
}

export function requiredString(value: unknown, field: string, maxLength: number): string {
  return requireNonBlank(value as string, field, maxLength);
}

export function requiredUuid(value: unknown, field: string): string {
  return requireUuid(value as string, field);
}

export function requiredNonNegativeInteger(value: unknown, field: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw invalid(field, 'NON_NEGATIVE_INTEGER', 'errors.validation.nonNegativeInteger');
  return value as number;
}

export function optionalBoundedInteger(value: unknown, field: string, minimum: number, maximum: number, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = typeof value === 'string' && /^\d+$/u.test(value) ? Number(value) : value;
  const number = requirePositiveSafeInteger(parsed as number, field);
  if (number < minimum || number > maximum) throw invalid(field, 'RANGE', 'errors.validation.range');
  return number;
}

export function requiredStringArray(value: unknown, field: string, maxItems: number, itemMaxLength: number): readonly string[] {
  if (!Array.isArray(value)) throw invalid(field, 'ARRAY', 'errors.validation.array');
  if (value.length > maxItems) throw invalid(field, 'TOO_MANY_ITEMS', 'errors.validation.tooManyItems');
  const items = value.map((item, index) => requiredString(item, `${field}[${index}]`, itemMaxLength));
  return Object.freeze([...new Set(items)]);
}

export function requiredSettingScope(value: unknown): 'platform' | 'project' {
  return requireOneOf(requiredString(value, 'scope', 32), ['platform', 'project'] as const, 'scope');
}

export function requiredScalarSettingValue(value: unknown): string | number | boolean {
  if (typeof value === 'string') return requireNonBlank(value, 'value', 4096);
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw invalid('value', 'SCALAR', 'errors.validation.scalar');
}

export function optionalEnum<T extends string>(value: unknown, allowed: readonly T[], field: string): T | undefined {
  if (value === undefined) return undefined;
  return requireOneOf(requiredString(value, field, 128), allowed, field);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function invalid(field: string, code: string, messageKey: string): ValidationError {
  return new ValidationError([{ field, code, messageKey }]);
}

import type { AuditJsonValue } from './contracts.js';

export const REDACTED_VALUE = '[REDACTED]' as const;

const SENSITIVE_KEY = /(?:password|passwd|pwd|secret|token|authorization|cookie|credential|api[-_]?key)/iu;

export function isSensitiveFieldName(name: string): boolean {
  return SENSITIVE_KEY.test(name);
}

export function sanitizeAuditValue(value: unknown, fieldName?: string): AuditJsonValue {
  if (fieldName && isSensitiveFieldName(fieldName)) return REDACTED_VALUE;
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return Object.freeze(value.map((item) => sanitizeAuditValue(item)));
  if (typeof value === 'object') {
    const result: Record<string, AuditJsonValue> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') continue;
      result[key] = sanitizeAuditValue(item, key);
    }
    return Object.freeze(result);
  }
  return String(value);
}

export function sanitizeAuditMetadata(
  metadata: Readonly<Record<string, unknown>> = {},
): Readonly<Record<string, AuditJsonValue>> {
  const result: Record<string, AuditJsonValue> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') continue;
    result[key] = sanitizeAuditValue(value, key);
  }
  return Object.freeze(result);
}

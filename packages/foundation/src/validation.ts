import { ApplicationError } from './errors.js';

export type ValidationIssue = Readonly<{
  field: string;
  code: string;
  messageKey: string;
}>;

export class ValidationError extends ApplicationError {
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[], internalMessage = 'Input validation failed.') {
    if (issues.length === 0) throw new TypeError('ValidationError requires at least one issue.');
    const frozenIssues = Object.freeze(issues.map((issue) => Object.freeze({ ...issue })));
    super({
      code: 'VALIDATION_FAILED',
      category: 'validation',
      message: internalMessage,
      safeMessageKey: 'errors.validation',
      field: frozenIssues[0]?.field,
      details: { issueCount: frozenIssues.length },
    });
    this.name = 'ValidationError';
    this.issues = frozenIssues;
  }
}

function issue(field: string, code: string, messageKey: string): ValidationError {
  return new ValidationError([{ field, code, messageKey }]);
}

export function requireNonBlank(value: string, field: string, maxLength = 4096): string {
  if (typeof value !== 'string') throw issue(field, 'TYPE_STRING', 'errors.validation.string');
  const normalized = value.trim();
  if (!normalized) throw issue(field, 'REQUIRED', 'errors.validation.required');
  if (!Number.isSafeInteger(maxLength) || maxLength < 1) throw new TypeError('maxLength must be a positive safe integer.');
  if (normalized.length > maxLength) throw issue(field, 'TOO_LONG', 'errors.validation.tooLong');
  return normalized;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function requireUuid(value: string, field: string): string {
  const normalized = requireNonBlank(value, field, 64).toLowerCase();
  if (!UUID_PATTERN.test(normalized)) throw issue(field, 'UUID', 'errors.validation.uuid');
  return normalized;
}

export function requirePositiveSafeInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw issue(field, 'POSITIVE_SAFE_INTEGER', 'errors.validation.positiveInteger');
  }
  return value;
}

export function requireOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  field: string,
): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw issue(field, 'ENUM', 'errors.validation.choice');
  }
  return value as T;
}

export function requireValidDate(value: Date, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw issue(field, 'DATE', 'errors.validation.date');
  }
  return new Date(value.getTime());
}

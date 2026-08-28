export const APPLICATION_ERROR_CATEGORIES = [
  'validation',
  'not-found',
  'conflict',
  'authentication',
  'authorization',
  'rate-limit',
  'dependency',
  'internal',
] as const;

export type ApplicationErrorCategory = (typeof APPLICATION_ERROR_CATEGORIES)[number];
export type ErrorDetailValue = string | number | boolean | null;
export type ErrorDetails = Readonly<Record<string, ErrorDetailValue>>;

const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/;
const MESSAGE_KEY_PATTERN = /^[a-z][A-Za-z0-9]*(?:[._-][A-Za-z0-9]+)*$/;

export type ApplicationErrorOptions = Readonly<{
  code: string;
  category: ApplicationErrorCategory;
  message: string;
  safeMessageKey: string;
  field?: string;
  details?: ErrorDetails;
  cause?: unknown;
}>;

/**
 * Canonical internal application error.
 *
 * `message` is diagnostic/internal text. Transport layers MUST NOT expose it
 * automatically. `safeMessageKey` is the stable localization key intended for
 * a client-safe mapping at an API/UI boundary.
 */
export class ApplicationError extends Error {
  readonly code: string;
  readonly category: ApplicationErrorCategory;
  readonly safeMessageKey: string;
  readonly field?: string;
  readonly details: ErrorDetails;

  constructor(options: ApplicationErrorOptions) {
    if (!ERROR_CODE_PATTERN.test(options.code)) {
      throw new TypeError(`Invalid application error code: ${options.code}`);
    }
    if (!(APPLICATION_ERROR_CATEGORIES as readonly string[]).includes(options.category)) {
      throw new TypeError(`Invalid application error category: ${String(options.category)}`);
    }
    if (!MESSAGE_KEY_PATTERN.test(options.safeMessageKey)) {
      throw new TypeError(`Invalid safe message key: ${options.safeMessageKey}`);
    }
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'ApplicationError';
    this.code = options.code;
    this.category = options.category;
    this.safeMessageKey = options.safeMessageKey;
    this.field = options.field;
    this.details = Object.freeze({ ...(options.details ?? {}) });
  }
}

export type SafeErrorDescriptor = Readonly<{
  code: string;
  category: ApplicationErrorCategory;
  messageKey: string;
  field?: string;
  correlationId?: string;
}>;

export function isApplicationError(value: unknown): value is ApplicationError {
  return value instanceof ApplicationError;
}

/** Returns only fields approved for a future client/error boundary. */
export function toSafeErrorDescriptor(
  error: ApplicationError,
  correlationId?: string,
): SafeErrorDescriptor {
  return Object.freeze({
    code: error.code,
    category: error.category,
    messageKey: error.safeMessageKey,
    ...(error.field ? { field: error.field } : {}),
    ...(correlationId ? { correlationId } : {}),
  });
}

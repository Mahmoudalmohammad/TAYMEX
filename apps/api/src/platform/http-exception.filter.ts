import { ArgumentsHost, Catch, HttpException, Inject, type ExceptionFilter } from '@nestjs/common';
import { AuthorizationDeniedError } from '@engineering-platform/authorization';
import { ApplicationError, isApplicationError, toSafeErrorDescriptor } from '@taymex/foundation';
import { API_RUNTIME, type ApiRuntime } from './runtime.js';
import type { ApiHttpReply, ApiHttpRequest } from './http-types.js';
import { applyResponseSecurity } from './response-security.js';

@Catch()
export class HttpExceptionBoundary implements ExceptionFilter {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}

  async catch(error: unknown, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const request = http.getRequest<ApiHttpRequest>();
    const reply = http.getResponse<ApiHttpReply>();
    const correlationId = request.taymex?.correlationId ?? this.runtime.correlation.resolve().id;
    applyResponseSecurity(reply, correlationId);

    const normalized = normalizeError(error, correlationId);
    await this.runtime.logger.log({
      level: normalized.status >= 500 ? 'error' : normalized.status >= 400 ? 'warn' : 'info',
      event: 'http.request.failed',
      message: 'HTTP request failed.',
      correlationId,
      fields: {
        method: request.method,
        path: pathOnly(request.url),
        status: normalized.status,
        errorCode: normalized.body.error.code,
        errorType: error instanceof Error ? error.name : typeof error,
      },
    });
    reply.status(normalized.status).send(normalized.body);
  }
}

export function normalizeError(error: unknown, correlationId: string): Readonly<{
  status: number;
  body: Readonly<{ error: Readonly<{ code: string; category: string; messageKey: string; field?: string; correlationId: string }> }>;
}> {
  if (error instanceof AuthorizationDeniedError) {
    return Object.freeze({
      status: 403,
      body: Object.freeze({
        error: Object.freeze({
          code: 'AUTHORIZATION_DENIED',
          category: 'authorization',
          messageKey: 'errors.authorization.denied',
          correlationId,
        }),
      }),
    });
  }
  if (isApplicationError(error)) {
    const descriptor = toSafeErrorDescriptor(error, correlationId);
    return Object.freeze({
      status: statusFor(error),
      body: Object.freeze({ error: Object.freeze({ ...descriptor, correlationId }) }),
    });
  }
  const httpStatus = error instanceof HttpException ? error.getStatus() : statusCode(error);
  if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
    const code = httpStatus === 413 ? 'HTTP_PAYLOAD_TOO_LARGE'
      : httpStatus === 415 ? 'HTTP_UNSUPPORTED_MEDIA_TYPE'
      : httpStatus === 404 ? 'HTTP_NOT_FOUND'
      : 'HTTP_BAD_REQUEST';
    const category = httpStatus === 404 ? 'not-found' : 'validation';
    return Object.freeze({
      status: httpStatus,
      body: Object.freeze({ error: Object.freeze({ code, category, messageKey: `errors.http.${httpStatus}`, correlationId }) }),
    });
  }
  return Object.freeze({
    status: 500,
    body: Object.freeze({ error: Object.freeze({ code: 'HTTP_INTERNAL_ERROR', category: 'internal', messageKey: 'errors.internal', correlationId }) }),
  });
}

function statusFor(error: ApplicationError): number {
  return Object.freeze({
    validation: 400,
    'not-found': 404,
    conflict: 409,
    authentication: 401,
    authorization: 403,
    'rate-limit': 429,
    dependency: 503,
    internal: 500,
  })[error.category];
}

function statusCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) return null;
  const value = (error as { statusCode?: unknown }).statusCode;
  return Number.isSafeInteger(value) ? value as number : null;
}

function pathOnly(url: string): string {
  return url.split('?', 1)[0] || '/';
}

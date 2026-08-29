import { ApplicationError } from '@taymex/foundation';

export class HttpBoundaryError extends ApplicationError {
  constructor(input: Readonly<{
    code: string;
    category: 'validation' | 'not-found' | 'authentication' | 'authorization' | 'rate-limit';
    safeMessageKey: string;
    message: string;
    field?: string;
  }>) {
    super(input);
    this.name = 'HttpBoundaryError';
  }
}

export function contentTypeRequiredError(): HttpBoundaryError {
  return new HttpBoundaryError({
    code: 'HTTP_JSON_CONTENT_TYPE_REQUIRED',
    category: 'validation',
    safeMessageKey: 'errors.http.jsonContentTypeRequired',
    message: 'Request body requires application/json content type.',
  });
}

export function rateLimitExceededError(): HttpBoundaryError {
  return new HttpBoundaryError({
    code: 'HTTP_RATE_LIMIT_EXCEEDED',
    category: 'rate-limit',
    safeMessageKey: 'errors.http.rateLimitExceeded',
    message: 'HTTP rate limit exceeded.',
  });
}

export function routePolicyMissingError(): HttpBoundaryError {
  return new HttpBoundaryError({
    code: 'HTTP_ROUTE_POLICY_MISSING',
    category: 'authorization',
    safeMessageKey: 'errors.http.routeUnavailable',
    message: 'HTTP route has no generated policy metadata.',
  });
}

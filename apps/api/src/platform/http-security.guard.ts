import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { requirePermission } from '@engineering-platform/authorization';
import { requireAssurance, sessionInvalidError } from '@taymex/identity';
import { API_OPERATION_METADATA } from './http-policy.js';
import { API_RUNTIME, type ApiRuntime } from './runtime.js';
import type { ApiHttpReply, ApiHttpRequest } from './http-types.js';
import { contentTypeRequiredError, rateLimitExceededError, routePolicyMissingError } from './http-errors.js';
import { readSessionCookie } from './session-cookie.js';
import type { GeneratedApiOperation } from '../generated/api-contracts.generated.js';
import { applyResponseSecurity } from './response-security.js';

@Injectable()
export class HttpSecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(API_RUNTIME) private readonly runtime: ApiRuntime,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const operation = this.reflector.get<GeneratedApiOperation>(API_OPERATION_METADATA, context.getHandler());
    if (!operation) throw routePolicyMissingError();
    const request = context.switchToHttp().getRequest<ApiHttpRequest>();
    const reply = context.switchToHttp().getResponse<ApiHttpReply>();
    const correlation = this.runtime.correlation.resolve(singleHeader(request.headers['x-correlation-id']));
    applyResponseSecurity(reply, correlation.id);
    request.taymex = { correlationId: correlation.id, operation, actor: null, sessionSecret: null };

    const rate = this.runtime.httpRateLimiter.consume(
      `${operation.operationId}:${request.ip?.trim() || 'unresolved-peer'}`,
      ratePolicy(operation),
      new Date(),
    );
    if (!rate.allowed) {
      reply.header('retry-after', String(rate.retryAfterSeconds));
      throw rateLimitExceededError();
    }

    if (operation.requiresJsonBody) {
      const contentType = singleHeader(request.headers['content-type'])?.toLowerCase();
      if (!contentType?.startsWith('application/json')) throw contentTypeRequiredError();
    }

    let actor = null;
    let sessionSecret: string | null = null;
    if (operation.auth === 'session') {
      sessionSecret = readSessionCookie(request.headers.cookie);
      if (!sessionSecret) throw sessionInvalidError();
      actor = await this.runtime.identity.authenticateSession(sessionSecret, correlation.id);
      if (operation.permission) requirePermission(actor, operation.permission);
      if (operation.assurance) requireAssurance(actor, operation.assurance);
    }
    request.taymex = { correlationId: correlation.id, operation, actor, sessionSecret };
    return true;
  }
}

function singleHeader(value: string | readonly string[] | undefined): string | undefined {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && value.length === 1) return value[0];
  return undefined;
}

function ratePolicy(operation: GeneratedApiOperation): Readonly<{ limit: number; windowMs: number }> {
  if (operation.operationId === 'authSignIn') return Object.freeze({ limit: 10, windowMs: 60_000 });
  if (operation.auth === 'public') return Object.freeze({ limit: 120, windowMs: 60_000 });
  if (operation.permission) return Object.freeze({ limit: 60, windowMs: 60_000 });
  return Object.freeze({ limit: 90, windowMs: 60_000 });
}

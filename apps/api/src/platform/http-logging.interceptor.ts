import { CallHandler, ExecutionContext, Inject, Injectable, type NestInterceptor } from '@nestjs/common';
import { tap, type Observable } from 'rxjs';
import { API_RUNTIME, type ApiRuntime } from './runtime.js';
import type { ApiHttpReply, ApiHttpRequest } from './http-types.js';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(@Inject(API_RUNTIME) private readonly runtime: ApiRuntime) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<ApiHttpRequest>();
    const reply = context.switchToHttp().getResponse<ApiHttpReply & { statusCode?: number }>();
    const startedAt = performance.now();
    return next.handle().pipe(tap({
      next: () => {
        const ctx = request.taymex;
        void this.runtime.logger.log({
          level: 'info',
          event: 'http.request.completed',
          message: 'HTTP request completed.',
          ...(ctx ? { correlationId: ctx.correlationId } : {}),
          fields: {
            method: request.method,
            path: request.url.split('?', 1)[0] || '/',
            status: reply.statusCode ?? 200,
            durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
            ...(ctx?.actor ? { actorAccountId: ctx.actor.accountId } : {}),
            ...(ctx ? { operationId: ctx.operation.operationId, classification: ctx.operation.classification } : {}),
          },
        });
      },
    }));
  }
}

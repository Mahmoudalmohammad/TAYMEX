import type { ActorContext } from '@taymex/identity';
import type { GeneratedApiOperation } from '../generated/api-contracts.generated.js';

export type ApiRequestContext = {
  correlationId: string;
  operation: GeneratedApiOperation;
  actor: ActorContext | null;
  sessionSecret: string | null;
};

export type ApiHttpRequest = {
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  readonly method: string;
  readonly url: string;
  readonly ip?: string;
  readonly body?: unknown;
  readonly params?: Record<string, unknown>;
  readonly query?: Record<string, unknown>;
  taymex?: ApiRequestContext;
};

export type ApiHttpReply = {
  header(name: string, value: string): ApiHttpReply;
  status(code: number): ApiHttpReply;
  send(payload?: unknown): unknown;
};

export function requireRequestContext(request: ApiHttpRequest): ApiRequestContext {
  if (!request.taymex) throw new Error('TAYMEX HTTP request context is unavailable.');
  return request.taymex;
}

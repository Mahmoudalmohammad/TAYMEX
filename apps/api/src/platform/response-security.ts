import type { ApiHttpReply } from './http-types.js';

export function applyResponseSecurity(reply: ApiHttpReply, correlationId: string): void {
  reply.header('x-correlation-id', correlationId);
  reply.header('cache-control', 'no-store');
  reply.header('pragma', 'no-cache');
  reply.header('x-content-type-options', 'nosniff');
  reply.header('x-frame-options', 'DENY');
  reply.header('referrer-policy', 'no-referrer');
  reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  reply.header('cross-origin-resource-policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') reply.header('strict-transport-security', 'max-age=31536000; includeSubDomains');
}

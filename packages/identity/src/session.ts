import { requireUuid } from '@taymex/foundation';
import { createHash, randomBytes } from 'node:crypto';

export const AUTH_ASSURANCE_LEVELS = ['AAL1', 'AAL2'] as const;
export type AuthenticationAssurance = (typeof AUTH_ASSURANCE_LEVELS)[number];

export type SessionRecord = Readonly<{
  id: string;
  accountId: string;
  tokenHash: string;
  assurance: AuthenticationAssurance;
  clientLabel: string | null;
  createdAt: Date;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  version: number;
}>;

export type SessionView = Readonly<{
  id: string;
  clientLabel: string | null;
  assurance: AuthenticationAssurance;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  current: boolean;
}>;

export class SecretTokenService {
  constructor(private readonly bytes = 32) {
    if (!Number.isSafeInteger(bytes) || bytes < 32) throw new TypeError('Secret token entropy must be at least 32 bytes.');
  }

  issue(): Readonly<{ secret: string; hash: string }> {
    const secret = randomBytes(this.bytes).toString('base64url');
    return Object.freeze({ secret, hash: this.hash(secret) });
  }

  hash(secret: string): string {
    if (typeof secret !== 'string' || secret.length < 32) return createHash('sha256').update(String(secret)).digest('base64url');
    return createHash('sha256').update(secret, 'utf8').digest('base64url');
  }
}

export function createSession(input: Readonly<{
  id: string;
  accountId: string;
  tokenHash: string;
  assurance: AuthenticationAssurance;
  clientLabel?: string | null;
  now: Date;
  ttlMs: number;
}>): SessionRecord {
  if (!Number.isSafeInteger(input.ttlMs) || input.ttlMs < 60_000) throw new TypeError('Session TTL must be at least one minute.');
  const now = cloneDate(input.now);
  return freezeSession({
    id: requireUuid(input.id, 'sessionId'),
    accountId: requireUuid(input.accountId, 'accountId'),
    tokenHash: input.tokenHash,
    assurance: input.assurance,
    clientLabel: normalizeClientLabel(input.clientLabel),
    createdAt: now,
    expiresAt: new Date(now.getTime() + input.ttlMs),
    rotatedAt: null,
    revokedAt: null,
    version: 1,
  });
}

export function rotateSession(session: SessionRecord, tokenHash: string, nowValue: Date): SessionRecord {
  const now = cloneDate(nowValue);
  assertSessionActive(session, now);
  return freezeSession({ ...session, tokenHash, rotatedAt: now, version: session.version + 1 });
}

export function revokeSession(session: SessionRecord, nowValue: Date): SessionRecord {
  if (session.revokedAt) return session;
  const now = cloneDate(nowValue);
  return freezeSession({ ...session, revokedAt: now, version: session.version + 1 });
}

export function assertSessionActive(session: SessionRecord, nowValue: Date): void {
  const now = cloneDate(nowValue);
  if (session.revokedAt || session.expiresAt.getTime() <= now.getTime()) throw new Error('SESSION_INACTIVE');
}

export function toSessionView(session: SessionRecord, currentSessionId?: string): SessionView {
  return Object.freeze({
    id: session.id,
    clientLabel: session.clientLabel,
    assurance: session.assurance,
    createdAt: cloneDate(session.createdAt),
    expiresAt: cloneDate(session.expiresAt),
    revokedAt: session.revokedAt ? cloneDate(session.revokedAt) : null,
    current: session.id === currentSessionId,
  });
}

function cloneDate(value: Date): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError('Invalid session date.');
  return new Date(value.getTime());
}

function normalizeClientLabel(value?: string | null): string | null {
  if (value == null) return null;
  const label = value.trim();
  if (!label) return null;
  if (label.length > 120) throw new TypeError('clientLabel is too long.');
  return label;
}

function freezeSession(session: SessionRecord): SessionRecord {
  return Object.freeze({
    ...session,
    createdAt: cloneDate(session.createdAt),
    expiresAt: cloneDate(session.expiresAt),
    rotatedAt: session.rotatedAt ? cloneDate(session.rotatedAt) : null,
    revokedAt: session.revokedAt ? cloneDate(session.revokedAt) : null,
  });
}

import type { Account } from './account.js';
import type { SessionRecord } from './session.js';
import type { GeneratedIdentityEventId } from './generated/events.generated.js';

export type PasswordCredential = Readonly<{
  accountId: string;
  passwordHash: string;
  changedAt: Date;
  version: number;
}>;

export const CHALLENGE_KINDS = ['PASSWORD_RESET', 'EMAIL_VERIFICATION'] as const;
export type IdentityChallengeKind = (typeof CHALLENGE_KINDS)[number];

export type IdentityChallenge = Readonly<{
  id: string;
  kind: IdentityChallengeKind;
  accountId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
  version: number;
}>;

export interface IdentityRepository {
  findAccountById(id: string): Promise<Account | null>;
  findAccountByNormalizedEmail(normalizedEmail: string): Promise<Account | null>;
  createAccount(account: Account): Promise<'created' | 'duplicate-email'>;
  replaceAccountIfVersionMatches(account: Account, expectedVersion: number): Promise<'updated' | 'version-conflict'>;

  findPasswordCredential(accountId: string): Promise<PasswordCredential | null>;
  replacePasswordCredential(credential: PasswordCredential): Promise<void>;

  createSession(session: SessionRecord): Promise<void>;
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>;
  replaceSessionIfVersionMatches(session: SessionRecord, expectedVersion: number): Promise<'updated' | 'version-conflict'>;
  listSessionsForAccount(accountId: string, limit?: number): Promise<readonly SessionRecord[]>;
  revokeAllSessionsForAccount(accountId: string, revokedAt: Date, exceptSessionId?: string): Promise<number>;

  createChallenge(challenge: IdentityChallenge): Promise<void>;
  findChallengeByTokenHash(kind: IdentityChallengeKind, tokenHash: string): Promise<IdentityChallenge | null>;
  consumeChallengeIfActive(id: string, expectedVersion: number, consumedAt: Date): Promise<'consumed' | 'unavailable'>;
}

export interface IdGenerator {
  next(): string;
}

export type IdentitySecurityReason =
  | 'unknown-account'
  | 'wrong-password'
  | 'account-unavailable'
  | 'email-unverified'
  | 'throttled'
  | 'session-invalid'
  | 'password-changed'
  | 'password-reset'
  | 'account-status-changed';

export type IdentitySecurityEvent = Readonly<{
  eventId: GeneratedIdentityEventId;
  occurredAt: Date;
  subjectAccountId?: string;
  actorAccountId?: string;
  sessionId?: string;
  roleId?: string;
  reason?: IdentitySecurityReason;
  correlationId?: string;
}>;

export interface IdentitySecurityEventSink {
  emit(event: IdentitySecurityEvent): Promise<void>;
}

export type SecretDeliveryPurpose = 'password-reset' | 'email-verification';
export type SecretDelivery = Readonly<{
  purpose: SecretDeliveryPurpose;
  accountId: string;
  secret: string;
  expiresAt: Date;
}>;

export interface SecretDeliverySink {
  deliver(delivery: SecretDelivery): Promise<void>;
}

export interface AccountAccessResolver {
  resolve(accountId: string): Promise<Readonly<{ roleIds: readonly string[]; permissions: ReadonlySet<string> }>>;
}

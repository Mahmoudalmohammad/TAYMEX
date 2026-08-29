import { randomUUID } from 'node:crypto';
import type { Clock } from '@taymex/foundation';
import type { AtomicTransactionBoundary } from '@taymex/data-postgres';
import { createAccount, assertAccountCanAuthenticate, changeAccountStatus, markEmailVerified, normalizeEmail, type Account, type AccountStatus } from './account.js';
import { createActorContext, type ActorContext } from './actor.js';
import type {
  AccountAccessResolver,
  IdGenerator,
  IdentityChallenge,
  IdentityChallengeKind,
  IdentityRepository,
  IdentitySecurityEvent,
  IdentitySecurityEventSink,
  PasswordCredential,
  SecretDeliverySink,
} from './contracts.js';
import { authenticationFailedError, IDENTITY_ERROR_CODES, IdentityError, passwordPolicyError, sessionInvalidError } from './errors.js';
import {
  identityAccountProvisionedEvent,
  identityAccountStatusChangedEvent,
  identityEmailVerificationCompletedEvent,
  identityEmailVerificationRequestedEvent,
  identityPasswordChangedEvent,
  identityPasswordResetCompletedEvent,
  identityPasswordResetRequestedEvent,
  identitySessionIssuedEvent,
  identitySessionRevokedAllEvent,
  identitySessionRevokedEvent,
  identitySessionRotatedEvent,
  identitySignInFailedEvent,
  identitySignInSucceededEvent,
} from './generated/events.generated.js';
import { assertPasswordPolicy, type PasswordHasher, type PasswordPolicy, DEFAULT_PASSWORD_POLICY } from './password.js';
import { requirePrivilegedIdentityOperation } from './privileged.js';
import { createSession, assertSessionActive, revokeSession, rotateSession, SecretTokenService, toSessionView, type SessionView } from './session.js';
import type { AuthenticationThrottle } from './throttle.js';

export type IdentityPolicy = Readonly<{
  sessionTtlMs: number;
  passwordResetTtlMs: number;
  emailVerificationTtlMs: number;
  requireVerifiedEmailForSignIn: boolean;
  passwordPolicy: PasswordPolicy;
}>;

export const DEFAULT_IDENTITY_POLICY: IdentityPolicy = Object.freeze({
  sessionTtlMs: 12 * 60 * 60_000,
  passwordResetTtlMs: 30 * 60_000,
  emailVerificationTtlMs: 24 * 60 * 60_000,
  requireVerifiedEmailForSignIn: false,
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
});

export class UuidGenerator implements IdGenerator {
  next(): string { return randomUUID(); }
}

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly accessResolver: AccountAccessResolver,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: SecretTokenService,
    private readonly throttle: AuthenticationThrottle,
    private readonly events: IdentitySecurityEventSink,
    private readonly secretDelivery: SecretDeliverySink,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
    private readonly policy: IdentityPolicy = DEFAULT_IDENTITY_POLICY,
    private readonly transactions?: AtomicTransactionBoundary,
  ) {
    validatePolicy(policy);
  }

  async provisionPasswordAccount(input: Readonly<{ email: string; password: string; correlationId?: string }>): Promise<Account> {
    const now = this.clock.now();
    const account = createAccount({ id: this.ids.next(), email: input.email, now });
    assertPasswordPolicy(input.password, this.policy.passwordPolicy);
    const passwordHash = await this.passwordHasher.hash(input.password);
    return this.atomic(async () => {
      const created = await this.repository.createAccount(account);
      if (created === 'duplicate-email') {
        throw new IdentityError({
          code: IDENTITY_ERROR_CODES.accountEmailConflict,
          category: 'conflict',
          message: 'Account email already exists.',
          safeMessageKey: 'errors.identity.accountEmailConflict',
          field: 'email',
        });
      }
      await this.repository.replacePasswordCredential(Object.freeze({ accountId: account.id, passwordHash, changedAt: now, version: 1 }));
      await this.emit(identityAccountProvisionedEvent, now, { subjectAccountId: account.id, correlationId: input.correlationId });
      return account;
    });
  }

  async signIn(input: Readonly<{
    email: string;
    password: string;
    clientLabel?: string | null;
    correlationId?: string;
  }>): Promise<Readonly<{ sessionSecret: string; actor: ActorContext }>> {
    const now = this.clock.now();
    const principal = normalizeEmail(input.email);
    if (await this.throttle.isBlocked(principal, now)) {
      await this.emit(identitySignInFailedEvent, now, { reason: 'throttled', correlationId: input.correlationId });
      throw authenticationFailedError();
    }

    const account = await this.repository.findAccountByNormalizedEmail(principal);
    const credential = account ? await this.repository.findPasswordCredential(account.id) : null;
    const passwordHash = credential?.passwordHash ?? await this.passwordHasher.dummyHash();
    const validPassword = await this.passwordHasher.verify(input.password, passwordHash);

    let failureReason: 'unknown-account' | 'wrong-password' | 'account-unavailable' | 'email-unverified' | null = null;
    if (!account || !credential) failureReason = 'unknown-account';
    else if (!validPassword) failureReason = 'wrong-password';
    else {
      try { assertAccountCanAuthenticate(account, this.policy.requireVerifiedEmailForSignIn); }
      catch (error) { failureReason = error instanceof Error && error.message === 'EMAIL_UNVERIFIED' ? 'email-unverified' : 'account-unavailable'; }
    }

    if (failureReason || !account || !credential) {
      const reason = failureReason ?? 'unknown-account';
      await this.throttle.recordFailure(principal, now);
      await this.emit(identitySignInFailedEvent, now, {
        ...(account ? { subjectAccountId: account.id } : {}),
        reason,
        correlationId: input.correlationId,
      });
      throw authenticationFailedError();
    }

    await this.throttle.recordSuccess(principal);
    const issued = this.tokenService.issue();
    const session = createSession({
      id: this.ids.next(),
      accountId: account.id,
      tokenHash: issued.hash,
      assurance: 'AAL1',
      clientLabel: input.clientLabel,
      now,
      ttlMs: this.policy.sessionTtlMs,
    });
    return this.atomic(async () => {
      await this.repository.createSession(session);
      const actor = await this.actorFor(account, session.id, session.assurance, now);
      await this.emit(identitySessionIssuedEvent, now, { subjectAccountId: account.id, sessionId: session.id, correlationId: input.correlationId });
      await this.emit(identitySignInSucceededEvent, now, { subjectAccountId: account.id, sessionId: session.id, correlationId: input.correlationId });
      return Object.freeze({ sessionSecret: issued.secret, actor });
    });
  }

  async authenticateSession(sessionSecret: string, correlationId?: string): Promise<ActorContext> {
    const now = this.clock.now();
    const session = await this.repository.findSessionByTokenHash(this.tokenService.hash(sessionSecret));
    if (!session) {
      await this.emit(identitySignInFailedEvent, now, { reason: 'session-invalid', correlationId });
      throw sessionInvalidError();
    }
    try { assertSessionActive(session, now); } catch {
      await this.emit(identitySignInFailedEvent, now, { subjectAccountId: session.accountId, sessionId: session.id, reason: 'session-invalid', correlationId });
      throw sessionInvalidError();
    }
    const account = await this.repository.findAccountById(session.accountId);
    if (!account) throw sessionInvalidError();
    try { assertAccountCanAuthenticate(account, this.policy.requireVerifiedEmailForSignIn); } catch { throw sessionInvalidError(); }
    return this.actorFor(account, session.id, session.assurance, now);
  }

  async rotateCurrentSession(sessionSecret: string, correlationId?: string): Promise<Readonly<{ sessionSecret: string; actor: ActorContext }>> {
    const now = this.clock.now();
    const current = await this.repository.findSessionByTokenHash(this.tokenService.hash(sessionSecret));
    if (!current) throw sessionInvalidError();
    try { assertSessionActive(current, now); } catch { throw sessionInvalidError(); }
    const account = await this.repository.findAccountById(current.accountId);
    if (!account) throw sessionInvalidError();
    try { assertAccountCanAuthenticate(account, this.policy.requireVerifiedEmailForSignIn); } catch { throw sessionInvalidError(); }
    const issued = this.tokenService.issue();
    const rotated = rotateSession(current, issued.hash, now);
    return this.atomic(async () => {
      const result = await this.repository.replaceSessionIfVersionMatches(rotated, current.version);
      if (result !== 'updated') throw sessionInvalidError();
      await this.emit(identitySessionRotatedEvent, now, { subjectAccountId: account.id, sessionId: current.id, correlationId });
      return Object.freeze({ sessionSecret: issued.secret, actor: await this.actorFor(account, current.id, current.assurance, now) });
    });
  }

  async signOut(sessionSecret: string, correlationId?: string): Promise<void> {
    const now = this.clock.now();
    const current = await this.repository.findSessionByTokenHash(this.tokenService.hash(sessionSecret));
    if (!current) return;
    const revoked = revokeSession(current, now);
    await this.atomic(async () => {
      const result = await this.repository.replaceSessionIfVersionMatches(revoked, current.version);
      if (result === 'updated') {
        await this.emit(identitySessionRevokedEvent, now, { subjectAccountId: current.accountId, sessionId: current.id, correlationId });
      }
    });
  }

  async signOutAll(actor: ActorContext, correlationId?: string): Promise<number> {
    const now = this.clock.now();
    return this.atomic(async () => {
      const count = await this.repository.revokeAllSessionsForAccount(actor.accountId, now);
      await this.emit(identitySessionRevokedAllEvent, now, { actorAccountId: actor.accountId, subjectAccountId: actor.accountId, correlationId });
      return count;
    });
  }

  async revokeAllAccountSessions(input: Readonly<{ actor: ActorContext; accountId: string; correlationId?: string }>): Promise<number> {
    requirePrivilegedIdentityOperation(input.actor, 'manage-sessions');
    const now = this.clock.now();
    return this.atomic(async () => {
      const count = await this.repository.revokeAllSessionsForAccount(input.accountId, now);
      await this.emit(identitySessionRevokedAllEvent, now, { actorAccountId: input.actor.accountId, subjectAccountId: input.accountId, correlationId: input.correlationId });
      return count;
    });
  }

  async listSessions(actor: ActorContext): Promise<readonly SessionView[]> {
    const sessions = await this.repository.listSessionsForAccount(actor.accountId);
    return Object.freeze(sessions.map((session) => toSessionView(session, actor.sessionId)));
  }

  async changePassword(input: Readonly<{
    actor: ActorContext;
    currentPassword: string;
    newPassword: string;
    correlationId?: string;
  }>): Promise<void> {
    const now = this.clock.now();
    const credential = await this.repository.findPasswordCredential(input.actor.accountId);
    if (!credential || !(await this.passwordHasher.verify(input.currentPassword, credential.passwordHash))) {
      throw new IdentityError({
        code: IDENTITY_ERROR_CODES.currentPasswordInvalid,
        category: 'authentication',
        message: 'Current password verification failed.',
        safeMessageKey: 'errors.identity.currentPasswordInvalid',
        field: 'currentPassword',
      });
    }
    assertPasswordPolicy(input.newPassword, this.policy.passwordPolicy);
    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    await this.atomic(async () => {
      await this.repository.replacePasswordCredential(Object.freeze({
        accountId: credential.accountId,
        passwordHash,
        changedAt: now,
        version: credential.version + 1,
      }));
      await this.repository.revokeAllSessionsForAccount(input.actor.accountId, now);
      await this.emit(identityPasswordChangedEvent, now, { actorAccountId: input.actor.accountId, subjectAccountId: input.actor.accountId, reason: 'password-changed', correlationId: input.correlationId });
      await this.emit(identitySessionRevokedAllEvent, now, { subjectAccountId: input.actor.accountId, reason: 'password-changed', correlationId: input.correlationId });
    });
  }

  async requestPasswordReset(email: string, correlationId?: string): Promise<Readonly<{ accepted: true }>> {
    const now = this.clock.now();
    const normalized = normalizeEmail(email);
    const account = await this.repository.findAccountByNormalizedEmail(normalized);
    if (account && account.status === 'ACTIVE') {
      const challenge = await this.createChallenge('PASSWORD_RESET', account.id, this.policy.passwordResetTtlMs, now);
      await this.secretDelivery.deliver({ purpose: 'password-reset', accountId: account.id, secret: challenge.secret, expiresAt: challenge.record.expiresAt });
      await this.emit(identityPasswordResetRequestedEvent, now, { subjectAccountId: account.id, correlationId });
    }
    return Object.freeze({ accepted: true });
  }

  async completePasswordReset(token: string, newPassword: string, correlationId?: string): Promise<void> {
    const now = this.clock.now();
    assertPasswordPolicy(newPassword, this.policy.passwordPolicy);
    const challenge = await this.requireActiveChallenge('PASSWORD_RESET', token, now);
    const credential = await this.repository.findPasswordCredential(challenge.accountId);
    if (!credential) throw challengeInvalidError();
    const newHash = await this.passwordHasher.hash(newPassword);
    await this.atomic(async () => {
      const consumed = await this.repository.consumeChallengeIfActive(challenge.id, challenge.version, now);
      if (consumed !== 'consumed') throw challengeInvalidError();
      await this.repository.replacePasswordCredential(Object.freeze({
        accountId: credential.accountId,
        passwordHash: newHash,
        changedAt: now,
        version: credential.version + 1,
      }));
      await this.repository.revokeAllSessionsForAccount(challenge.accountId, now);
      await this.emit(identityPasswordResetCompletedEvent, now, { subjectAccountId: challenge.accountId, reason: 'password-reset', correlationId });
      await this.emit(identitySessionRevokedAllEvent, now, { subjectAccountId: challenge.accountId, reason: 'password-reset', correlationId });
    });
  }

  async requestEmailVerification(accountId: string, correlationId?: string): Promise<void> {
    const now = this.clock.now();
    const account = await this.repository.findAccountById(accountId);
    if (!account) throw accountNotFound();
    if (account.emailVerifiedAt) return;
    const challenge = await this.createChallenge('EMAIL_VERIFICATION', account.id, this.policy.emailVerificationTtlMs, now);
    await this.secretDelivery.deliver({ purpose: 'email-verification', accountId: account.id, secret: challenge.secret, expiresAt: challenge.record.expiresAt });
    await this.emit(identityEmailVerificationRequestedEvent, now, { subjectAccountId: account.id, correlationId });
  }

  async completeEmailVerification(token: string, correlationId?: string): Promise<Account> {
    const now = this.clock.now();
    const challenge = await this.requireActiveChallenge('EMAIL_VERIFICATION', token, now);
    const account = await this.repository.findAccountById(challenge.accountId);
    if (!account) throw challengeInvalidError();
    const verified = markEmailVerified(account, { expectedVersion: account.version, now });
    return this.atomic(async () => {
      const consumed = await this.repository.consumeChallengeIfActive(challenge.id, challenge.version, now);
      if (consumed !== 'consumed') throw challengeInvalidError();
      const replaced = await this.repository.replaceAccountIfVersionMatches(verified, account.version);
      if (replaced !== 'updated') throw challengeInvalidError();
      await this.emit(identityEmailVerificationCompletedEvent, now, { subjectAccountId: account.id, correlationId });
      return verified;
    });
  }

  async setAccountStatus(input: Readonly<{ actor: ActorContext; accountId: string; expectedVersion: number; status: AccountStatus; correlationId?: string }>): Promise<Account> {
    requirePrivilegedIdentityOperation(input.actor, 'manage-accounts');
    const now = this.clock.now();
    const account = await this.repository.findAccountById(input.accountId);
    if (!account) throw accountNotFound();
    const changed = changeAccountStatus(account, { expectedVersion: input.expectedVersion, status: input.status, now });
    return this.atomic(async () => {
      const result = await this.repository.replaceAccountIfVersionMatches(changed, input.expectedVersion);
      if (result !== 'updated') throw new IdentityError({
        code: IDENTITY_ERROR_CODES.accountVersionConflict,
        category: 'conflict',
        message: 'Account version conflict.',
        safeMessageKey: 'errors.identity.versionConflict',
      });
      if (changed.status !== 'ACTIVE') await this.repository.revokeAllSessionsForAccount(changed.id, now);
      await this.emit(identityAccountStatusChangedEvent, now, {
        actorAccountId: input.actor.accountId,
        subjectAccountId: changed.id,
        reason: 'account-status-changed',
        correlationId: input.correlationId,
      });
      return changed;
    });
  }


  private atomic<T>(work: () => Promise<T>): Promise<T> {
    return this.transactions ? this.transactions.run(work) : work();
  }

  private async actorFor(account: Account, sessionId: string, assurance: 'AAL1' | 'AAL2', now: Date): Promise<ActorContext> {
    const access = await this.accessResolver.resolve(account.id);
    return createActorContext({
      accountId: account.id,
      sessionId,
      roleIds: access.roleIds,
      permissions: access.permissions,
      assurance,
      authenticatedAt: now,
    });
  }

  private async createChallenge(kind: IdentityChallengeKind, accountId: string, ttlMs: number, now: Date): Promise<Readonly<{ record: IdentityChallenge; secret: string }>> {
    const issued = this.tokenService.issue();
    const record: IdentityChallenge = Object.freeze({
      id: this.ids.next(),
      kind,
      accountId,
      tokenHash: issued.hash,
      createdAt: new Date(now.getTime()),
      expiresAt: new Date(now.getTime() + ttlMs),
      consumedAt: null,
      version: 1,
    });
    await this.repository.createChallenge(record);
    return Object.freeze({ record, secret: issued.secret });
  }

  private async requireActiveChallenge(kind: IdentityChallengeKind, secret: string, now: Date): Promise<IdentityChallenge> {
    const challenge = await this.repository.findChallengeByTokenHash(kind, this.tokenService.hash(secret));
    if (!challenge || challenge.consumedAt || challenge.expiresAt.getTime() <= now.getTime()) throw challengeInvalidError();
    return challenge;
  }

  private async emit(
    eventId: IdentitySecurityEvent['eventId'],
    occurredAt: Date,
    fields: Omit<IdentitySecurityEvent, 'eventId' | 'occurredAt'>,
  ): Promise<void> {
    await this.events.emit(Object.freeze({ eventId, occurredAt: new Date(occurredAt.getTime()), ...fields }));
  }
}

function validatePolicy(policy: IdentityPolicy): void {
  for (const value of [policy.sessionTtlMs, policy.passwordResetTtlMs, policy.emailVerificationTtlMs]) {
    if (!Number.isSafeInteger(value) || value < 60_000) throw new TypeError('Identity TTL values must be at least one minute.');
  }
  if (typeof policy.requireVerifiedEmailForSignIn !== 'boolean') throw new TypeError('Invalid email verification policy.');
}

function accountNotFound(): IdentityError {
  return new IdentityError({
    code: IDENTITY_ERROR_CODES.accountNotFound,
    category: 'not-found',
    message: 'Account was not found.',
    safeMessageKey: 'errors.identity.accountNotFound',
  });
}

function challengeInvalidError(): IdentityError {
  return new IdentityError({
    code: IDENTITY_ERROR_CODES.challengeInvalid,
    category: 'authentication',
    message: 'Challenge is invalid, expired, consumed, or conflicted.',
    safeMessageKey: 'errors.identity.challengeInvalid',
  });
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthorizationDeniedError } from '@engineering-platform/authorization';
import { FixedClock, toSafeErrorDescriptor } from '@taymex/foundation';
import {
  IDENTITY_ERROR_CODES,
  IdentityError,
  IdentityService,
  MemoryAuthenticationThrottle,
  RoleAccessService,
  ScryptPasswordHasher,
  SecretTokenService,
  createActorContext,
  identityAccountsManagePermission,
  identityRolesManagePermission,
  identitySessionsManagePermission,
  normalizeEmail,
  requireAssurance,
} from '../dist/index.js';

const T0 = new Date('2026-08-29T06:00:00.000Z');
const PASSWORD = 'Correct-Horse-2026';
const NEW_PASSWORD = 'Changed-Horse-2026';
const TEST_SCRYPT = Object.freeze({ N: 1024, r: 8, p: 1, keyLength: 32, saltLength: 16, maxmem: 16 * 1024 * 1024 });

class SequenceIds {
  value = 1;
  next() {
    const suffix = String(this.value++).padStart(12, '0');
    return `550e8400-e29b-41d4-a716-${suffix}`;
  }
}

class InMemoryIdentityRepository {
  accounts = new Map();
  credentials = new Map();
  sessions = new Map();
  challenges = new Map();

  async findAccountById(id) { return this.accounts.get(id) ?? null; }
  async findAccountByNormalizedEmail(email) {
    return [...this.accounts.values()].find((account) => account.normalizedEmail === email) ?? null;
  }
  async createAccount(account) {
    if (await this.findAccountByNormalizedEmail(account.normalizedEmail)) return 'duplicate-email';
    this.accounts.set(account.id, account); return 'created';
  }
  async replaceAccountIfVersionMatches(account, expectedVersion) {
    const current = this.accounts.get(account.id);
    if (!current || current.version !== expectedVersion) return 'version-conflict';
    this.accounts.set(account.id, account); return 'updated';
  }
  async findPasswordCredential(accountId) { return this.credentials.get(accountId) ?? null; }
  async replacePasswordCredential(credential) { this.credentials.set(credential.accountId, credential); }

  async createSession(session) { this.sessions.set(session.id, session); }
  async findSessionByTokenHash(hash) {
    return [...this.sessions.values()].find((session) => session.tokenHash === hash) ?? null;
  }
  async replaceSessionIfVersionMatches(session, expectedVersion) {
    const current = this.sessions.get(session.id);
    if (!current || current.version !== expectedVersion) return 'version-conflict';
    this.sessions.set(session.id, session); return 'updated';
  }
  async listSessionsForAccount(accountId) {
    return [...this.sessions.values()].filter((session) => session.accountId === accountId);
  }
  async revokeAllSessionsForAccount(accountId, revokedAt, exceptSessionId) {
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.accountId !== accountId || id === exceptSessionId || session.revokedAt) continue;
      this.sessions.set(id, Object.freeze({ ...session, revokedAt: new Date(revokedAt), version: session.version + 1 }));
      count += 1;
    }
    return count;
  }

  async createChallenge(challenge) { this.challenges.set(challenge.id, challenge); }
  async findChallengeByTokenHash(kind, tokenHash) {
    return [...this.challenges.values()].find((challenge) => challenge.kind === kind && challenge.tokenHash === tokenHash) ?? null;
  }
  async consumeChallengeIfActive(id, expectedVersion, consumedAt) {
    const challenge = this.challenges.get(id);
    if (!challenge || challenge.version !== expectedVersion || challenge.consumedAt || challenge.expiresAt <= consumedAt) return 'unavailable';
    this.challenges.set(id, Object.freeze({ ...challenge, consumedAt: new Date(consumedAt), version: challenge.version + 1 }));
    return 'consumed';
  }
}

class CapturingEvents {
  events = [];
  async emit(event) { this.events.push(event); }
}

class CapturingDelivery {
  deliveries = [];
  async deliver(delivery) { this.deliveries.push(delivery); }
}

class StaticAccessResolver {
  constructor(roleIds = [], permissions = []) { this.roleIds = roleIds; this.permissions = permissions; }
  async resolve() { return { roleIds: this.roleIds, permissions: new Set(this.permissions) }; }
}

class TrackingHasher extends ScryptPasswordHasher {
  verifyCalls = 0;
  dummyCalls = 0;
  async verify(password, encoded) { this.verifyCalls += 1; return super.verify(password, encoded); }
  async dummyHash() { this.dummyCalls += 1; return super.dummyHash(); }
}

function makeHarness(options = {}) {
  const repository = new InMemoryIdentityRepository();
  const events = new CapturingEvents();
  const delivery = new CapturingDelivery();
  const clock = new FixedClock(T0);
  const ids = new SequenceIds();
  const hasher = options.hasher ?? new TrackingHasher(TEST_SCRYPT);
  const throttle = options.throttle ?? new MemoryAuthenticationThrottle({ maxFailures: 3, windowMs: 60_000, lockMs: 60_000 });
  const access = options.access ?? new StaticAccessResolver(['role-products'], ['catalog.products.read']);
  const service = new IdentityService(
    repository,
    access,
    hasher,
    new SecretTokenService(32),
    throttle,
    events,
    delivery,
    clock,
    ids,
    {
      sessionTtlMs: options.sessionTtlMs ?? 60 * 60_000,
      passwordResetTtlMs: options.passwordResetTtlMs ?? 5 * 60_000,
      emailVerificationTtlMs: options.emailVerificationTtlMs ?? 5 * 60_000,
      requireVerifiedEmailForSignIn: options.requireVerifiedEmailForSignIn ?? false,
      passwordPolicy: { minLength: 12, maxLength: 128 },
    },
  );
  return { repository, events, delivery, clock, ids, hasher, throttle, service };
}

function privilegedActor(permission, assurance = 'AAL2', accountId = '550e8400-e29b-41d4-a716-900000000001') {
  return createActorContext({
    accountId,
    sessionId: 'session-privileged',
    roleIds: [],
    permissions: [permission],
    assurance,
    authenticatedAt: T0,
  });
}

test('email identity normalizes case/whitespace and rejects malformed addresses', () => {
  assert.equal(normalizeEmail('  Admin@TAYMEX.Example  '), 'admin@taymex.example');
  assert.throws(() => normalizeEmail('not-an-email'));
});

test('scrypt password hashes are salted, verifiable, versioned and rehash-aware', async () => {
  const hasher = new ScryptPasswordHasher(TEST_SCRYPT);
  const first = await hasher.hash(PASSWORD);
  const second = await hasher.hash(PASSWORD);
  assert.notEqual(first, second);
  assert.match(first, /^scrypt\$v=1\$/);
  assert.equal(await hasher.verify(PASSWORD, first), true);
  assert.equal(await hasher.verify('wrong-password-value', first), false);
  assert.equal(hasher.needsRehash(first), false);
  const stronger = new ScryptPasswordHasher({ ...TEST_SCRYPT, N: 2048 });
  assert.equal(stronger.needsRehash(first), true);
  const hostile = 'scrypt$v=1$N=1073741824,r=8,p=1,l=32$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
  assert.equal(await hasher.verify(PASSWORD, hostile), false);
});

test('account provisioning keeps account and password credential separate and rejects duplicate normalized email', async () => {
  const h = makeHarness();
  const account = await h.service.provisionPasswordAccount({ email: 'Admin@Taymex.Example', password: PASSWORD });
  assert.equal(account.email, 'admin@taymex.example');
  assert.equal(account.version, 1);
  const credential = await h.repository.findPasswordCredential(account.id);
  assert.ok(credential);
  assert.equal('passwordHash' in account, false);
  assert.equal(credential.passwordHash.includes(PASSWORD), false);
  await assert.rejects(
    () => h.service.provisionPasswordAccount({ email: ' admin@taymex.example ', password: PASSWORD }),
    (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.accountEmailConflict,
  );
});

test('unknown account and wrong password expose the same generic authentication error and unknown account does dummy verification work', async () => {
  const h = makeHarness();
  await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });

  let unknownError; let wrongError;
  try { await h.service.signIn({ email: 'missing@taymex.example', password: PASSWORD }); } catch (error) { unknownError = error; }
  try { await h.service.signIn({ email: 'admin@taymex.example', password: 'definitely-wrong-password' }); } catch (error) { wrongError = error; }

  assert.ok(unknownError instanceof IdentityError);
  assert.ok(wrongError instanceof IdentityError);
  assert.equal(unknownError.code, IDENTITY_ERROR_CODES.authenticationFailed);
  assert.deepEqual(toSafeErrorDescriptor(unknownError), toSafeErrorDescriptor(wrongError));
  assert.ok(h.hasher.dummyCalls >= 1);
  assert.ok(h.hasher.verifyCalls >= 2);
  const eventText = JSON.stringify(h.events.events);
  assert.equal(eventText.includes('missing@taymex.example'), false);
  assert.equal(eventText.includes('definitely-wrong-password'), false);
});

test('principal brute-force throttle blocks after bounded failures and clears after lock expiry/success', async () => {
  const throttle = new MemoryAuthenticationThrottle({ maxFailures: 2, windowMs: 60_000, lockMs: 60_000 });
  const h = makeHarness({ throttle });
  await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  await assert.rejects(() => h.service.signIn({ email: 'admin@taymex.example', password: 'wrong-password-111' }));
  await assert.rejects(() => h.service.signIn({ email: 'admin@taymex.example', password: 'wrong-password-222' }));
  const beforeBlocked = h.hasher.verifyCalls;
  await assert.rejects(() => h.service.signIn({ email: 'admin@taymex.example', password: PASSWORD }));
  assert.equal(h.hasher.verifyCalls, beforeBlocked, 'blocked attempt must not perform another credential verification');
  h.clock.set(new Date(T0.getTime() + 61_000));
  const signedIn = await h.service.signIn({ email: 'admin@taymex.example', password: PASSWORD });
  assert.equal(signedIn.actor.accountId.length > 0, true);
  assert.equal(await throttle.isBlocked('admin@taymex.example', h.clock.now()), false);
});

test('successful sign-in persists only session secret hash and creates canonical actor context', async () => {
  const h = makeHarness({ access: new StaticAccessResolver(['catalog-reader'], ['catalog.products.read']) });
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  const result = await h.service.signIn({ email: 'admin@taymex.example', password: PASSWORD, clientLabel: 'Office browser' });
  const sessions = await h.repository.listSessionsForAccount(account.id);
  assert.equal(sessions.length, 1);
  assert.notEqual(sessions[0].tokenHash, result.sessionSecret);
  assert.equal(JSON.stringify(sessions[0]).includes(result.sessionSecret), false);
  assert.equal(result.actor.kind, 'account');
  assert.equal(result.actor.id, account.id);
  assert.equal(result.actor.sessionId, sessions[0].id);
  assert.deepEqual(result.actor.roleIds, ['catalog-reader']);
  assert.equal(result.actor.permissions.has('catalog.products.read'), true);
  assert.equal(result.actor.assurance, 'AAL1');
});

test('session rotation invalidates the old token while preserving session identity', async () => {
  const h = makeHarness();
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  const signIn = await h.service.signIn({ email: account.email, password: PASSWORD });
  const rotated = await h.service.rotateCurrentSession(signIn.sessionSecret);
  assert.notEqual(rotated.sessionSecret, signIn.sessionSecret);
  assert.equal(rotated.actor.sessionId, signIn.actor.sessionId);
  await assert.rejects(() => h.service.authenticateSession(signIn.sessionSecret), (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.sessionInvalid);
  assert.equal((await h.service.authenticateSession(rotated.sessionSecret)).accountId, account.id);
});

test('expired/revoked sessions and sessions for suspended accounts never authenticate', async () => {
  const h = makeHarness({ sessionTtlMs: 60_000 });
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  const first = await h.service.signIn({ email: account.email, password: PASSWORD });
  h.clock.set(new Date(T0.getTime() + 61_000));
  await assert.rejects(() => h.service.authenticateSession(first.sessionSecret));

  h.clock.set(new Date(T0.getTime() + 120_000));
  const second = await h.service.signIn({ email: account.email, password: PASSWORD });
  const manager = privilegedActor(identityAccountsManagePermission);
  const current = await h.repository.findAccountById(account.id);
  await h.service.setAccountStatus({ actor: manager, accountId: account.id, expectedVersion: current.version, status: 'SUSPENDED' });
  await assert.rejects(() => h.service.authenticateSession(second.sessionSecret));
  await assert.rejects(() => h.service.signIn({ email: account.email, password: PASSWORD }), (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.authenticationFailed);
});

test('self logout-all revokes all sessions and session views never expose token hashes', async () => {
  const h = makeHarness();
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  const first = await h.service.signIn({ email: account.email, password: PASSWORD, clientLabel: 'Phone' });
  const second = await h.service.signIn({ email: account.email, password: PASSWORD, clientLabel: 'Laptop' });
  const views = await h.service.listSessions(second.actor);
  assert.equal(views.length, 2);
  assert.equal(views.filter((view) => view.current).length, 1);
  assert.equal(JSON.stringify(views).includes('tokenHash'), false);
  assert.equal(await h.service.signOutAll(second.actor), 2);
  await assert.rejects(() => h.service.authenticateSession(first.sessionSecret));
  await assert.rejects(() => h.service.authenticateSession(second.sessionSecret));
});

test('password change verifies current password, changes hash and revokes all existing sessions', async () => {
  const h = makeHarness();
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  const signed = await h.service.signIn({ email: account.email, password: PASSWORD });
  await assert.rejects(() => h.service.changePassword({ actor: signed.actor, currentPassword: 'wrong-current-password', newPassword: NEW_PASSWORD }));
  await h.service.changePassword({ actor: signed.actor, currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
  await assert.rejects(() => h.service.authenticateSession(signed.sessionSecret));
  await assert.rejects(() => h.service.signIn({ email: account.email, password: PASSWORD }));
  assert.equal((await h.service.signIn({ email: account.email, password: NEW_PASSWORD })).actor.accountId, account.id);
});

test('password reset request is enumeration-safe; token is one-time and successful reset revokes sessions', async () => {
  const h = makeHarness();
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  const existing = await h.service.signIn({ email: account.email, password: PASSWORD });
  assert.deepEqual(await h.service.requestPasswordReset('missing@taymex.example'), { accepted: true });
  assert.equal(h.delivery.deliveries.length, 0);
  assert.deepEqual(await h.service.requestPasswordReset(account.email), { accepted: true });
  assert.equal(h.delivery.deliveries.length, 1);
  const token = h.delivery.deliveries[0].secret;
  assert.equal(JSON.stringify(h.events.events).includes(token), false);
  await h.service.completePasswordReset(token, NEW_PASSWORD);
  await assert.rejects(() => h.service.completePasswordReset(token, 'Another-Good-Password-2026'));
  await assert.rejects(() => h.service.authenticateSession(existing.sessionSecret));
  assert.equal((await h.service.signIn({ email: account.email, password: NEW_PASSWORD })).actor.accountId, account.id);
});

test('expired password-reset challenge is rejected without changing the password', async () => {
  const h = makeHarness({ passwordResetTtlMs: 60_000 });
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  await h.service.requestPasswordReset(account.email);
  const token = h.delivery.deliveries[0].secret;
  h.clock.set(new Date(T0.getTime() + 61_000));
  await assert.rejects(() => h.service.completePasswordReset(token, NEW_PASSWORD));
  assert.equal((await h.service.signIn({ email: account.email, password: PASSWORD })).actor.accountId, account.id);
});

test('email verification hook is one-time and can gate sign-in without changing the account model', async () => {
  const h = makeHarness({ requireVerifiedEmailForSignIn: true });
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  await assert.rejects(() => h.service.signIn({ email: account.email, password: PASSWORD }), (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.authenticationFailed);
  await h.service.requestEmailVerification(account.id);
  const token = h.delivery.deliveries.at(-1).secret;
  const verified = await h.service.completeEmailVerification(token);
  assert.ok(verified.emailVerifiedAt);
  await assert.rejects(() => h.service.completeEmailVerification(token));
  assert.equal((await h.service.signIn({ email: account.email, password: PASSWORD })).actor.accountId, account.id);
});

test('role permissions resolve explicitly, unknown permissions fail, and role name admin grants nothing', async () => {
  const events = new CapturingEvents();
  const store = new InMemoryRoleStore();
  const known = new Set(['catalog.products.read', identityRolesManagePermission]);
  const roles = new RoleAccessService(store, { has: (permission) => known.has(permission) }, events);
  const manager = privilegedActor(identityRolesManagePermission);
  const role = await roles.createRole({ actor: manager, id: 'role-reader', name: 'Reader', permissions: ['catalog.products.read'], now: T0 });
  await roles.assignRoles({ actor: manager, accountId: 'account-1', roleIds: [role.id], now: T0 });
  const resolved = await roles.resolve('account-1');
  assert.equal(resolved.permissions.has('catalog.products.read'), true);
  await assert.rejects(
    () => roles.createRole({ actor: manager, id: 'role-bad', name: 'Bad', permissions: ['unknown.permission'], now: T0 }),
    (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.roleInvalidPermission,
  );

  const fakeAdmin = createActorContext({ accountId: 'admin', sessionId: 's', roleIds: ['admin'], permissions: [], assurance: 'AAL2', authenticatedAt: T0 });
  await assert.rejects(
    () => roles.createRole({ actor: fakeAdmin, id: 'role-admin', name: 'admin', permissions: [], now: T0 }),
    AuthorizationDeniedError,
  );
});

test('privileged identity operations require both permission and AAL2 step-up assurance', async () => {
  const h = makeHarness();
  const account = await h.service.provisionPasswordAccount({ email: 'target@taymex.example', password: PASSWORD });
  const noPermission = privilegedActor('catalog.products.manage');
  await assert.rejects(
    () => h.service.setAccountStatus({ actor: noPermission, accountId: account.id, expectedVersion: account.version, status: 'SUSPENDED' }),
    AuthorizationDeniedError,
  );
  const lowAssurance = privilegedActor(identityAccountsManagePermission, 'AAL1');
  await assert.rejects(
    () => h.service.setAccountStatus({ actor: lowAssurance, accountId: account.id, expectedVersion: account.version, status: 'SUSPENDED' }),
    (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.assuranceRequired,
  );
  const manager = privilegedActor(identityAccountsManagePermission, 'AAL2');
  const changed = await h.service.setAccountStatus({ actor: manager, accountId: account.id, expectedVersion: account.version, status: 'SUSPENDED' });
  assert.equal(changed.status, 'SUSPENDED');

  const sessionManager = privilegedActor(identitySessionsManagePermission, 'AAL2');
  assert.equal(await h.service.revokeAllAccountSessions({ actor: sessionManager, accountId: account.id }), 0);
  assert.doesNotThrow(() => requireAssurance(sessionManager, 'AAL2'));
});

test('AAL2 assurance accepts AAL2 and rejects AAL1 without permission-name shortcuts', () => {
  const high = privilegedActor(identitySessionsManagePermission, 'AAL2');
  const low = privilegedActor(identitySessionsManagePermission, 'AAL1');
  assert.doesNotThrow(() => requireAssurance(high, 'AAL2'));
  assert.throws(() => requireAssurance(low, 'AAL2'), (error) => error instanceof IdentityError && error.code === IDENTITY_ERROR_CODES.assuranceRequired);
});

test('security events and safe views never contain password, raw session secret, reset secret or password hash', async () => {
  const h = makeHarness();
  const account = await h.service.provisionPasswordAccount({ email: 'admin@taymex.example', password: PASSWORD });
  const signed = await h.service.signIn({ email: account.email, password: PASSWORD });
  await h.service.requestPasswordReset(account.email);
  const resetSecret = h.delivery.deliveries.at(-1).secret;
  const credential = await h.repository.findPasswordCredential(account.id);
  const serialized = JSON.stringify(h.events.events);
  for (const secret of [PASSWORD, signed.sessionSecret, resetSecret, credential.passwordHash, account.email]) {
    assert.equal(serialized.includes(secret), false);
  }
});

class InMemoryRoleStore {
  roles = new Map();
  accountRoles = new Map();
  async findRoleById(id) { return this.roles.get(id) ?? null; }
  async createRole(role) {
    if ([...this.roles.values()].some((current) => current.name.toLowerCase() === role.name.toLowerCase())) return 'duplicate-name';
    this.roles.set(role.id, role); return 'created';
  }
  async replaceRoleIfVersionMatches(role, expectedVersion) {
    const current = this.roles.get(role.id);
    if (!current || current.version !== expectedVersion) return 'version-conflict';
    if ([...this.roles.values()].some((other) => other.id !== role.id && other.name.toLowerCase() === role.name.toLowerCase())) return 'duplicate-name';
    this.roles.set(role.id, role); return 'updated';
  }
  async listRoleIdsForAccount(accountId) { return this.accountRoles.get(accountId) ?? []; }
  async replaceAccountRoles(accountId, roleIds) { this.accountRoles.set(accountId, [...roleIds]); }
}

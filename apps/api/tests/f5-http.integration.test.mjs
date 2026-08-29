import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createNodePgPool, PostgresMigrationRunner } from '@taymex/data-postgres';
import { PostgresRoleAccessStore } from '@taymex/identity';
import { createApiApplication } from '../dist/application.js';
import { API_RUNTIME } from '../dist/platform/runtime.js';
import { ProcessRateLimiter } from '../dist/platform/process-rate-limiter.js';

const enabled = process.env.F5_DATABASE_TESTS === '1';
const connectionString = process.env.TEST_DATABASE_URL?.trim();
const migrationDirectory = fileURLToPath(new URL('../../../packages/data-postgres/migrations/', import.meta.url));

if (!enabled || !connectionString) {
  test('F5 HTTP security integration requires guarded PostgreSQL test configuration', { skip: true }, () => {});
} else {
  test('F5 proves real HTTP authentication, authorization, settings, audit, errors and security controls', async () => {
    const migrationPool = await createNodePgPool({ connectionString, applicationName: 'taymex-f5-migrations', max: 2 });
    try {
      await new PostgresMigrationRunner(migrationPool).migrate(migrationDirectory);
    } finally {
      await migrationPool.end();
    }

    process.env.DATABASE_URL = connectionString;
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.taymex.test';
    process.env.NODE_ENV = 'test';
    process.env.BUILD_REVISION = 'f5-http-integration';

    const app = await createApiApplication();
    const server = app.getHttpAdapter().getInstance();
    await server.ready();
    const runtime = app.get(API_RUNTIME);
    const unique = randomUUID().slice(0, 8);
    const normalPassword = 'F5-normal-password-1234';
    const adminPassword = 'F5-admin-password-12345';

    try {
      const normal = await runtime.identity.provisionPasswordAccount({ email: `normal-${unique}@example.test`, password: normalPassword });
      const aal1Privileged = await runtime.identity.provisionPasswordAccount({ email: `aal1-${unique}@example.test`, password: adminPassword });
      const admin = await runtime.identity.provisionPasswordAccount({ email: `admin-${unique}@example.test`, password: adminPassword });

      const accessStore = new PostgresRoleAccessStore(runtime.database);
      const adminRoleId = `f5-admin-${unique}`;
      const now = runtime.clock.now();
      assert.equal(await accessStore.createRole(Object.freeze({
        id: adminRoleId,
        name: `F5 Admin ${unique}`,
        permissions: Object.freeze(['audit.records.read', 'identity.roles.manage', 'settings.values.manage']),
        version: 1,
        createdAt: now,
        updatedAt: now,
      })), 'created');
      assert.equal(await accessStore.replaceAccountRolesIfVersionMatches(aal1Privileged.id, [adminRoleId], 0, now), 'updated');
      assert.equal(await accessStore.replaceAccountRolesIfVersionMatches(admin.id, [adminRoleId], 0, now), 'updated');

      const signedAal1 = await runtime.identity.signIn({ email: aal1Privileged.email, password: adminPassword, correlationId: `aal1-seed-${unique}` });
      const aal1PrivilegedCookie = `__Host-taymex_session=${signedAal1.sessionSecret}`;
      const signedAdmin = await runtime.identity.signIn({ email: admin.email, password: adminPassword, correlationId: `seed-${unique}` });
      await runtime.database.query('UPDATE identity_sessions SET assurance=$2 WHERE id=$1', [signedAdmin.actor.sessionId, 'AAL2']);
      const adminCookie = `__Host-taymex_session=${signedAdmin.sessionSecret}`;

      const signInCorrelation = `client-${unique}-corr`;
      const signIn = await server.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        headers: { origin: 'https://app.taymex.test', 'x-correlation-id': signInCorrelation },
        payload: { email: normal.email, password: normalPassword, clientLabel: 'F5 Browser' },
      });
      assert.equal(signIn.statusCode, 200);
      assert.equal(signIn.headers['x-correlation-id'], signInCorrelation);
      assert.equal(signIn.headers['access-control-allow-origin'], 'https://app.taymex.test');
      assert.match(String(signIn.headers['set-cookie']), /__Host-taymex_session=/u);
      assert.match(String(signIn.headers['set-cookie']), /HttpOnly/u);
      assert.match(String(signIn.headers['set-cookie']), /Secure/u);
      assert.match(String(signIn.headers['set-cookie']), /SameSite=Strict/u);
      assert.equal(signIn.headers['cache-control'], 'no-store');
      assert.equal(signIn.headers['x-content-type-options'], 'nosniff');
      assert.equal(signIn.headers['x-frame-options'], 'DENY');
      assert.ok(!signIn.body.includes(normalPassword));
      assert.ok(!signIn.body.includes('__Host-taymex_session'));
      const normalCookie = String(signIn.headers['set-cookie']).split(';', 1)[0];

      const current = await server.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: normalCookie } });
      assert.equal(current.statusCode, 200);
      assert.deepEqual(current.json(), { accountId: normal.id, assurance: 'AAL1' });

      const permissionDenied = await server.inject({
        method: 'POST', url: '/api/admin/roles', headers: { cookie: normalCookie },
        payload: { id: `permission-denied-${unique}`, name: 'Permission Denied Role', permissions: [] },
      });
      assert.equal(permissionDenied.statusCode, 403);
      assertSafeError(permissionDenied.json(), permissionDenied.headers['x-correlation-id']);

      const aal1Denied = await server.inject({
        method: 'POST', url: '/api/admin/roles', headers: { cookie: aal1PrivilegedCookie },
        payload: { id: `aal1-denied-${unique}`, name: 'AAL1 Denied Role', permissions: [] },
      });
      assert.equal(aal1Denied.statusCode, 403);
      assertSafeError(aal1Denied.json(), aal1Denied.headers['x-correlation-id']);

      const createdRoleId = `viewer-${unique}`;
      const createRole = await server.inject({
        method: 'POST', url: '/api/admin/roles', headers: { cookie: adminCookie },
        payload: { id: createdRoleId, name: `Viewer ${unique}`, permissions: ['catalog.products.read'] },
      });
      assert.equal(createRole.statusCode, 201);
      assert.equal(createRole.json().id, createdRoleId);

      const assignRoles = await server.inject({
        method: 'PUT', url: `/api/admin/accounts/${normal.id}/roles`, headers: { cookie: adminCookie },
        payload: { roleIds: [createdRoleId], expectedVersion: 0 },
      });
      assert.equal(assignRoles.statusCode, 200);
      assert.equal(assignRoles.json().version, 1);

      const projectRef = `f5-http-${unique}`;
      const settingWrite = await server.inject({
        method: 'PUT', url: '/api/admin/settings/catalog.products.defaultPageSize', headers: { cookie: adminCookie },
        payload: { scope: 'project', scopeRef: projectRef, value: 31, expectedVersion: 0, source: 'f5-http-test' },
      });
      assert.equal(settingWrite.statusCode, 200);
      assert.equal(settingWrite.json().version, 1);

      const settingRead = await server.inject({
        method: 'GET', url: `/api/admin/settings/catalog.products.defaultPageSize?projectRef=${encodeURIComponent(projectRef)}`, headers: { cookie: adminCookie },
      });
      assert.equal(settingRead.statusCode, 200);
      assert.equal(settingRead.json().value, 31);

      const auditRead = await server.inject({
        method: 'GET', url: '/api/admin/audit/records?limit=20', headers: { cookie: adminCookie },
      });
      assert.equal(auditRead.statusCode, 200);
      assert.ok(auditRead.json().items.length >= 1);
      assert.ok(auditRead.json().items.some((item) => item.actionCode === 'settings.value.changed'));

      const unknownSetting = await server.inject({
        method: 'GET', url: '/api/admin/settings/not.a.real.setting', headers: { cookie: adminCookie },
      });
      assert.equal(unknownSetting.statusCode, 404);
      assertSafeError(unknownSetting.json(), unknownSetting.headers['x-correlation-id']);
      assert.ok(!unknownSetting.body.includes('canonical generated registry'));

      const invalidCookie = await server.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: '__Host-taymex_session=invalid' } });
      assert.equal(invalidCookie.statusCode, 401);
      assertSafeError(invalidCookie.json(), invalidCookie.headers['x-correlation-id']);

      const readiness = await server.inject({ method: 'GET', url: '/api/health/ready' });
      assert.equal(readiness.statusCode, 200);
      assert.equal(readiness.json().status, 'READY');

      const malformedCorrelation = await server.inject({ method: 'GET', url: '/api/health', headers: { 'x-correlation-id': 'bad' } });
      assert.equal(malformedCorrelation.statusCode, 200);
      assert.notEqual(malformedCorrelation.headers['x-correlation-id'], 'bad');
      assert.match(String(malformedCorrelation.headers['x-correlation-id']), /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u);

      const disallowedCors = await server.inject({ method: 'GET', url: '/api/health', headers: { origin: 'https://evil.example' } });
      assert.notEqual(disallowedCors.headers['access-control-allow-origin'], '*');
      assert.notEqual(disallowedCors.headers['access-control-allow-origin'], 'https://evil.example');

      const wrongContentType = await server.inject({
        method: 'POST', url: '/api/auth/sign-in', headers: { 'content-type': 'text/plain' }, payload: 'not-json',
      });
      assert.ok([400, 415].includes(wrongContentType.statusCode));
      assertSafeError(wrongContentType.json(), wrongContentType.headers['x-correlation-id']);

      const tooLarge = await server.inject({
        method: 'POST', url: '/api/auth/sign-in',
        payload: { email: `oversized-${unique}@example.test`, password: 'x'.repeat(1024 * 1024 + 64) },
      });
      assert.equal(tooLarge.statusCode, 413);
      assert.equal(tooLarge.json().error.code, 'HTTP_PAYLOAD_TOO_LARGE');
      assertSafeError(tooLarge.json(), tooLarge.headers['x-correlation-id']);

      const signOut = await server.inject({ method: 'POST', url: '/api/auth/sign-out', headers: { cookie: normalCookie } });
      assert.equal(signOut.statusCode, 204);
      assert.match(String(signOut.headers['set-cookie']), /Max-Age=0/u);
      const revoked = await server.inject({ method: 'GET', url: '/api/auth/session', headers: { cookie: normalCookie } });
      assert.equal(revoked.statusCode, 401);

      const ratePeer = '203.0.113.77';
      for (let i = 0; i < 10; i += 1) {
        const allowedAttempt = await server.inject({
          method: 'POST',
          url: '/api/auth/sign-in',
          remoteAddress: ratePeer,
          payload: { email: `rate-${unique}-${i}@example.test`, password: 'definitely-wrong-password' },
        });
        assert.notEqual(allowedAttempt.statusCode, 429);
      }
      const rateDenied = await server.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        remoteAddress: ratePeer,
        payload: { email: `rate-${unique}-denied@example.test`, password: 'definitely-wrong-password' },
      });
      assert.equal(rateDenied.statusCode, 429);
      assertSafeError(rateDenied.json(), rateDenied.headers['x-correlation-id']);
      assert.ok(Number(rateDenied.headers['retry-after']) >= 1);

      const limiter = new ProcessRateLimiter(100);
      for (let i = 0; i < 3; i += 1) assert.equal(limiter.consume('same-peer', { limit: 3, windowMs: 60_000 }, new Date()).allowed, true);
      assert.equal(limiter.consume('same-peer', { limit: 3, windowMs: 60_000 }, new Date()).allowed, false);
    } finally {
      await app.close();
    }
  });
}

function assertSafeError(body, correlationId) {
  assert.equal(typeof body, 'object');
  assert.equal(typeof body.error?.code, 'string');
  assert.equal(typeof body.error?.messageKey, 'string');
  assert.equal(body.error?.correlationId, correlationId);
  assert.equal('message' in body.error, false);
  assert.equal('stack' in body.error, false);
}

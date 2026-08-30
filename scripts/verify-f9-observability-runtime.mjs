import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createNodePgPool, PostgresMigrationRunner } from '../packages/data-postgres/dist/index.js';
import { createApiApplication } from '../apps/api/dist/application.js';
import { API_RUNTIME } from '../apps/api/dist/platform/runtime.js';

const connectionString = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!connectionString) {
  console.error('Missing TEST_DATABASE_URL or DATABASE_URL');
  process.exit(1);
}

const migrationDirectory = fileURLToPath(new URL('../packages/data-postgres/migrations/', import.meta.url));

async function main() {
  console.log('=== F9-003 Observability, Diagnostics & Abuse Runtime Proof ===');

  // Step 1: Run database migrations
  const migrationPool = await createNodePgPool({ connectionString, applicationName: 'taymex-f9-obs-migrations', max: 2 });
  try {
    await new PostgresMigrationRunner(migrationPool).migrate(migrationDirectory);
  } finally {
    await migrationPool.end();
  }

  process.env.DATABASE_URL = connectionString;
  process.env.CORS_ALLOWED_ORIGINS = 'https://app.taymex.test';
  process.env.NODE_ENV = 'test';
  process.env.BUILD_REVISION = 'f9-observability-proof-rev';
  process.env.APP_VERSION = '1.0.0-f9-test';
  process.env.NOTIFICATION_OUTBOX_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

  // Step 2: Initialize NestJS / Fastify Application
  const app = await createApiApplication();
  const server = app.getHttpAdapter().getInstance();
  await server.ready();
  const runtime = app.get(API_RUNTIME);

  const capturedLogs = [];
  const originalLog = runtime.logger.log.bind(runtime.logger);
  runtime.logger.log = async (input) => {
    const record = await originalLog(input);
    capturedLogs.push(record);
    return record;
  };

  try {
    console.log('--- 1. Liveness Probe & Process Diagnostics ---');
    const liveRes = await server.inject({ method: 'GET', url: '/api/health' });
    assert.equal(liveRes.statusCode, 200, `Expected 200 for /api/health, got ${liveRes.statusCode}`);
    const liveBody = JSON.parse(liveRes.payload);
    assert.equal(liveBody.status, 'UP');
    assert.equal(liveBody.runtime.service, 'taymex-api');
    assert.equal(liveBody.runtime.buildRevision, 'f9-observability-proof-rev');
    assert.equal(liveBody.runtime.environment, 'test');
    assert.equal(typeof liveBody.checkedAt, 'string');
    assert.equal(JSON.stringify(liveBody).includes('postgres:'), false, 'Liveness response leaked postgres DSN');
    console.log('PASS: Liveness endpoint provides safe process metadata without dependencies or secrets.');

    console.log('--- 2. Readiness Probe & Dependency Diagnostics ---');
    const readyRes = await server.inject({ method: 'GET', url: '/api/health/ready' });
    assert.equal(readyRes.statusCode, 200, `Expected 200 for /api/health/ready, got ${readyRes.statusCode}`);
    const readyBody = JSON.parse(readyRes.payload);
    assert.equal(readyBody.status, 'READY');
    assert.ok(readyBody.checks.some((c) => c.name === 'postgresql' && c.status === 'UP'), 'Readiness missing postgresql check');
    assert.equal(JSON.stringify(readyBody).includes('postgres:'), false, 'Readiness response leaked postgres DSN');
    console.log('PASS: Readiness endpoint proves database dependency status without secret leakage.');

    console.log('--- 3. Correlation ID Propagation & Egress Logging ---');
    const customCorrelationId = `corr-f9-test-${randomUUID()}`;
    const corrRes = await server.inject({
      method: 'GET',
      url: '/api/health',
      headers: {
        'x-correlation-id': customCorrelationId,
      },
    });
    assert.equal(corrRes.statusCode, 200);
    assert.equal(corrRes.headers['x-correlation-id'], customCorrelationId, 'Response header missing propagated correlation ID');

    const corrLog = capturedLogs.find((l) => l.correlationId === customCorrelationId && l.event === 'http.request.completed');
    assert.ok(corrLog, 'Missing structured log record for request with correlation ID');
    assert.equal(corrLog.fields.method, 'GET');
    assert.equal(corrLog.fields.path, '/api/health');
    assert.equal(corrLog.fields.status, 200);
    assert.equal(typeof corrLog.fields.durationMs, 'number');
    console.log('PASS: Correlation ID is preserved from request -> response -> structured log.');

    console.log('--- 4. Safe Error Representation & Stack Masking ---');
    const invalidReqRes = await server.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      headers: {
        'content-type': 'application/json',
      },
      payload: 'invalid-json-body{',
    });
    assert.equal(invalidReqRes.statusCode, 400);
    const errBody = JSON.parse(invalidReqRes.payload);
    assert.ok(errBody.error, 'Response missing error envelope');
    assert.equal(errBody.error.code, 'HTTP_BAD_REQUEST');
    assert.equal(errBody.error.category, 'validation');
    assert.ok(errBody.error.correlationId, 'Error body missing correlation ID');
    assert.equal(errBody.stack, undefined, 'Client error body exposed stack trace');
    console.log('PASS: HTTP error handling masks internal stack traces and provides safe structured descriptors.');

    console.log('--- 5. Security Event Logging & Redaction Proof ---');
    const fakeSecretPassword = 'P@sswordSensitive9988!';
    const fakeEmail = `sec-test-${randomUUID().slice(0, 8)}@example.test`;
    await runtime.identity.provisionPasswordAccount({ email: fakeEmail, password: fakeSecretPassword });

    const failedAuthCorr = `corr-auth-fail-${randomUUID()}`;
    const failAuthRes = await server.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      headers: {
        'x-correlation-id': failedAuthCorr,
        'authorization': `Bearer sensitive-token-${randomUUID()}`,
      },
      payload: {
        email: fakeEmail,
        password: 'WrongPassword123!',
      },
    });
    assert.equal(failAuthRes.statusCode, 401);

    const secEventLog = capturedLogs.find((l) => l.correlationId === failedAuthCorr && l.event === 'identity.sign-in.failed');
    assert.ok(secEventLog, 'Missing security event log for failed authentication');
    assert.equal(secEventLog.level, 'warn');
    assert.equal(secEventLog.fields.reason, 'wrong-password');
    console.log('PASS: Security event log recorded for authentication failure with safe reason code.');

    console.log('--- 6. Global Redaction & Secret Leak Scanner ---');
    const serializedLogs = JSON.stringify(capturedLogs);
    assert.equal(serializedLogs.includes(fakeSecretPassword), false, 'LEAK DETECTED: Real password found in logs!');
    assert.equal(serializedLogs.includes('WrongPassword123!'), false, 'LEAK DETECTED: Input password found in logs!');
    assert.equal(serializedLogs.includes('$argon2id$'), false, 'LEAK DETECTED: Password hash found in logs!');
    assert.equal(serializedLogs.includes('sensitive-token-'), false, 'LEAK DETECTED: Authorization header value found in logs!');
    assert.equal(serializedLogs.includes('postgres:postgres@'), false, 'LEAK DETECTED: Database password found in logs!');
    console.log('PASS: Deep log scan verified zero secrets, tokens, passwords, hashes, or DSNs in emitted records.');

    console.log('--- 7. Local Abuse Controls & Body Size Limit Verification ---');
    const hugePayload = 'X'.repeat(5 * 1024 * 1024); // 5MB payload (exceeds 1MB limit)
    const largeRes = await server.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      headers: {
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ huge: hugePayload }),
    });
    assert.equal(largeRes.statusCode, 413, `Expected 413 for oversized body, got ${largeRes.statusCode}`);
    const largeErr = JSON.parse(largeRes.payload);
    assert.equal(largeErr.error.code, 'HTTP_PAYLOAD_TOO_LARGE');
    console.log('PASS: Fastify body limit strictly rejects oversized requests with 413.');

    console.log('\n=========================================================');
    console.log('PASS: F9 production observability, diagnostics and abuse runtime proof.');
    console.log('=========================================================');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('FAIL: F9 observability runtime proof error:', err);
  process.exit(1);
});

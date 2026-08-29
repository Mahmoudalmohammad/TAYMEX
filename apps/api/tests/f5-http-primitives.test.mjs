import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthorizationDeniedError } from '@engineering-platform/authorization';
import { createSessionCookie, clearSessionCookie, readSessionCookie } from '../dist/platform/session-cookie.js';
import { ProcessRateLimiter } from '../dist/platform/process-rate-limiter.js';
import { normalizeError } from '../dist/platform/http-exception.filter.js';

test('session cookie transport is host-only secure and rejects malformed secrets', () => {
  const secret = 'A'.repeat(43);
  const cookie = createSessionCookie(secret, 3600);
  assert.match(cookie, /^__Host-taymex_session=/u);
  assert.match(cookie, /HttpOnly/u);
  assert.match(cookie, /Secure/u);
  assert.match(cookie, /SameSite=Strict/u);
  assert.match(cookie, /Path=\//u);
  assert.doesNotMatch(cookie, /Domain=/u);
  assert.equal(readSessionCookie(`other=x; ${cookie.split(';', 1)[0]}`), secret);
  assert.equal(readSessionCookie('__Host-taymex_session=short'), null);
  assert.match(clearSessionCookie(), /Max-Age=0/u);
});

test('process HTTP limiter is bounded and denies beyond the configured window quota', () => {
  const limiter = new ProcessRateLimiter(100);
  const now = new Date('2026-08-29T00:00:00.000Z');
  assert.equal(limiter.consume('peer', { limit: 2, windowMs: 60_000 }, now).allowed, true);
  assert.equal(limiter.consume('peer', { limit: 2, windowMs: 60_000 }, now).allowed, true);
  const denied = limiter.consume('peer', { limit: 2, windowMs: 60_000 }, now);
  assert.equal(denied.allowed, false);
  assert.equal(denied.retryAfterSeconds, 60);
  assert.equal(limiter.consume('peer', { limit: 2, windowMs: 60_000 }, new Date(now.getTime() + 60_001)).allowed, true);
});

test('central error normalization maps AuthorizationDeniedError to safe 403 and unknown errors to 500', () => {
  const authError = new AuthorizationDeniedError('subject-123', 'identity.roles.manage');
  const normalizedAuth = normalizeError(authError, 'corr-auth-1');
  assert.equal(normalizedAuth.status, 403);
  assert.equal(normalizedAuth.body.error.code, 'AUTHORIZATION_DENIED');
  assert.equal(normalizedAuth.body.error.category, 'authorization');
  assert.equal(normalizedAuth.body.error.correlationId, 'corr-auth-1');
  assert.equal(typeof normalizedAuth.body.error.messageKey, 'string');
  assert.equal('message' in normalizedAuth.body.error, false);
  assert.equal('stack' in normalizedAuth.body.error, false);

  const unknownError = new Error('database connection secret string');
  const normalizedUnknown = normalizeError(unknownError, 'corr-unk-1');
  assert.equal(normalizedUnknown.status, 500);
  assert.equal(normalizedUnknown.body.error.code, 'HTTP_INTERNAL_ERROR');
  assert.equal(normalizedUnknown.body.error.category, 'internal');
  assert.equal(normalizedUnknown.body.error.correlationId, 'corr-unk-1');
  assert.equal(typeof normalizedUnknown.body.error.messageKey, 'string');
  assert.equal('message' in normalizedUnknown.body.error, false);
  assert.equal('stack' in normalizedUnknown.body.error, false);
});

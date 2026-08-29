import assert from 'node:assert/strict';
import test from 'node:test';
import { createSessionCookie, clearSessionCookie, readSessionCookie } from '../dist/platform/session-cookie.js';
import { ProcessRateLimiter } from '../dist/platform/process-rate-limiter.js';

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

const SESSION_COOKIE_NAME = '__Host-taymex_session';
const MAX_COOKIE_HEADER_LENGTH = 8192;

export function readSessionCookie(header: string | readonly string[] | undefined): string | null {
  const source = Array.isArray(header) ? header.join(';') : header;
  if (typeof source !== 'string' || source.length === 0 || source.length > MAX_COOKIE_HEADER_LENGTH) return null;
  for (const part of source.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    const name = part.slice(0, separator).trim();
    if (name !== SESSION_COOKIE_NAME) continue;
    const value = part.slice(separator + 1).trim();
    if (!/^[A-Za-z0-9_-]{32,512}$/u.test(value)) return null;
    return value;
  }
  return null;
}

export function createSessionCookie(secret: string, maxAgeSeconds: number): string {
  if (!/^[A-Za-z0-9_-]{32,512}$/u.test(secret)) throw new TypeError('Invalid session cookie secret.');
  if (!Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 60 || maxAgeSeconds > 7 * 24 * 60 * 60) {
    throw new RangeError('Session cookie max-age is outside the accepted boundary.');
  }
  return `${SESSION_COOKIE_NAME}=${secret}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

export const sessionCookieName = SESSION_COOKIE_NAME;

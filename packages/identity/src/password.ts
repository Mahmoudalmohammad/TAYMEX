import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { passwordPolicyError } from './errors.js';


export type PasswordPolicy = Readonly<{
  minLength: number;
  maxLength: number;
}>;

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = Object.freeze({ minLength: 12, maxLength: 128 });

export function assertPasswordPolicy(password: string, policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY): string {
  if (typeof password !== 'string') throw passwordPolicyError('password must be a string');
  if (!Number.isSafeInteger(policy.minLength) || !Number.isSafeInteger(policy.maxLength)
      || policy.minLength < 1 || policy.maxLength < policy.minLength) {
    throw new TypeError('Invalid password policy bounds.');
  }
  if (password.length < policy.minLength) throw passwordPolicyError('too short');
  if (password.length > policy.maxLength) throw passwordPolicyError('too long');
  if (password.includes('\0')) throw passwordPolicyError('contains a null character');
  return password;
}

export type ScryptParameters = Readonly<{
  N: number;
  r: number;
  p: number;
  keyLength: number;
  saltLength: number;
  maxmem: number;
}>;

export const DEFAULT_SCRYPT_PARAMETERS: ScryptParameters = Object.freeze({
  N: 32768,
  r: 8,
  p: 1,
  keyLength: 32,
  saltLength: 16,
  maxmem: 64 * 1024 * 1024,
});

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, encodedHash: string): Promise<boolean>;
  needsRehash(encodedHash: string): boolean;
  dummyHash(): Promise<string>;
}

export class ScryptPasswordHasher implements PasswordHasher {
  private cachedDummyHash: Promise<string> | null = null;

  constructor(
    private readonly parameters: ScryptParameters = DEFAULT_SCRYPT_PARAMETERS,
    private readonly passwordPolicy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
  ) {
    validateScryptParameters(parameters);
  }

  async hash(password: string): Promise<string> {
    assertPasswordPolicy(password, this.passwordPolicy);
    const salt = randomBytes(this.parameters.saltLength);
    const key = await derive(password, salt, this.parameters);
    return encode(this.parameters, salt, key);
  }

  async verify(password: string, encodedHash: string): Promise<boolean> {
    if (typeof password !== 'string' || password.length > this.passwordPolicy.maxLength) return false;
    const parsed = parse(encodedHash);
    if (!parsed) return false;
    const actual = await derive(password, parsed.salt, parsed.parameters);
    return actual.length === parsed.key.length && timingSafeEqual(actual, parsed.key);
  }

  needsRehash(encodedHash: string): boolean {
    const parsed = parse(encodedHash);
    if (!parsed) return true;
    const p = parsed.parameters;
    const c = this.parameters;
    return p.N !== c.N || p.r !== c.r || p.p !== c.p || p.keyLength !== c.keyLength || parsed.salt.length !== c.saltLength;
  }

  dummyHash(): Promise<string> {
    this.cachedDummyHash ??= this.hash('TAYMEX-dummy-password-never-used');
    return this.cachedDummyHash;
  }
}

function validateScryptParameters(p: ScryptParameters): void {
  for (const [key, value] of Object.entries(p)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`Invalid scrypt parameter ${key}.`);
  }
  if (!Number.isInteger(Math.log2(p.N))) throw new TypeError('scrypt N must be a power of two.');
  if (p.N > 1_048_576 || p.r > 32 || p.p > 16 || p.keyLength > 64 || p.saltLength > 64 || p.maxmem > 1024 * 1024 * 1024) {
    throw new TypeError('scrypt parameters exceed the accepted safety envelope.');
  }
}

async function derive(password: string, salt: Buffer, p: ScryptParameters): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, p.keyLength, { N: p.N, r: p.r, p: p.p, maxmem: p.maxmem }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(Buffer.from(derivedKey));
    });
  });
}

function encode(p: ScryptParameters, salt: Buffer, key: Buffer): string {
  return `scrypt$v=1$N=${p.N},r=${p.r},p=${p.p},l=${p.keyLength}$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

function parse(encoded: string): { parameters: ScryptParameters; salt: Buffer; key: Buffer } | null {
  const parts = encoded.split('$');
  if (parts.length !== 5 || parts[0] !== 'scrypt' || parts[1] !== 'v=1') return null;
  const values = Object.fromEntries((parts[2] ?? '').split(',').map((entry) => entry.split('=')));
  const N = Number(values.N); const r = Number(values.r); const p = Number(values.p); const keyLength = Number(values.l);
  const salt = Buffer.from(parts[3] ?? '', 'base64url');
  const key = Buffer.from(parts[4] ?? '', 'base64url');
  const parameters: ScryptParameters = { N, r, p, keyLength, saltLength: salt.length, maxmem: Math.max(64 * 1024 * 1024, 256 * N * r) };
  try { validateScryptParameters(parameters); } catch { return null; }
  if (salt.length < 8 || key.length !== keyLength) return null;
  return { parameters, salt, key };
}

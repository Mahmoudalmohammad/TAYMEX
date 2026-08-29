import { ValidationError, requireNonBlank, requireUuid } from '@taymex/foundation';
import { IDENTITY_ERROR_CODES, IdentityError } from './errors.js';

export const ACCOUNT_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export type Account = Readonly<{
  id: string;
  email: string;
  normalizedEmail: string;
  status: AccountStatus;
  emailVerifiedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export function normalizeEmail(value: string): string {
  const email = requireNonBlank(value, 'email', 254).normalize('NFKC').toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError([{ field: 'email', code: 'EMAIL', messageKey: 'errors.validation.email' }]);
  }
  return email;
}

export function createAccount(input: Readonly<{
  id: string;
  email: string;
  now: Date;
  status?: AccountStatus;
}>): Account {
  const id = requireUuid(input.id, 'id');
  const normalizedEmail = normalizeEmail(input.email);
  const now = validDate(input.now, 'now');
  const status = input.status ?? 'ACTIVE';
  if (!(ACCOUNT_STATUSES as readonly string[]).includes(status)) {
    throw new ValidationError([{ field: 'status', code: 'ENUM', messageKey: 'errors.validation.choice' }]);
  }
  return freezeAccount({
    id,
    email: normalizedEmail,
    normalizedEmail,
    status,
    emailVerifiedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

export function changeAccountStatus(
  account: Account,
  input: Readonly<{ expectedVersion: number; status: AccountStatus; now: Date }>,
): Account {
  assertVersion(account, input.expectedVersion);
  if (!(ACCOUNT_STATUSES as readonly string[]).includes(input.status)) {
    throw new ValidationError([{ field: 'status', code: 'ENUM', messageKey: 'errors.validation.choice' }]);
  }
  if (account.status === input.status) return account;
  return freezeAccount({
    ...account,
    status: input.status,
    version: account.version + 1,
    updatedAt: validDate(input.now, 'now'),
  });
}

export function markEmailVerified(
  account: Account,
  input: Readonly<{ expectedVersion: number; now: Date }>,
): Account {
  assertVersion(account, input.expectedVersion);
  if (account.emailVerifiedAt) return account;
  const now = validDate(input.now, 'now');
  return freezeAccount({ ...account, emailVerifiedAt: now, version: account.version + 1, updatedAt: now });
}

export function assertAccountCanAuthenticate(account: Account, requireVerifiedEmail: boolean): void {
  if (account.status !== 'ACTIVE') throw new Error('ACCOUNT_UNAVAILABLE');
  if (requireVerifiedEmail && !account.emailVerifiedAt) throw new Error('EMAIL_UNVERIFIED');
}

function assertVersion(account: Account, expectedVersion: number): void {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1 || account.version !== expectedVersion) {
    throw new IdentityError({
      code: IDENTITY_ERROR_CODES.accountVersionConflict,
      category: 'conflict',
      message: `Account version conflict: expected ${expectedVersion}, current ${account.version}.`,
      safeMessageKey: 'errors.identity.versionConflict',
    });
  }
}

function validDate(value: Date, field: string): Date {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new ValidationError([{ field, code: 'DATE', messageKey: 'errors.validation.date' }]);
  }
  return new Date(value.getTime());
}

function freezeAccount(account: Account): Account {
  return Object.freeze({
    ...account,
    emailVerifiedAt: account.emailVerifiedAt ? new Date(account.emailVerifiedAt.getTime()) : null,
    createdAt: new Date(account.createdAt.getTime()),
    updatedAt: new Date(account.updatedAt.getTime()),
  });
}

import { ApplicationError, ValidationError } from '@taymex/foundation';

export const IDENTITY_ERROR_CODES = {
  authenticationFailed: 'IDENTITY_AUTHENTICATION_FAILED',
  sessionInvalid: 'IDENTITY_SESSION_INVALID',
  accountEmailConflict: 'IDENTITY_ACCOUNT_EMAIL_CONFLICT',
  accountNotFound: 'IDENTITY_ACCOUNT_NOT_FOUND',
  accountVersionConflict: 'IDENTITY_ACCOUNT_VERSION_CONFLICT',
  passwordPolicy: 'IDENTITY_PASSWORD_POLICY',
  currentPasswordInvalid: 'IDENTITY_CURRENT_PASSWORD_INVALID',
  challengeInvalid: 'IDENTITY_CHALLENGE_INVALID',
  roleInvalidPermission: 'IDENTITY_ROLE_INVALID_PERMISSION',
  roleNotFound: 'IDENTITY_ROLE_NOT_FOUND',
  roleVersionConflict: 'IDENTITY_ROLE_VERSION_CONFLICT',
  assuranceRequired: 'IDENTITY_ASSURANCE_REQUIRED',
} as const;

export type IdentityErrorCode = (typeof IDENTITY_ERROR_CODES)[keyof typeof IDENTITY_ERROR_CODES];

export class IdentityError extends ApplicationError {
  readonly code: IdentityErrorCode;

  constructor(options: Readonly<{
    code: IdentityErrorCode;
    category: 'validation' | 'not-found' | 'conflict' | 'authentication' | 'authorization' | 'rate-limit';
    message: string;
    safeMessageKey: string;
    field?: string;
  }>) {
    super(options);
    this.name = 'IdentityError';
    this.code = options.code;
  }
}

export function authenticationFailedError(): IdentityError {
  return new IdentityError({
    code: IDENTITY_ERROR_CODES.authenticationFailed,
    category: 'authentication',
    message: 'Authentication failed.',
    safeMessageKey: 'errors.identity.authenticationFailed',
  });
}

export function sessionInvalidError(): IdentityError {
  return new IdentityError({
    code: IDENTITY_ERROR_CODES.sessionInvalid,
    category: 'authentication',
    message: 'Session secret is invalid, expired, revoked, or no longer authorized.',
    safeMessageKey: 'errors.identity.sessionInvalid',
  });
}

export function passwordPolicyError(reason: string): ValidationError {
  return new ValidationError([
    { field: 'password', code: 'PASSWORD_POLICY', messageKey: 'errors.identity.passwordPolicy' },
  ], `Password policy rejected the candidate: ${reason}`);
}

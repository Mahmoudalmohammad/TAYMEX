import { IDENTITY_ERROR_CODES, IdentityError } from './errors.js';
import type { AuthenticationAssurance } from './session.js';

export type ActorContext = Readonly<{
  kind: 'account';
  id: string;
  accountId: string;
  sessionId: string;
  roleIds: readonly string[];
  permissions: ReadonlySet<string>;
  assurance: AuthenticationAssurance;
  authenticatedAt: Date;
}>;

export function createActorContext(input: Readonly<{
  accountId: string;
  sessionId: string;
  roleIds: readonly string[];
  permissions: Iterable<string>;
  assurance: AuthenticationAssurance;
  authenticatedAt: Date;
}>): ActorContext {
  const roles = Object.freeze([...new Set(input.roleIds)].sort());
  const permissions = new Set([...input.permissions].filter((value) => typeof value === 'string' && value.length > 0));
  return Object.freeze({
    kind: 'account',
    id: input.accountId,
    accountId: input.accountId,
    sessionId: input.sessionId,
    roleIds: roles,
    permissions,
    assurance: input.assurance,
    authenticatedAt: new Date(input.authenticatedAt.getTime()),
  });
}

export function requireAssurance(actor: ActorContext, required: AuthenticationAssurance): void {
  const rank = { AAL1: 1, AAL2: 2 } as const;
  if (rank[actor.assurance] < rank[required]) {
    throw new IdentityError({
      code: IDENTITY_ERROR_CODES.assuranceRequired,
      category: 'authorization',
      message: `Authentication assurance ${required} is required.`,
      safeMessageKey: 'errors.identity.stepUpRequired',
    });
  }
}

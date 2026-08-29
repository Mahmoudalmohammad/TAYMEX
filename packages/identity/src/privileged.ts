import { requirePermission } from '@engineering-platform/authorization';
import type { ActorContext } from './actor.js';
import { requireAssurance } from './actor.js';
import {
  identityAccountsManagePermission,
  identityRolesManagePermission,
  identitySessionsManagePermission,
} from './generated/permissions.generated.js';
import type { AuthenticationAssurance } from './session.js';

export type PrivilegedIdentityOperation = 'manage-accounts' | 'manage-roles' | 'manage-sessions';

export type PrivilegedIdentityPolicy = Readonly<{
  permission: string;
  requiredAssurance: AuthenticationAssurance;
}>;

/** Privileged identity operations require explicit permission plus step-up capable assurance. */
export const PRIVILEGED_IDENTITY_POLICIES: Readonly<Record<PrivilegedIdentityOperation, PrivilegedIdentityPolicy>> = Object.freeze({
  'manage-accounts': Object.freeze({ permission: identityAccountsManagePermission, requiredAssurance: 'AAL2' }),
  'manage-roles': Object.freeze({ permission: identityRolesManagePermission, requiredAssurance: 'AAL2' }),
  'manage-sessions': Object.freeze({ permission: identitySessionsManagePermission, requiredAssurance: 'AAL2' }),
});

export function requirePrivilegedIdentityOperation(actor: ActorContext, operation: PrivilegedIdentityOperation): void {
  const policy = PRIVILEGED_IDENTITY_POLICIES[operation];
  requirePermission(actor, policy.permission);
  requireAssurance(actor, policy.requiredAssurance);
}

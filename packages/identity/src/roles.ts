import { ValidationError, requireNonBlank } from '@taymex/foundation';
import type { ActorContext } from './actor.js';
import type { IdentitySecurityEventSink } from './contracts.js';
import { IDENTITY_ERROR_CODES, IdentityError } from './errors.js';
import { identityRolesChangedEvent } from './generated/events.generated.js';
import { requirePrivilegedIdentityOperation } from './privileged.js';

export interface PermissionCatalog {
  has(permission: string): boolean;
}

export type RoleDefinition = Readonly<{
  id: string;
  name: string;
  permissions: readonly string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export interface RoleAccessStore {
  findRoleById(id: string): Promise<RoleDefinition | null>;
  createRole(role: RoleDefinition): Promise<'created' | 'duplicate-name'>;
  replaceRoleIfVersionMatches(role: RoleDefinition, expectedVersion: number): Promise<'updated' | 'version-conflict' | 'duplicate-name'>;
  listRoleIdsForAccount(accountId: string): Promise<readonly string[]>;
  replaceAccountRoles(accountId: string, roleIds: readonly string[]): Promise<void>;
}

export type ResolvedAccountAccess = Readonly<{
  roleIds: readonly string[];
  permissions: ReadonlySet<string>;
}>;

export class RoleAccessService {
  constructor(
    private readonly store: RoleAccessStore,
    private readonly permissionCatalog: PermissionCatalog,
    private readonly events: IdentitySecurityEventSink,
  ) {}

  async createRole(input: Readonly<{
    actor: ActorContext;
    id: string;
    name: string;
    permissions: readonly string[];
    now: Date;
    correlationId?: string;
  }>): Promise<RoleDefinition> {
    requirePrivilegedIdentityOperation(input.actor, 'manage-roles');
    const role = roleDefinition({ ...input, version: 1, createdAt: input.now, updatedAt: input.now }, this.permissionCatalog);
    const result = await this.store.createRole(role);
    if (result === 'duplicate-name') throw roleConflict('Role name already exists.');
    await this.emitRoleChange(input.actor.accountId, role.id, input.now, input.correlationId);
    return role;
  }

  async replacePermissions(input: Readonly<{
    actor: ActorContext;
    roleId: string;
    expectedVersion: number;
    permissions: readonly string[];
    now: Date;
    correlationId?: string;
  }>): Promise<RoleDefinition> {
    requirePrivilegedIdentityOperation(input.actor, 'manage-roles');
    const existing = await this.store.findRoleById(input.roleId);
    if (!existing) throw roleNotFound();
    if (existing.version !== input.expectedVersion) throw roleVersionConflict();
    const updated = roleDefinition({
      ...existing,
      permissions: input.permissions,
      version: existing.version + 1,
      updatedAt: input.now,
    }, this.permissionCatalog);
    const result = await this.store.replaceRoleIfVersionMatches(updated, input.expectedVersion);
    if (result === 'version-conflict') throw roleVersionConflict();
    if (result === 'duplicate-name') throw roleConflict('Role name already exists.');
    await this.emitRoleChange(input.actor.accountId, updated.id, input.now, input.correlationId);
    return updated;
  }

  async assignRoles(input: Readonly<{
    actor: ActorContext;
    accountId: string;
    roleIds: readonly string[];
    now: Date;
    correlationId?: string;
  }>): Promise<void> {
    requirePrivilegedIdentityOperation(input.actor, 'manage-roles');
    const normalized = [...new Set(input.roleIds)].sort();
    for (const roleId of normalized) {
      if (!(await this.store.findRoleById(roleId))) throw roleNotFound(roleId);
    }
    await this.store.replaceAccountRoles(input.accountId, normalized);
    await this.events.emit(Object.freeze({
      eventId: identityRolesChangedEvent,
      occurredAt: new Date(input.now.getTime()),
      actorAccountId: input.actor.accountId,
      subjectAccountId: input.accountId,
      correlationId: input.correlationId,
    }));
  }

  async resolve(accountId: string): Promise<ResolvedAccountAccess> {
    const roleIds = [...new Set(await this.store.listRoleIdsForAccount(accountId))].sort();
    const permissions = new Set<string>();
    for (const roleId of roleIds) {
      const role = await this.store.findRoleById(roleId);
      if (!role) continue;
      for (const permission of role.permissions) permissions.add(permission);
    }
    return Object.freeze({ roleIds: Object.freeze(roleIds), permissions });
  }

  private async emitRoleChange(actorAccountId: string, roleId: string, now: Date, correlationId?: string): Promise<void> {
    await this.events.emit(Object.freeze({
      eventId: identityRolesChangedEvent,
      occurredAt: new Date(now.getTime()),
      actorAccountId,
      roleId,
      correlationId,
    }));
  }
}

function roleDefinition(
  input: Readonly<{
    id: string; name: string; permissions: readonly string[]; version: number; createdAt: Date; updatedAt: Date;
  }>,
  catalog: PermissionCatalog,
): RoleDefinition {
  const name = requireNonBlank(input.name, 'name', 120);
  if (!Number.isSafeInteger(input.version) || input.version < 1) throw new TypeError('Role version must be positive.');
  const permissions = [...new Set(input.permissions)].sort();
  for (const permission of permissions) {
    if (!catalog.has(permission)) {
      throw new IdentityError({
        code: IDENTITY_ERROR_CODES.roleInvalidPermission,
        category: 'validation',
        message: `Unknown canonical permission: ${permission}`,
        safeMessageKey: 'errors.identity.roleInvalidPermission',
        field: 'permissions',
      });
    }
  }
  return Object.freeze({
    id: input.id,
    name,
    permissions: Object.freeze(permissions),
    version: input.version,
    createdAt: new Date(input.createdAt.getTime()),
    updatedAt: new Date(input.updatedAt.getTime()),
  });
}

function roleNotFound(id?: string): IdentityError {
  return new IdentityError({
    code: IDENTITY_ERROR_CODES.roleNotFound,
    category: 'not-found',
    message: `Role was not found${id ? `: ${id}` : ''}.`,
    safeMessageKey: 'errors.identity.roleNotFound',
  });
}

function roleVersionConflict(): IdentityError {
  return new IdentityError({
    code: IDENTITY_ERROR_CODES.roleVersionConflict,
    category: 'conflict',
    message: 'Role version conflict.',
    safeMessageKey: 'errors.identity.versionConflict',
  });
}

function roleConflict(message: string): ValidationError {
  return new ValidationError([{ field: 'name', code: 'DUPLICATE', messageKey: 'errors.identity.roleNameConflict' }], message);
}

import type { SqlExecutor, TransactionalSqlExecutor } from '@taymex/data-postgres';
import type { AccountRoleSet, RoleAccessStore, RoleDefinition } from '../roles.js';

export class PostgresRoleAccessStore implements RoleAccessStore {
  constructor(private readonly db: TransactionalSqlExecutor) {}

  async findRoleById(id: string): Promise<RoleDefinition | null> {
    return (await this.findRolesByIds([id]))[0] ?? null;
  }

  async findRolesByIds(ids: readonly string[]): Promise<readonly RoleDefinition[]> {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) return Object.freeze([]);
    const result = await this.db.query<RolePermissionRow>(
      `SELECT r.id, r.name, r.version, r.created_at, r.updated_at, p.permission
         FROM identity_roles r
         LEFT JOIN identity_role_permissions p ON p.role_id=r.id
        WHERE r.id = ANY($1::text[])
        ORDER BY r.id, p.permission`,
      [uniqueIds],
    );
    return rolesFromRows(result.rows);
  }

  async createRole(role: RoleDefinition): Promise<'created' | 'duplicate-name'> {
    requireInitialRoleVersion(role.version);
    try {
      return await this.db.transaction(async (tx) => {
        const inserted = await tx.query(
          `INSERT INTO identity_roles (id, name, normalized_name, version, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (normalized_name) DO NOTHING
           RETURNING id`,
          [role.id, role.name, normalizeRoleName(role.name), role.version, role.createdAt, role.updatedAt],
        );
        if (inserted.rowCount !== 1) return 'duplicate-name' as const;
        await insertPermissions(tx, role.id, role.permissions);
        return 'created' as const;
      });
    } catch (error) {
      if (isUniqueViolation(error)) return 'duplicate-name';
      throw error;
    }
  }

  async replaceRoleIfVersionMatches(
    role: RoleDefinition,
    expectedVersion: number,
  ): Promise<'updated' | 'version-conflict' | 'duplicate-name'> {
    requireNextRoleVersion(role.version, expectedVersion);
    try {
      return await this.db.transaction(async (tx) => {
        const updated = await tx.query(
          `UPDATE identity_roles
              SET name=$2, normalized_name=$3, version=version+1, updated_at=$4
            WHERE id=$1 AND version=$5
            RETURNING id`,
          [role.id, role.name, normalizeRoleName(role.name), role.updatedAt, expectedVersion],
        );
        if (updated.rowCount !== 1) return 'version-conflict' as const;
        await tx.query('DELETE FROM identity_role_permissions WHERE role_id=$1', [role.id]);
        await insertPermissions(tx, role.id, role.permissions);
        return 'updated' as const;
      });
    } catch (error) {
      if (isUniqueViolation(error)) return 'duplicate-name';
      throw error;
    }
  }

  async getAccountRoleSet(accountId: string): Promise<AccountRoleSet> {
    const result = await this.db.query<AccountRoleRow>(
      `SELECT s.version, r.role_id
         FROM identity_account_role_sets s
         LEFT JOIN identity_account_roles r ON r.account_id=s.account_id
        WHERE s.account_id=$1
        ORDER BY r.role_id`,
      [accountId],
    );
    if (!result.rows.length) return Object.freeze({ roleIds: Object.freeze([]), version: 0 });
    return Object.freeze({
      roleIds: Object.freeze(result.rows.flatMap((row) => row.role_id === null ? [] : [row.role_id])),
      version: result.rows[0]?.version ?? 0,
    });
  }

  async resolveAccountRoles(accountId: string): Promise<Readonly<{ roleSet: AccountRoleSet; roles: readonly RoleDefinition[] }>> {
    const result = await this.db.query<AccountAccessRow>(
      `SELECT s.version AS role_set_version,
              ar.role_id,
              r.name AS role_name,
              r.version AS role_version,
              r.created_at AS role_created_at,
              r.updated_at AS role_updated_at,
              p.permission
         FROM identity_account_role_sets s
         LEFT JOIN identity_account_roles ar ON ar.account_id=s.account_id
         LEFT JOIN identity_roles r ON r.id=ar.role_id
         LEFT JOIN identity_role_permissions p ON p.role_id=r.id
        WHERE s.account_id=$1
        ORDER BY ar.role_id, p.permission`,
      [accountId],
    );
    if (!result.rows.length) {
      return Object.freeze({
        roleSet: Object.freeze({ roleIds: Object.freeze([]), version: 0 }),
        roles: Object.freeze([]),
      });
    }
    const roleRows: RolePermissionRow[] = [];
    for (const row of result.rows) {
      if (!row.role_id || !row.role_name || row.role_version === null || !row.role_created_at || !row.role_updated_at) continue;
      roleRows.push({
        id: row.role_id,
        name: row.role_name,
        version: row.role_version,
        created_at: row.role_created_at,
        updated_at: row.role_updated_at,
        permission: row.permission,
      });
    }
    const roles = rolesFromRows(roleRows);
    return Object.freeze({
      roleSet: Object.freeze({ roleIds: Object.freeze(roles.map((role) => role.id)), version: result.rows[0]?.role_set_version ?? 0 }),
      roles,
    });
  }

  async replaceAccountRolesIfVersionMatches(
    accountId: string,
    roleIds: readonly string[],
    expectedVersion: number,
    updatedAt: Date,
  ): Promise<'updated' | 'version-conflict'> {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new RangeError('expectedVersion must be a non-negative safe integer.');
    return this.db.transaction(async (tx) => {
      const versionResult = expectedVersion === 0
        ? await tx.query(
            `INSERT INTO identity_account_role_sets (account_id, version, updated_at)
             VALUES ($1,1,$2)
             ON CONFLICT (account_id) DO NOTHING
             RETURNING version`,
            [accountId, updatedAt],
          )
        : await tx.query(
            `UPDATE identity_account_role_sets
                SET version=version+1, updated_at=$3
              WHERE account_id=$1 AND version=$2
              RETURNING version`,
            [accountId, expectedVersion, updatedAt],
          );
      if (versionResult.rowCount !== 1) return 'version-conflict' as const;
      await tx.query('DELETE FROM identity_account_roles WHERE account_id=$1', [accountId]);
      if (roleIds.length) {
        await tx.query(
          `INSERT INTO identity_account_roles (account_id, role_id)
           SELECT $1, role_id FROM unnest($2::text[]) AS role_id`,
          [accountId, roleIds],
        );
      }
      return 'updated' as const;
    });
  }
}

async function insertPermissions(tx: SqlExecutor, roleId: string, permissions: readonly string[]): Promise<void> {
  if (!permissions.length) return;
  await tx.query(
    `INSERT INTO identity_role_permissions (role_id, permission)
     SELECT $1, permission FROM unnest($2::text[]) AS permission`,
    [roleId, permissions],
  );
}

function normalizeRoleName(name: string): string {
  return name.trim().normalize('NFKC').toLowerCase();
}

type RolePermissionRow = Record<string, unknown> & {
  id: string;
  name: string;
  version: number;
  created_at: Date;
  updated_at: Date;
  permission: string | null;
};
type AccountRoleRow = Record<string, unknown> & { version: number; role_id: string | null };
type AccountAccessRow = Record<string, unknown> & {
  role_set_version: number;
  role_id: string | null;
  role_name: string | null;
  role_version: number | null;
  role_created_at: Date | null;
  role_updated_at: Date | null;
  permission: string | null;
};

function rolesFromRows(rows: readonly RolePermissionRow[]): readonly RoleDefinition[] {
  const roles = new Map<string, { row: RolePermissionRow; permissions: string[] }>();
  for (const row of rows) {
    const current = roles.get(row.id) ?? { row, permissions: [] };
    if (row.permission !== null) current.permissions.push(row.permission);
    roles.set(row.id, current);
  }
  return Object.freeze([...roles.values()].map(({ row, permissions }) => Object.freeze({
    id: row.id,
    name: row.name,
    permissions: Object.freeze(permissions),
    version: row.version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })));
}

function requireInitialRoleVersion(version: number): void {
  if (version !== 1) throw new RangeError('Role initial persisted version must be 1.');
}

function requireNextRoleVersion(nextVersion: number, expectedVersion: number): void {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new RangeError('Role expectedVersion must be a positive safe integer.');
  if (nextVersion !== expectedVersion + 1) throw new RangeError('Role next version must equal expectedVersion + 1.');
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505';
}

import type { SqlExecutor, TransactionalSqlExecutor } from '@taymex/data-postgres';
import type { AccountRoleSet, RoleAccessStore, RoleDefinition } from '../roles.js';

export class PostgresRoleAccessStore implements RoleAccessStore {
  constructor(private readonly db: TransactionalSqlExecutor) {}

  async findRoleById(id: string): Promise<RoleDefinition | null> {
    const roleResult = await this.db.query<RoleRow>(
      `SELECT id, name, version, created_at, updated_at FROM identity_roles WHERE id=$1`,
      [id],
    );
    const row = roleResult.rows[0];
    if (!row) return null;
    const permissions = await this.db.query<PermissionRow>(
      `SELECT permission FROM identity_role_permissions WHERE role_id=$1 ORDER BY permission`,
      [id],
    );
    return roleFromRows(row, permissions.rows);
  }

  async createRole(role: RoleDefinition): Promise<'created' | 'duplicate-name'> {
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
    try {
      return await this.db.transaction(async (tx) => {
        const updated = await tx.query(
          `UPDATE identity_roles
              SET name=$2, normalized_name=$3, version=$4, updated_at=$5
            WHERE id=$1 AND version=$6
            RETURNING id`,
          [role.id, role.name, normalizeRoleName(role.name), role.version, role.updatedAt, expectedVersion],
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
    const versionResult = await this.db.query<{ version: number }>(
      `SELECT version FROM identity_account_role_sets WHERE account_id=$1`,
      [accountId],
    );
    const rolesResult = await this.db.query<{ role_id: string }>(
      `SELECT role_id FROM identity_account_roles WHERE account_id=$1 ORDER BY role_id`,
      [accountId],
    );
    return Object.freeze({
      roleIds: Object.freeze(rolesResult.rows.map((row) => row.role_id)),
      version: versionResult.rows[0]?.version ?? 0,
    });
  }

  async replaceAccountRolesIfVersionMatches(
    accountId: string,
    roleIds: readonly string[],
    expectedVersion: number,
    updatedAt: Date,
  ): Promise<'updated' | 'version-conflict'> {
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

type RoleRow = Record<string, unknown> & { id:string; name:string; version:number; created_at:Date; updated_at:Date };
type PermissionRow = Record<string, unknown> & { permission:string };

function roleFromRows(row: RoleRow, permissions: readonly PermissionRow[]): RoleDefinition {
  return Object.freeze({
    id: row.id,
    name: row.name,
    permissions: Object.freeze(permissions.map((item) => item.permission)),
    version: row.version,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505';
}

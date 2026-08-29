import { check, foreignKey, index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const identityAccounts = pgTable('identity_accounts', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  normalizedEmail: text('normalized_email').notNull().unique(),
  status: text('status').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'date' }),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [
  check('identity_accounts_email_nonblank', sql`btrim(${table.email}) <> ''`),
  check('identity_accounts_normalized_email_nonblank', sql`btrim(${table.normalizedEmail}) <> ''`),
  check('identity_accounts_status', sql`${table.status} IN ('ACTIVE','SUSPENDED','DISABLED')`),
  check('identity_accounts_version_positive', sql`${table.version} >= 1`),
  check('identity_accounts_normalized_email', sql`${table.normalizedEmail} = lower(btrim(${table.normalizedEmail}))`),
  check('identity_accounts_time_order', sql`${table.updatedAt} >= ${table.createdAt}`),
  check('identity_accounts_verified_time', sql`${table.emailVerifiedAt} IS NULL OR ${table.emailVerifiedAt} >= ${table.createdAt}`),
]);

export const identityPasswordCredentials = pgTable('identity_password_credentials', {
  accountId: uuid('account_id').primaryKey().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true, mode: 'date' }).notNull(),
  version: integer('version').notNull(),
}, (table) => [
  check('identity_password_credentials_hash_nonblank', sql`btrim(${table.passwordHash}) <> ''`),
  check('identity_password_credentials_version_positive', sql`${table.version} >= 1`)]);

export const identitySessions = pgTable('identity_sessions', {
  id: uuid('id').primaryKey(),
  accountId: uuid('account_id').notNull().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  assurance: text('assurance').notNull(),
  clientLabel: text('client_label'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  rotatedAt: timestamp('rotated_at', { withTimezone: true, mode: 'date' }),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  version: integer('version').notNull(),
}, (table) => [
  check('identity_sessions_token_hash_nonblank', sql`btrim(${table.tokenHash}) <> ''`),
  check('identity_sessions_client_label_nonblank', sql`${table.clientLabel} IS NULL OR btrim(${table.clientLabel}) <> ''`),
  check('identity_sessions_assurance', sql`${table.assurance} IN ('AAL1','AAL2')`),
  check('identity_sessions_version_positive', sql`${table.version} >= 1`),
  check('identity_sessions_expiry_order', sql`${table.expiresAt} > ${table.createdAt}`),
  check('identity_sessions_rotated_time', sql`${table.rotatedAt} IS NULL OR ${table.rotatedAt} >= ${table.createdAt}`),
  check('identity_sessions_revoked_time', sql`${table.revokedAt} IS NULL OR ${table.revokedAt} >= ${table.createdAt}`),
  index('identity_sessions_account_active_idx').on(table.accountId, table.expiresAt.desc()).where(sql`${table.revokedAt} IS NULL`),
]);

export const identityChallenges = pgTable('identity_challenges', {
  id: uuid('id').primaryKey(),
  kind: text('kind').notNull(),
  accountId: uuid('account_id').notNull().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
  version: integer('version').notNull(),
}, (table) => [
  check('identity_challenges_token_hash_nonblank', sql`btrim(${table.tokenHash}) <> ''`),
  check('identity_challenges_kind', sql`${table.kind} IN ('PASSWORD_RESET','EMAIL_VERIFICATION')`),
  check('identity_challenges_version_positive', sql`${table.version} >= 1`),
  check('identity_challenges_expiry_order', sql`${table.expiresAt} > ${table.createdAt}`),
  check('identity_challenges_consumed_time', sql`${table.consumedAt} IS NULL OR (${table.consumedAt} >= ${table.createdAt} AND ${table.consumedAt} < ${table.expiresAt})`),
  index('identity_challenges_account_active_idx').on(table.accountId, table.kind, table.expiresAt.desc()).where(sql`${table.consumedAt} IS NULL`),
]);

export const identityRoles = pgTable('identity_roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [
  check('identity_roles_id_nonblank', sql`btrim(${table.id}) <> ''`),
  check('identity_roles_name_nonblank', sql`btrim(${table.name}) <> ''`),
  check('identity_roles_normalized_name_nonblank', sql`btrim(${table.normalizedName}) <> ''`),
  check('identity_roles_version_positive', sql`${table.version} >= 1`),
  check('identity_roles_normalized_name', sql`${table.normalizedName} = lower(btrim(${table.normalizedName}))`),
  check('identity_roles_time_order', sql`${table.updatedAt} >= ${table.createdAt}`),
]);

export const identityRolePermissions = pgTable('identity_role_permissions', {
  roleId: text('role_id').notNull().references(() => identityRoles.id, { onDelete: 'cascade' }),
  permission: text('permission').notNull(),
}, (table) => [
  primaryKey({ columns: [table.roleId, table.permission] }),
  check('identity_role_permissions_permission_nonblank', sql`btrim(${table.permission}) <> ''`),
]);

export const identityAccountRoleSets = pgTable('identity_account_role_sets', {
  accountId: uuid('account_id').primaryKey().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [check('identity_account_role_sets_persisted_version', sql`${table.version} >= 1`)]);

export const identityAccountRoles = pgTable('identity_account_roles', {
  accountId: uuid('account_id').notNull().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => identityRoles.id, { onDelete: 'restrict' }),
}, (table) => [
  primaryKey({ columns: [table.accountId, table.roleId] }),
  foreignKey({
    name: 'identity_account_roles_role_set_fk',
    columns: [table.accountId],
    foreignColumns: [identityAccountRoleSets.accountId],
  }).onDelete('cascade'),
  index('identity_account_roles_role_idx').on(table.roleId, table.accountId),
]);

import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const identityAccounts = pgTable('identity_accounts', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull(),
  normalizedEmail: text('normalized_email').notNull().unique(),
  status: text('status').notNull(),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'date' }),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const identityPasswordCredentials = pgTable('identity_password_credentials', {
  accountId: uuid('account_id').primaryKey().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true, mode: 'date' }).notNull(),
  version: integer('version').notNull(),
});

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
}, (table) => [index('identity_sessions_account_idx').on(table.accountId, table.expiresAt)]);

export const identityChallenges = pgTable('identity_challenges', {
  id: uuid('id').primaryKey(),
  kind: text('kind').notNull(),
  accountId: uuid('account_id').notNull().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
  version: integer('version').notNull(),
}, (table) => [index('identity_challenges_account_idx').on(table.accountId, table.kind, table.expiresAt)]);

export const identityRoles = pgTable('identity_roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const identityRolePermissions = pgTable('identity_role_permissions', {
  roleId: text('role_id').notNull().references(() => identityRoles.id, { onDelete: 'cascade' }),
  permission: text('permission').notNull(),
}, (table) => [primaryKey({ columns: [table.roleId, table.permission] })]);

export const identityAccountRoleSets = pgTable('identity_account_role_sets', {
  accountId: uuid('account_id').primaryKey().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const identityAccountRoles = pgTable('identity_account_roles', {
  accountId: uuid('account_id').notNull().references(() => identityAccounts.id, { onDelete: 'cascade' }),
  roleId: text('role_id').notNull().references(() => identityRoles.id, { onDelete: 'restrict' }),
}, (table) => [
  primaryKey({ columns: [table.accountId, table.roleId] }),
  index('identity_account_roles_role_idx').on(table.roleId, table.accountId),
]);

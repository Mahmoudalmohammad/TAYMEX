import { check, foreignKey, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
export const runtimeSettingValues = pgTable('runtime_setting_values', {
  settingKey: text('setting_key').notNull(),
  scope: text('scope').notNull(),
  scopeRef: text('scope_ref').notNull().default(''),
  valueJson: jsonb('value_json').notNull(),
  version: integer('version').notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true, mode: 'date' }).notNull(),
  savedByAccountId: uuid('saved_by_account_id').notNull(),
  source: text('source').notNull(),
}, (table) => [
  primaryKey({ columns: [table.settingKey, table.scope, table.scopeRef] }),
  check('runtime_setting_values_scope', sql`${table.scope} IN ('platform','project','environment','tenant','user','emergency')`),
  check('runtime_setting_values_version_positive', sql`${table.version} >= 1`),
  check('runtime_setting_values_key_nonblank', sql`btrim(${table.settingKey}) <> ''`),
  check('runtime_setting_values_source_nonblank', sql`btrim(${table.source}) <> ''`),
]);

export const runtimeSettingHistory = pgTable('runtime_setting_history', {
  settingKey: text('setting_key').notNull(),
  scope: text('scope').notNull(),
  scopeRef: text('scope_ref').notNull().default(''),
  version: integer('version').notNull(),
  valueJson: jsonb('value_json').notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true, mode: 'date' }).notNull(),
  savedByAccountId: uuid('saved_by_account_id').notNull(),
  source: text('source').notNull(),
  operation: text('operation').notNull(),
  rolledBackFromVersion: integer('rolled_back_from_version'),
}, (table) => [
  primaryKey({ columns: [table.settingKey, table.scope, table.scopeRef, table.version] }),
  check('runtime_setting_history_scope', sql`${table.scope} IN ('platform','project','environment','tenant','user','emergency')`),
  check('runtime_setting_history_version_positive', sql`${table.version} >= 1`),
  check('runtime_setting_history_operation', sql`${table.operation} IN ('write','rollback')`),
  check('runtime_setting_history_rollback_version', sql`${table.rolledBackFromVersion} IS NULL OR ${table.rolledBackFromVersion} >= 1`),
  check('runtime_setting_history_key_nonblank', sql`btrim(${table.settingKey}) <> ''`),
  check('runtime_setting_history_source_nonblank', sql`btrim(${table.source}) <> ''`),
  check('runtime_setting_history_operation_consistency', sql`(${table.operation} = 'write' AND ${table.rolledBackFromVersion} IS NULL) OR (${table.operation} = 'rollback' AND ${table.rolledBackFromVersion} IS NOT NULL)`),
  index('runtime_setting_history_recent_idx').on(table.settingKey, table.scope, table.scopeRef, table.version.desc()),
]);

export const runtimeSettingApplication = pgTable('runtime_setting_application', {
  settingKey: text('setting_key').notNull(),
  scope: text('scope').notNull(),
  scopeRef: text('scope_ref').notNull().default(''),
  appliedVersion: integer('applied_version').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.settingKey, table.scope, table.scopeRef] }),
  check('runtime_setting_application_scope', sql`${table.scope} IN ('platform','project','environment','tenant','user','emergency')`),
  check('runtime_setting_application_version_positive', sql`${table.appliedVersion} >= 1`),
  foreignKey({
    name: 'runtime_setting_application_history_fk',
    columns: [table.settingKey, table.scope, table.scopeRef, table.appliedVersion],
    foreignColumns: [runtimeSettingHistory.settingKey, runtimeSettingHistory.scope, runtimeSettingHistory.scopeRef, runtimeSettingHistory.version],
  }).onDelete('restrict'),
]);

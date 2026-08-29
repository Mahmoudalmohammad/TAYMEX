import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const runtimeSettingValues = pgTable('runtime_setting_values', {
  settingKey: text('setting_key').notNull(),
  scope: text('scope').notNull(),
  scopeRef: text('scope_ref').notNull().default(''),
  valueJson: jsonb('value_json').notNull(),
  version: integer('version').notNull(),
  savedAt: timestamp('saved_at', { withTimezone: true, mode: 'date' }).notNull(),
  savedByAccountId: uuid('saved_by_account_id').notNull(),
  source: text('source').notNull(),
}, (table) => [primaryKey({ columns: [table.settingKey, table.scope, table.scopeRef] })]);

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
  index('runtime_setting_history_recent_idx').on(table.settingKey, table.scope, table.scopeRef, table.version),
]);

export const runtimeSettingApplication = pgTable('runtime_setting_application', {
  settingKey: text('setting_key').notNull(),
  scope: text('scope').notNull(),
  scopeRef: text('scope_ref').notNull().default(''),
  appliedVersion: integer('applied_version').notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.settingKey, table.scope, table.scopeRef] })]);

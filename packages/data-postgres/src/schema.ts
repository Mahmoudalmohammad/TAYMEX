import { char, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const foundationSchemaMigrations = pgTable('foundation_schema_migrations', {
  version: text('version').primaryKey(),
  fileName: text('file_name').notNull().unique(),
  checksum: char('checksum', { length: 64 }).notNull(),
  appliedAt: timestamp('applied_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  executionMs: integer('execution_ms').notNull(),
}, (table) => [
  check('foundation_schema_migrations_version_format', sql`${table.version} ~ '^[0-9]{4,}$'`),
  check('foundation_schema_migrations_file_name_format', sql`${table.fileName} ~ '^[0-9]{4,}_[a-z0-9][a-z0-9_-]*\\.sql$'`),
  check('foundation_schema_migrations_checksum_format', sql`${table.checksum} ~ '^[a-f0-9]{64}$'`),
  check('foundation_schema_migrations_execution_nonnegative', sql`${table.executionMs} >= 0`),
]);

export const foundationIdempotencyKeys = pgTable('foundation_idempotency_keys', {
  operation: text('operation').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: char('request_hash', { length: 64 }).notNull(),
  claimGeneration: integer('claim_generation').notNull().default(1),
  status: text('status').notNull(),
  responseJson: jsonb('response_json'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.operation, table.idempotencyKey] }),
  check('foundation_idempotency_request_hash_format', sql`${table.requestHash} ~ '^[a-f0-9]{64}$'`),
  check('foundation_idempotency_claim_generation_positive', sql`${table.claimGeneration} >= 1`),
  check('foundation_idempotency_status', sql`${table.status} IN ('IN_PROGRESS','COMPLETED')`),
  check('foundation_idempotency_operation_bounds', sql`char_length(btrim(${table.operation})) BETWEEN 1 AND 128`),
  check('foundation_idempotency_key_bounds', sql`char_length(btrim(${table.idempotencyKey})) BETWEEN 1 AND 256`),
  check('foundation_idempotency_expiry_order', sql`${table.expiresAt} > ${table.createdAt}`),
  check('foundation_idempotency_time_order', sql`${table.updatedAt} >= ${table.createdAt}`),
  check('foundation_idempotency_response_state', sql`(${table.status} = 'IN_PROGRESS' AND ${table.responseJson} IS NULL) OR ${table.status} = 'COMPLETED'`),
  index('foundation_idempotency_expiry_idx').on(table.expiresAt),
]);

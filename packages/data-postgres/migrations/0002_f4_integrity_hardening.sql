-- TAYMEX F4 additive integrity hardening. PostgreSQL 18.
-- This migration adds constraints/fencing only; it does not drop or rewrite prior state.

ALTER TABLE foundation_schema_migrations
  ADD CONSTRAINT foundation_schema_migrations_version_format CHECK (version ~ '^[0-9]{4,}$'),
  ADD CONSTRAINT foundation_schema_migrations_file_name_format CHECK (file_name ~ '^[0-9]{4,}_[a-z0-9][a-z0-9_-]*\.sql$');

ALTER TABLE identity_accounts
  ADD CONSTRAINT identity_accounts_email_nonblank CHECK (btrim(email) <> ''),
  ADD CONSTRAINT identity_accounts_normalized_email_nonblank CHECK (btrim(normalized_email) <> ''),
  ADD CONSTRAINT identity_accounts_time_order CHECK (updated_at >= created_at),
  ADD CONSTRAINT identity_accounts_verified_time CHECK (email_verified_at IS NULL OR email_verified_at >= created_at);

ALTER TABLE identity_password_credentials
  ADD CONSTRAINT identity_password_credentials_hash_nonblank CHECK (btrim(password_hash) <> '');

ALTER TABLE identity_sessions
  ADD CONSTRAINT identity_sessions_token_hash_nonblank CHECK (btrim(token_hash) <> ''),
  ADD CONSTRAINT identity_sessions_client_label_nonblank CHECK (client_label IS NULL OR btrim(client_label) <> ''),
  ADD CONSTRAINT identity_sessions_rotated_time CHECK (rotated_at IS NULL OR rotated_at >= created_at),
  ADD CONSTRAINT identity_sessions_revoked_time CHECK (revoked_at IS NULL OR revoked_at >= created_at);

ALTER TABLE identity_challenges
  ADD CONSTRAINT identity_challenges_token_hash_nonblank CHECK (btrim(token_hash) <> ''),
  ADD CONSTRAINT identity_challenges_consumed_time CHECK (
    consumed_at IS NULL OR (consumed_at >= created_at AND consumed_at < expires_at)
  );

ALTER TABLE identity_roles
  ADD CONSTRAINT identity_roles_id_nonblank CHECK (btrim(id) <> ''),
  ADD CONSTRAINT identity_roles_name_nonblank CHECK (btrim(name) <> ''),
  ADD CONSTRAINT identity_roles_normalized_name_nonblank CHECK (btrim(normalized_name) <> ''),
  ADD CONSTRAINT identity_roles_time_order CHECK (updated_at >= created_at);

ALTER TABLE identity_role_permissions
  ADD CONSTRAINT identity_role_permissions_permission_nonblank CHECK (btrim(permission) <> '');

ALTER TABLE identity_account_role_sets
  ADD CONSTRAINT identity_account_role_sets_persisted_version CHECK (version >= 1);

ALTER TABLE identity_account_roles
  ADD CONSTRAINT identity_account_roles_role_set_fk
  FOREIGN KEY (account_id) REFERENCES identity_account_role_sets(account_id) ON DELETE CASCADE;

ALTER TABLE runtime_setting_values
  ADD CONSTRAINT runtime_setting_values_key_nonblank CHECK (btrim(setting_key) <> ''),
  ADD CONSTRAINT runtime_setting_values_source_nonblank CHECK (btrim(source) <> '');

ALTER TABLE runtime_setting_history
  ADD CONSTRAINT runtime_setting_history_key_nonblank CHECK (btrim(setting_key) <> ''),
  ADD CONSTRAINT runtime_setting_history_source_nonblank CHECK (btrim(source) <> ''),
  ADD CONSTRAINT runtime_setting_history_operation_consistency CHECK (
    (operation = 'write' AND rolled_back_from_version IS NULL)
    OR (operation = 'rollback' AND rolled_back_from_version IS NOT NULL)
  );

ALTER TABLE runtime_setting_application
  ADD CONSTRAINT runtime_setting_application_history_fk
  FOREIGN KEY (setting_key, scope, scope_ref, applied_version)
  REFERENCES runtime_setting_history(setting_key, scope, scope_ref, version)
  ON DELETE RESTRICT;

ALTER TABLE audit_records
  ADD CONSTRAINT audit_records_action_nonblank CHECK (btrim(action_code) <> ''),
  ADD CONSTRAINT audit_records_action_format CHECK (action_code ~ '^[a-z][a-z0-9.-]+$'),
  ADD CONSTRAINT audit_records_actor_nonblank CHECK (btrim(actor_id) <> ''),
  ADD CONSTRAINT audit_records_actor_session_consistency CHECK (actor_session_id IS NULL OR actor_kind = 'account'),
  ADD CONSTRAINT audit_records_subject_pair CHECK ((subject_type IS NULL) = (subject_id IS NULL)),
  ADD CONSTRAINT audit_records_resource_pair CHECK ((resource_type IS NULL) = (resource_id IS NULL)),
  ADD CONSTRAINT audit_records_correlation_nonblank CHECK (correlation_id IS NULL OR btrim(correlation_id) <> '');

ALTER TABLE foundation_idempotency_keys
  ADD COLUMN claim_generation integer NOT NULL DEFAULT 1,
  ADD CONSTRAINT foundation_idempotency_claim_generation_positive CHECK (claim_generation >= 1),
  ADD CONSTRAINT foundation_idempotency_operation_bounds CHECK (char_length(btrim(operation)) BETWEEN 1 AND 128),
  ADD CONSTRAINT foundation_idempotency_key_bounds CHECK (char_length(btrim(idempotency_key)) BETWEEN 1 AND 256),
  ADD CONSTRAINT foundation_idempotency_time_order CHECK (updated_at >= created_at);

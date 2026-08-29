-- TAYMEX F4 additive foundation migration. PostgreSQL 18.

CREATE TABLE identity_accounts (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  normalized_email text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
  email_verified_at timestamptz NULL,
  version integer NOT NULL CHECK (version >= 1),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (normalized_email = lower(btrim(normalized_email)))
);

CREATE TABLE identity_password_credentials (
  account_id uuid PRIMARY KEY REFERENCES identity_accounts(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  changed_at timestamptz NOT NULL,
  version integer NOT NULL CHECK (version >= 1)
);

CREATE TABLE identity_sessions (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES identity_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  assurance text NOT NULL CHECK (assurance IN ('AAL1', 'AAL2')),
  client_label text NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  rotated_at timestamptz NULL,
  revoked_at timestamptz NULL,
  version integer NOT NULL CHECK (version >= 1),
  CHECK (expires_at > created_at)
);
CREATE INDEX identity_sessions_account_active_idx
  ON identity_sessions (account_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE identity_challenges (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('PASSWORD_RESET', 'EMAIL_VERIFICATION')),
  account_id uuid NOT NULL REFERENCES identity_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz NULL,
  version integer NOT NULL CHECK (version >= 1),
  CHECK (expires_at > created_at)
);
CREATE INDEX identity_challenges_account_active_idx
  ON identity_challenges (account_id, kind, expires_at DESC)
  WHERE consumed_at IS NULL;

CREATE TABLE identity_roles (
  id text PRIMARY KEY,
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  version integer NOT NULL CHECK (version >= 1),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CHECK (normalized_name = lower(btrim(normalized_name)))
);

CREATE TABLE identity_role_permissions (
  role_id text NOT NULL REFERENCES identity_roles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  PRIMARY KEY (role_id, permission)
);

CREATE TABLE identity_account_role_sets (
  account_id uuid PRIMARY KEY REFERENCES identity_accounts(id) ON DELETE CASCADE,
  version integer NOT NULL CHECK (version >= 0),
  updated_at timestamptz NOT NULL
);

CREATE TABLE identity_account_roles (
  account_id uuid NOT NULL REFERENCES identity_accounts(id) ON DELETE CASCADE,
  role_id text NOT NULL REFERENCES identity_roles(id) ON DELETE RESTRICT,
  PRIMARY KEY (account_id, role_id)
);
CREATE INDEX identity_account_roles_role_idx ON identity_account_roles (role_id, account_id);

CREATE TABLE runtime_setting_values (
  setting_key text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('platform', 'project', 'environment', 'tenant', 'user', 'emergency')),
  scope_ref text NOT NULL DEFAULT '',
  value_json jsonb NOT NULL,
  version integer NOT NULL CHECK (version >= 1),
  saved_at timestamptz NOT NULL,
  saved_by_account_id uuid NOT NULL REFERENCES identity_accounts(id) ON DELETE RESTRICT,
  source text NOT NULL,
  PRIMARY KEY (setting_key, scope, scope_ref)
);

CREATE TABLE runtime_setting_history (
  setting_key text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('platform', 'project', 'environment', 'tenant', 'user', 'emergency')),
  scope_ref text NOT NULL DEFAULT '',
  version integer NOT NULL CHECK (version >= 1),
  value_json jsonb NOT NULL,
  saved_at timestamptz NOT NULL,
  saved_by_account_id uuid NOT NULL REFERENCES identity_accounts(id) ON DELETE RESTRICT,
  source text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('write', 'rollback')),
  rolled_back_from_version integer NULL CHECK (rolled_back_from_version IS NULL OR rolled_back_from_version >= 1),
  PRIMARY KEY (setting_key, scope, scope_ref, version)
);
CREATE INDEX runtime_setting_history_recent_idx
  ON runtime_setting_history (setting_key, scope, scope_ref, version DESC);

CREATE TABLE runtime_setting_application (
  setting_key text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('platform', 'project', 'environment', 'tenant', 'user', 'emergency')),
  scope_ref text NOT NULL DEFAULT '',
  applied_version integer NOT NULL CHECK (applied_version >= 1),
  applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (setting_key, scope, scope_ref)
);

CREATE TABLE audit_records (
  id uuid PRIMARY KEY,
  occurred_at timestamptz NOT NULL,
  action_code text NOT NULL,
  category text NOT NULL CHECK (category IN ('security', 'settings', 'administration', 'domain', 'data-access', 'system')),
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  actor_kind text NOT NULL CHECK (actor_kind IN ('account', 'system')),
  actor_id text NOT NULL,
  actor_session_id text NULL,
  subject_type text NULL,
  subject_id text NULL,
  resource_type text NULL,
  resource_id text NULL,
  changes_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  correlation_id text NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_records_occurred_idx ON audit_records (occurred_at DESC, id DESC);
CREATE INDEX audit_records_action_idx ON audit_records (action_code, occurred_at DESC);
CREATE INDEX audit_records_actor_idx ON audit_records (actor_id, occurred_at DESC);
CREATE INDEX audit_records_resource_idx ON audit_records (resource_type, resource_id, occurred_at DESC);
CREATE INDEX audit_records_correlation_idx ON audit_records (correlation_id) WHERE correlation_id IS NOT NULL;

CREATE FUNCTION taymex_reject_audit_mutation() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_records is append-only' USING ERRCODE = '55000';
END;
$$;
CREATE TRIGGER audit_records_no_update
  BEFORE UPDATE ON audit_records FOR EACH ROW EXECUTE FUNCTION taymex_reject_audit_mutation();
CREATE TRIGGER audit_records_no_delete
  BEFORE DELETE ON audit_records FOR EACH ROW EXECUTE FUNCTION taymex_reject_audit_mutation();

CREATE TABLE foundation_idempotency_keys (
  operation text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash char(64) NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
  response_json jsonb NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (operation, idempotency_key),
  CHECK (expires_at > created_at),
  CHECK ((status = 'IN_PROGRESS' AND response_json IS NULL) OR status = 'COMPLETED')
);
CREATE INDEX foundation_idempotency_expiry_idx ON foundation_idempotency_keys (expires_at);

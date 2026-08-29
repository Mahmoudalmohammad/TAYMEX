# TAYMEX Foundation F4 — Data & Transaction Closure Report

**Stage:** F4 — Data & Transaction Foundation  
**Final stage decision:** **CLOSED**
**Next foundation stage:** `F5`
**Broad feature expansion:** remains **BLOCKED** until the full Foundation Readiness Gate is satisfied.

## 1. Closure decision

F4 is closed because the data foundation is no longer supported only by local fake-executor/unit evidence. The guarded integration harness has executed successfully against a real PostgreSQL 18.6 runtime with zero skipped tests, and the migration CLI has been proven from a clean disposable database.

The following capabilities are therefore promoted to `PROVEN`:

- `data.postgresql-runtime`;
- `data.migrations-integrity`;
- `data.transactions-concurrency-idempotency`.

No unrelated capability is promoted by implication. HTTP authentication/authorization, API transport security, production observability delivery, remote merge authority, performance proof, full UI proof, and operations remain owned by their declared later stages.

Runtime proof is recorded in `docs/evidence/F4_POSTGRESQL18_PROOF.md`.

## 2. Canonical persistence model

F4 establishes one PostgreSQL persistence path for shared foundation state:

- PostgreSQL 18;
- `@taymex/data-postgres` as the shared database/transaction runtime;
- Drizzle declarations as compiler/repository-indexable model projection;
- additive SQL migrations as applied database history;
- exactly one declared module owner per persisted table;
- no in-memory production fallback exported by normal package entry points.

The structural verifier confirms parity across:

- **14 tables** in SQL, Drizzle, and module ownership;
- column names and fundamental SQL types;
- **10 named indexes**;
- **37 named F4 hardening constraints**;
- named cross-table foreign keys;
- append-only audit triggers.

Disagreement between these truth surfaces is a blocking defect rather than a precedence choice that is silently ignored.

## 3. Migrations and integrity

Applied migrations are:

```text
0001_foundation.sql
0002_f4_integrity_hardening.sql
```

The migration runtime provides:

- ordered migration discovery;
- strict filename validation;
- advisory locking;
- per-migration transaction execution;
- rollback on failure;
- checksum persistence;
- checksum drift rejection;
- deleted/renamed applied-migration rejection;
- rejection of destructive F4 migrations unless separately authorized;
- destruction rather than pool reuse when a connection has unknown state after rollback failure.

The clean PostgreSQL proof executed `0001` and `0002` on the first run and `[]` on the immediate second run.

## 4. Transactions and optimistic concurrency

`PostgresDatabase.transaction()` is the shared transaction boundary. Services that require state mutation plus durable side effects do not receive an optional transaction fallback; the transaction boundary is mandatory.

Persisted optimistic mutation follows one contract:

```text
expectedVersion = N
proposedVersion = N + 1
```

Two cases are deliberately distinct:

1. a structurally valid stale writer proposes `N + 1` after another writer has already won → database CAS returns `version-conflict`;
2. a caller attempts an invalid version jump such as `N -> N + 2` → precondition validation rejects the command before SQL.

This behavior is covered for account/session state in the PostgreSQL 18 integration harness and is consistent with the hardened identity/role/settings persistence contracts.

## 5. Idempotency

The persisted idempotency primitive supports:

```text
ABSENT -> IN_PROGRESS -> COMPLETED
```

with:

- canonical request hashing;
- same-key/same-request in-progress detection;
- same-key/different-request conflict;
- completed response replay;
- expiration/reclaim behavior;
- claim-generation fencing so a stale worker cannot complete a later reclaimed claim.

The real PostgreSQL integration harness proves started/in-progress/conflict/replay behavior.

## 6. Audit durability and rollback coupling

Audit is append-only at the database layer. `UPDATE` and `DELETE` are rejected by database triggers, not merely by TypeScript interfaces.

The F4 runtime proof also demonstrates rollback coupling: when state and audit are performed inside one outer transaction, failure does not leave one committed without the other.

This closes the durable-storage portion of `audit.core`; HTTP audit query/administration remains F5 work and therefore `audit.core` remains `INTEGRATED`, not `PROVEN`.

## 7. Settings and identity durability pulled through F4

F4 proves the database sub-paths required by earlier stages without falsely closing their transport-level work:

- Identity accounts/credentials/sessions/challenges use durable PostgreSQL CAS paths;
- role/account-role persistence uses set-based reads and versioned assignment;
- settings current/history/application-state persistence, CAS, rollback, and audit coupling execute against PostgreSQL;
- database readiness executes against real PostgreSQL and detects loss of availability.

The remaining Identity/Authorization/Settings/Audit/Observability work is explicitly assigned to F5/F9 and remains visible in the foundation manifest.

## 8. Bootstrap artifact/toolchain correction discovered during proof

The external validation run exposed an independent-consumer bootstrap failure: packed platform artifacts such as app-shell/ui-patterns depended on `@engineering-platform/ui@0.1.0`, which could fall through to the public npm registry even though a locked local UI artifact existed.

The correction is systemic rather than one-off:

- every locked `@engineering-platform/*` artifact has a root bootstrap override to its locked `.tgz`;
- runtime lock identity/hash/size is verified;
- the structural verifier checks the full locked artifact dependency closure so a future internal dependency cannot silently fall through to the public registry;
- the UI source fix was made in the platform source workspace and the consumer artifact was rebuilt rather than hand-edited;
- build scripts use one `allowBuilds` policy;
- Node runtime/profile/type definitions are aligned to the Node 24 foundation line.

## 9. Executed evidence

### Real local operator runtime evidence

- Node `24.14.0`;
- pnpm `11.24.0`;
- PostgreSQL `18.6` / server version number `180006`;
- workspace install/build: PASS;
- backend package tests: **65 passed, 0 failed**;
- PostgreSQL 18 guarded integration test: **1 passed, 0 failed, 0 skipped**;
- clean migration run: `executed=["0001","0002"]`;
- immediate second migration run: `executed=[]`.

### Structural/governance evidence

The final closure validates:

- context files preserved verbatim;
- SQL/Drizzle/module ownership parity;
- generated settings and permission bindings;
- project profile;
- independent consumer boundary;
- runtime artifact lock closure;
- Node/pnpm toolchain truth;
- trust-root local verification;
- task governance over the complete final repair delta.

## 10. Explicit non-claims

F4 closure does **not** mean:

- the complete application foundation is ready;
- Products may expand broadly;
- secure browser auth/cookie/token transport is proven;
- route authorization is proven;
- API contracts are complete;
- performance budgets/query-plan proof are complete;
- full UI/accessibility/visual coverage is complete;
- production logs/metrics, delivery, backup/restore, or remote merge rules are proven.

Those remain in F5–F10.

## 11. Final F4 status

```text
F4 data runtime                         PROVEN
F4 migrations/integrity                PROVEN
F4 transaction/concurrency/idempotency PROVEN
Foundation current stage               F5
Foundation readiness                   BLOCKED
Products validation slice              FROZEN_FOR_FOUNDATION_PROOF
```

**F4 is closed without weakening later-stage proof requirements.**

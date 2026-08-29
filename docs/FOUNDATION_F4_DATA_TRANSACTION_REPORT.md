# TAYMEX Foundation F4 — Data & Transaction Implementation Report

**Stage:** F4 — Data & Transaction Foundation  
**Result in this execution environment:** IMPLEMENTED / locally integrated where possible; **not PROVEN**  
**Foundation stage after this work:** remains `F4` until PostgreSQL 18 integration evidence passes.

## 1. Scope implemented

F4 establishes one PostgreSQL persistence path rather than allowing each feature to choose its own database conventions.

Implemented:

- `@taymex/data-postgres` as the shared PostgreSQL transaction/runtime foundation;
- pinned stable persistence dependencies: `drizzle-orm 0.45.2` and `pg 8.23.0`;
- Drizzle PostgreSQL declarations as repository-indexable schema/model truth;
- additive SQL migration `0001_foundation.sql` as applied database-state history;
- ordered/checksummed migration loader and runner;
- PostgreSQL advisory migration lock;
- transaction-per-migration execution with rollback on failure;
- applied-migration checksum drift rejection;
- executable `db:migrate` path requiring `DATABASE_URL`;
- bounded node-postgres connection-pool adapter;
- shared `PostgresDatabase` transaction boundary with `AsyncLocalStorage` nested-transaction reuse;
- PostgreSQL readiness check wired into API readiness while liveness remains process-only;
- durable Identity account/credential/session/challenge repository;
- durable Role/Permission and account-role-set repository;
- durable Settings current/history/application-state store;
- durable append-only Audit store;
- persisted idempotency claim/replay/conflict primitive;
- database-side CAS/expected-version predicates for mutable state;
- database constraints and indexes for the persisted F4 tables;
- database triggers rejecting `UPDATE` and `DELETE` on `audit_records`;
- optional atomic boundary used by Identity, Role administration, and Settings so state changes and durable audit writes can share one outer database transaction.

## 2. Canonical persistence ownership

Repository Truth now discovers 14 Drizzle-backed data models owned by exactly one module:

- data-postgres: 2
- identity: 8
- settings-runtime: 3
- audit: 1

The ownership keys use `db.table.<physical_table_name>` and are declared in each module manifest. A feature does not gain permission to invent a second table definition or persistence path simply because it needs the same data.

`foundation_schema_migrations` is a bootstrap metadata table created by the migration runner before migration history is evaluated. All product/foundation persisted state introduced by migration 0001 is additive; F4 introduces no `DROP` or `TRUNCATE` migration.

## 3. Transaction and concurrency rules now implemented

### Transaction ownership

`PostgresDatabase.transaction()` is the single transaction boundary. The outer call owns `BEGIN / COMMIT / ROLLBACK`. Nested foundation calls reuse the active connection rather than committing independently.

This allows flows such as:

```text
Settings write
  -> current value CAS
  -> history append
  -> applied-version update when hot
  -> audit append
  -> one COMMIT
```

and equivalent Identity/Role mutations when composed with the same transaction boundary.

### Optimistic concurrency

Database predicates, not read-only application checks, decide the winner for:

- account replacement;
- password credential version progression;
- session rotation/revocation replacement;
- one-time challenge consumption;
- role replacement;
- account-role assignment version;
- runtime setting current value.

During F4 review, account-role assignment was upgraded from last-write-wins semantics to an explicit versioned account-role set. Password credential persistence was also hardened so a missing credential can only be created at version 1; later versions require a successful `N -> N+1` CAS and cannot silently recreate missing state.

## 4. Idempotency

`PostgresIdempotencyStore` implements a persisted operation/key claim with a canonical SHA-256 hash of JSON-compatible request input.

States:

```text
ABSENT -> IN_PROGRESS -> COMPLETED
```

Behavior:

- first matching claim starts;
- same key + same hash while running reports in-progress;
- same key + different hash reports conflict;
- completed same key + same hash replays the stored response;
- expired claims can be reclaimed under row locking;
- non-JSON/circular request material is rejected instead of being ambiguously hashed.

No claim that every endpoint requires idempotency is made. F4 provides the reusable primitive; later endpoint contracts classify when it is required.

## 5. Integrity and indexing

Migration 0001 establishes database enforcement for representative critical invariants including:

- unique normalized account email;
- account/session/challenge/role status/assurance/kind constraints;
- positive record versions;
- account/role foreign-key integrity;
- unique setting coordinates and immutable versioned setting history keys;
- bounded semantic state for idempotency records;
- audit append-only mutation rejection;
- indexes for active sessions/challenges, role membership, recent settings history, audit investigation paths, and idempotency expiry.

The application still validates earlier for usable errors; database constraints are the final integrity boundary, not a replacement for domain validation.

## 6. Health behavior

`/health` remains process liveness and does not query PostgreSQL.

`/health/ready` includes a `postgresql` dependency check. Missing `DATABASE_URL`, connection failure, or failed readiness query returns a DOWN dependency and therefore `NOT_READY` without reporting process liveness as DOWN.

Pool size and connection/idle/statement timeouts are bounded from environment configuration. No silent in-memory production fallback exists.

## 7. Executable evidence completed locally

The following passed in the available environment:

- strict TypeScript compilation of Foundation, Data PostgreSQL, Identity, Audit, Settings Runtime, and Observability packages;
- API TypeScript compilation with temporary dependency shims necessitated by the offline package registry;
- Foundation tests: 7/7;
- Data PostgreSQL local tests: 8/8;
- Identity tests: 17/17;
- Audit tests: 5/5;
- Settings Runtime tests: 12/12;
- Observability tests: 7/7;
- Catalog regression tests: 33/33.

**Total executed passing tests: 89/89.**

Local F4 tests prove transaction sequencing/rollback behavior, nested transaction reuse, canonical idempotency hashing, migration ordering/checksums, additive migration policy, advisory-lock runner behavior, and readiness result classification.

Repository/governance preparation also confirms:

- canonical registries valid;
- generated settings bindings match registry;
- generated permission bindings match registry;
- project profile validates PostgreSQL 18;
- Repository Truth indexes 14 data models with declared module ownership.

## 8. PostgreSQL 18 proof deliberately not claimed

This execution environment does not provide a PostgreSQL server, `psql`, Docker/Podman, or usable npm/network installation path. Therefore the guarded PostgreSQL integration test is present but reports SKIP when `TEST_DATABASE_URL` is absent.

F4 is intentionally **not promoted to PROVEN** based on mocks or SQL text alone.

The integration harness requires both:

```text
TEST_DATABASE_URL=<disposable PostgreSQL 18 database>
F4_DATABASE_TESTS=1
```

It is designed to prove on an actual PostgreSQL 18 runtime:

1. server major version 18;
2. migration 0001 execution;
3. second migration run as checksum-verified no-op;
4. rejection of altered content for already-applied migration version;
5. account and password-credential CAS;
6. session CAS;
7. one-time challenge race behavior;
8. account-role assignment CAS;
9. settings write/history/application-state CAS;
10. database-enforced append-only audit behavior;
11. rollback of both state and audit evidence from one outer transaction;
12. idempotency started/in-progress/conflict/replay behavior;
13. readiness UP while connected and DOWN after database unavailability.

Only after that evidence passes may `data.postgresql-runtime`, `data.migrations-integrity`, and `data.transactions-concurrency-idempotency` be considered for promotion to `PROVEN`, and only then may the foundation roadmap decide whether F4's exit criteria permit movement to F5.

## 9. Boundary decisions preserved

F4 does **not**:

- move Products persistence forward while the Foundation gate is frozen;
- introduce another ORM/database path;
- put database access in Next.js/browser code;
- duplicate Settings precedence/default logic;
- weaken governance to make a migration pass;
- add destructive migrations;
- pretend local fake-executor tests are PostgreSQL evidence;
- implement HTTP auth/session transport, which belongs to F5;
- generalize outbox/background delivery, which remains owned by its later application-services stage.

## 10. Current conclusion

F4 now has the code, contracts, migration path, ownership truth, negative rules, and a complete guarded PostgreSQL 18 proof harness required to test the design against reality. The remaining blocker is external runtime evidence, not another architecture decision.

**Current stage remains F4.**

# F6 Performance Foundation — Implementation Report

## Status

F6 remains open. This implementation establishes deterministic performance correctness, but it does not promote `performance.query-runtime` to `PROVEN` and it does not advance the foundation to F7. Closure requires real evidence from the exact committed revision on Node 24, pnpm 11.24, and PostgreSQL 18.

## Scope

F6 intentionally stays narrow. It does not introduce a generalized load-testing framework, synthetic latency gates, new cache or queue layers, Product persistence, or performance-only indexes.

The blocking F6 checks are deterministic:

- bounded list inputs;
- query count and repeated query-fingerprint budgets;
- prevention of query amplification/N+1 on reviewed persistence paths;
- no database I/O inside loops on reviewed persistence paths;
- explicit column projection on reviewed list queries;
- PostgreSQL query-plan/index evidence for the representative actual path.

Wall-clock p95/p99, saturation, and realistic throughput are not PR blocking in F6. They require a stable runtime and representative journeys/load and are outside this foundation gate.

## Implemented

### SQL observation and budgets

`PostgresDatabase` accepts an optional query observer. The observer records only operation, SHA-256 statement fingerprint, parameter count, row count, and success/error outcome. SQL parameter values, database error text, and elapsed wall-clock time are not part of the observation.

`SqlQueryRecorder` and `requireSqlQueryBudget` provide deterministic query-count and repeated-fingerprint assertions without adding a metrics or load-testing subsystem.

### Bounded representative list path

The existing audit list path is the representative database path. It has an explicit maximum limit of 100, explicit projection, deterministic ordering, and a declared production index. The PostgreSQL proof returns 40 rows through the real store and requires exactly one observed query, so returned row count cannot amplify the database query count.

The proof also rejects a limit of 101 before database I/O.

### N+1/query-loop construction checks

F6 reviews the existing audit, settings-history, and identity persistence paths that exercise multi-row reads/writes. The deterministic verifier rejects `SELECT *` in these reviewed list paths and scans the reviewed source for awaited database queries inside loop bodies. Existing identity role reads and permission writes are also checked for set-based SQL shapes.

### Query plan and index evidence

The PostgreSQL 18 proof uses `EXPLAIN (FORMAT JSON)` for the same selective audit-list query shape and verifies use of the existing `audit_records_action_idx`. F6 adds no index and does not weaken a budget to force PASS.

## Verification split

### Deterministic local/PR validation

The following do not require a PostgreSQL service:

1. F0–F4 structural verifier.
2. F5 API/security regression verifier.
3. F6 deterministic performance verifier.
4. Unit/build/type checks in the pinned Node/pnpm environment.
5. Task governance verification.
6. Trust-root verification.
7. Consumer-boundary verification.
8. Handoff verification after commit and clean tree.

### Required real proof before closure

The F6 PostgreSQL integration proof must run against PostgreSQL major version 18 with `F6_DATABASE_TESTS=1` and `TEST_DATABASE_URL` pointing to a disposable database. The proof must be captured against the exact committed F6 implementation revision.

Until that proof succeeds and is recorded, F6 remains open and F7 must not begin.

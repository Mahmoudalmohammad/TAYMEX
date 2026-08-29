# F6 PostgreSQL 18 Deterministic Performance Proof

## Evidence state

**PROVEN**

F6 deterministic performance correctness was executed on the exact canonical consumer revision below using the pinned Node/pnpm toolchain and a real disposable PostgreSQL 18 database. This evidence is not inferred from structural checks, mocks, documentation, or synthetic latency measurements.

## Tested revisions and toolchain

```text
TAYMEX:                       c98a084a86a751acd8fe68e49769e9dd4e4c8b7e
TAYMEX F6 implementation:    10c961c0f70b60b130b8ab6912d929edde90ae6b
F6 base:                      d89d7dfd144acbd56ffd8a7ed26b6733b217b0ce
ENGINEERING_PLATFORM:         c3d865ee97f33c7d0247e00fdd02e0c771ea6f98
Node:                         v24.14.0
pnpm:                         11.24.0
Python:                       3.13.5
PostgreSQL:                   18.6 (Debian 18.6-1.pgdg13+2)
server_version_num:           180006
```

The F6 closure commit that records this evidence changes only governed task metadata, maturity/evidence documents, and structural verifiers. It does not modify the runtime, SQL, migrations, dependencies, contracts, platform artifacts, or trust-root implementation proven at `c98a084a86a751acd8fe68e49769e9dd4e4c8b7e`.

## Raw evidence package

The returned unmodified proof artifact is:

```text
F6_VALIDATION_RESULTS_20260829T151757Z.zip
SHA-256: 4aabd7f64c290def141055ccc33acc86aa52637b21731927395fd5b13f893b2a
```

The package records all fourteen validation sections and a final exact-SHA proof manifest. Its recorded terminal state before the separate closure commit is deliberately:

```text
FOUNDATION_STAGE=F6
PERFORMANCE_MATURITY=IMPLEMENTED
F6_REAL_PROOF=PASS
F6_CLOSED=NO
F7_STARTED=NO
```

That distinction matters: the runtime proof was captured first, and only this later governed closure step promotes maturity and stage metadata.

## Clean install, build, typecheck, and regressions

On the tested revision:

- `pnpm install --frozen-lockfile` — PASS;
- recursive monorepo build — PASS;
- monorepo typecheck — PASS;
- recursive package tests — PASS with zero test failures;
- HTTP primitive regressions — PASS;
- JavaScript syntax preflight for all `.mjs` files — PASS;
- repository remained clean after build/typecheck/tests — PASS.

The final run includes the regressions for two defects exposed by earlier local pressure during F6 validation: a Node-compatible test assertion and classification of TypeScript build metadata as generated/untracked state. Neither repair weakened the performance gates or changed application runtime behavior.

## Structural and generated-contract verification

The same tested revision passed:

- API generated-contract verification;
- settings binding verification;
- permission binding verification;
- project/profile validation;
- platform validation;
- F0–F4 verifier — `19/19` PASS;
- F5 verifier — `186/186` PASS;
- F6 pre-closure verifier — `38/38` PASS;
- independent consumer-boundary verification — PASS.

## Real PostgreSQL 18 runtime

The disposable database used image `postgres:18` and reported:

```text
postgres.server_version=18.6 (Debian 18.6-1.pgdg13+2)
postgres.server_version_num=180006
```

Real migrations were executed twice:

```text
first run:  executed=["0001","0002"]
second run: executed=[]
```

The second run proves migration idempotency on the tested database.

The earlier F4 PostgreSQL regression harness also passed on the same final F6 SHA:

```text
✔ PostgreSQL 18 proves F4 migration, CAS, rollback, audit, idempotency, and readiness
pass 1
fail 0
skipped 0
```

## F6 deterministic query proof

The real F6 integration harness passed against PostgreSQL 18:

```text
✔ PostgreSQL 18 proves deterministic F6 list query budget, bounded pagination, and index evidence
postgres.server_version_num=180006
audit.rows=40
audit.total_queries=1
audit.max_repeated_fingerprint=1
audit.plan_index=audit_records_action_idx
audit.invalid_limit_database_queries=0
pass 1
fail 0
skipped 0
```

This proves the blocking F6 correctness claims for the declared real persistence paths:

- bounded pagination/list inputs, including rejection above the configured maximum before database I/O;
- one-query budget for the representative audit-list retrieval;
- repeated query-fingerprint budget of one, preventing query amplification on the representative path;
- set-based identity multi-role reads and permission writes;
- no awaited database query inside reviewed loop bodies;
- explicit projections rather than `SELECT *` on reviewed list paths;
- `EXPLAIN (FORMAT JSON)` evidence tied to the actual representative audit query shape;
- use of the existing `audit_records_action_idx`;
- no performance-only index added to obtain PASS.

## Real HTTP and process proof on the same SHA

The F5 PostgreSQL-backed HTTP integration regression passed on the final F6 SHA with one pass and zero failures/skips.

The actual API process smoke returned:

```text
GET /api/health       -> HTTP 200, status=UP
GET /api/health/ready -> HTTP 200, status=READY, postgresql=UP
```

No database password or connection URL leakage was accepted by the validation harness.

## Governance, trust, consumer boundary, and handoff

The proof preserves the actual governed lineage instead of pretending the whole F6 history was one task:

```text
d89d7dfd144acbd56ffd8a7ed26b6733b217b0ce
  -> 10c961c0f70b60b130b8ab6912d929edde90ae6b
     FOUNDATION-F6-001
     Governance PASS
     Trust PASS

10c961c0f70b60b130b8ab6912d929edde90ae6b
  -> c98a084a86a751acd8fe68e49769e9dd4e4c8b7e
     FOUNDATION-F6-HYGIENE-002
     Governance PASS
     Trust PASS
```

On `c98a084a86a751acd8fe68e49769e9dd4e4c8b7e`:

- independent Consumer Boundary — PASS;
- Handoff create/verify — PASS, `status: verified`;
- final repository HEAD checks — PASS;
- `git fsck --full --strict` returned success for both repositories. Unreachable/dangling objects reported by Git are not integrity failures and are not part of the reachable canonical history.

## Scope boundary

F6 proves deterministic performance correctness, not production capacity. It does **not** claim:

- generalized load-test coverage;
- k6/Artillery/JMeter-style benchmark infrastructure;
- PR-blocking p95/p99 latency SLOs;
- production traffic saturation or throughput capacity;
- cache/queue architecture;
- performance-only indexes;
- F7 or later-stage capability maturity.

Those claims require their own representative environment and stage-specific evidence.

## Closure decision supported by this proof

The exact-SHA evidence is sufficient to promote only `performance.query-runtime` from `IMPLEMENTED` to `PROVEN` and close F6. Advancing `foundation.currentStage` to `F7` means **F7 is ready to begin**, not that F7 implementation has started or any F7 capability has been proven.

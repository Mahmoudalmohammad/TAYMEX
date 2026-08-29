# TAYMEX Foundation F6 — Deterministic Performance Closure Report

**Stage:** F6 — Deterministic Performance Foundation
**Final stage decision:** **CLOSED**
**Next foundation stage:** `F7`
**Broad feature expansion:** remains **BLOCKED** until the complete Foundation Readiness Gate is satisfied.

## 1. Closure decision

F6 is closed because deterministic query/runtime correctness is now supported by exact-SHA real-consumer evidence, not only source inspection or unit tests. The canonical revision was installed, built, typechecked, tested, migrated on PostgreSQL 18.6, exercised through real persistence and HTTP/runtime paths, and passed governance, trust, consumer-boundary, handoff, and final repository-integrity checks.

The runtime proof is recorded in `docs/evidence/F6_POSTGRESQL18_PERFORMANCE_PROOF.md` and is tied to TAYMEX revision `c98a084a86a751acd8fe68e49769e9dd4e4c8b7e`.

## 2. Capability promoted by F6 proof

Only the following capability is promoted by F6:

- `performance.query-runtime` → `PROVEN`.

No localization, UI, files, notifications, operations, public-web, remote-merge, or later-stage capability is promoted by implication.

## 3. Deliberately narrow performance foundation

F6 remains a deterministic correctness gate rather than a generalized performance framework. Its blocking checks are:

- bounded list inputs;
- query-count budgets;
- repeated query-fingerprint budgets;
- prevention of query amplification/N+1 on reviewed persistence paths;
- no database I/O inside reviewed loops;
- explicit projections on reviewed list queries;
- set-based multi-row identity persistence;
- PostgreSQL query-plan/index evidence for the declared representative real path.

F6 does not introduce generalized load testing, synthetic throughput targets, cache/queue layers, Product persistence, or performance-only indexes.

Wall-clock p95/p99, saturation, and representative production throughput remain outside ordinary F6 PR gating. They require stable deployment topology and representative journeys/load rather than fabricated thresholds.

## 4. Deterministic SQL observation

`PostgresDatabase` supports an optional query observer that records only operation, SHA-256 statement fingerprint, parameter count, row count, and success/error outcome. SQL parameter values, database error text, and elapsed wall-clock time are excluded.

`SqlQueryRecorder` and `requireSqlQueryBudget` provide deterministic query-count and repeated-fingerprint assertions without creating a metrics or load-testing subsystem.

## 5. Real PostgreSQL 18 proof

The final exact-SHA validation used:

```text
TAYMEX:               c98a084a86a751acd8fe68e49769e9dd4e4c8b7e
ENGINEERING_PLATFORM: c3d865ee97f33c7d0247e00fdd02e0c771ea6f98
Node:                 v24.14.0
pnpm:                 11.24.0
PostgreSQL:            18.6 / 180006
```

The real F6 integration result was:

```text
audit.rows=40
audit.total_queries=1
audit.max_repeated_fingerprint=1
audit.plan_index=audit_records_action_idx
audit.invalid_limit_database_queries=0
pass 1
fail 0
skipped 0
```

The representative audit path therefore returns a multi-row result through exactly one observed query, does not repeat the fingerprint, rejects an invalid limit before database access, and uses the existing declared index. F6 adds no index to force the plan into compliance.

## 6. N+1, bounds, and query-loop evidence

The approved F6 policy is scoped to the actual reviewed persistence paths for audit records, settings history, identity sessions, identity roles, and identity permission writes.

The verifier and real proof establish:

- audit list maximum `100`;
- settings history maximum `100`;
- identity sessions maximum `100`;
- no `SELECT *` on reviewed list paths;
- identity multi-role retrieval through one set query;
- identity permission writes through set-based SQL;
- no awaited database query inside loops on the reviewed persistence sources.

This scope is intentionally concrete. F6 does not claim to be a whole-language static analyzer or a universal benchmark system.

## 7. Local-validation pressure and regression quality

Local execution acted as real-consumer pressure rather than a parallel development branch. Two defects were exposed before the final proof:

1. an invalid Unicode-regex escape in a database-package test;
2. compiler-generated `tsconfig.tsbuildinfo` metadata leaving the repository dirty after successful typechecking.

Both were fixed at their lowest responsible layer. No verifier was disabled and no local cleanup workaround was used to manufacture PASS. The final exact-SHA run then passed clean install/build/typecheck/tests and repository-cleanliness checks before database proof began.

## 8. Runtime regression evidence

The same final F6 revision also passed:

- real migrations twice, with the second execution applying nothing;
- the F4 PostgreSQL 18 regression harness;
- the F5 PostgreSQL-backed HTTP regression harness;
- actual API process liveness and PostgreSQL readiness smoke;
- generated-contract and binding checks;
- F0–F4, F5, and pre-closure F6 structural verifiers.

This prevents F6 performance work from being accepted by sacrificing earlier foundation correctness.

## 9. Governance and trust lineage

F6 preserves two separately governed segments:

- `d89d7df… → 10c961c…` — main F6 implementation;
- `10c961c… → c98a084…` — repository-hygiene repair discovered by local validation.

Both segments pass Governance and Trust independently. The final revision also passes Consumer Boundary and Handoff verification.

The closure commit itself is restricted to task metadata, maturity/evidence documentation, and structural verifiers. It does not change the proven runtime implementation.

## 10. Stage completion versus later proof

F6 closure does not mean the complete foundation is ready for feature expansion. Remaining required capabilities retain their existing maturity and proof obligations, including:

- governance remote merge authority;
- localization and bidi/formatting proof;
- UI/design-system/browser/RTL/accessibility/visual proof;
- files/media storage;
- notifications/events/side effects;
- integrated test harness completion;
- environment/secrets/delivery and backup/restore;
- public-web SEO foundation.

The Product validation slice remains frozen until the full Foundation Readiness Gate passes.

## 11. Final F6 status

```text
performance.query-runtime      PROVEN
F6                             CLOSED
Foundation current stage       F7 (READY; implementation not started by this closure)
Foundation readiness           BLOCKED
Products validation slice      FROZEN_FOR_FOUNDATION_PROOF
Generalized load framework     NOT INTRODUCED
Synthetic p95/p99 PR gates     NOT INTRODUCED
```

**F6 is closed from real PostgreSQL 18 deterministic performance proof without expanding it into a generalized performance framework or weakening later-stage requirements.**

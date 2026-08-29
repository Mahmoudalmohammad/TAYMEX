#!/usr/bin/env python3
"""Deterministic F6 performance foundation verifier.

This verifier deliberately avoids unstable wall-clock latency gates. It checks the
small set of construction rules required before real PostgreSQL 18 proof:
query instrumentation, bounded list paths, no database I/O inside loops on the
reviewed persistence paths, and the exact integration proof contract that will
be run against PostgreSQL 18.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
FAIL: list[tuple[str, str]] = []
PASS: list[tuple[str, str]] = []


def text(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def check(name: str, condition: bool, detail: str = "") -> None:
    (PASS if condition else FAIL).append((name, detail))


def mapping(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def list_value(value: object) -> list:
    return value if isinstance(value, list) else []


policy = yaml.safe_load(text("blueprints/foundation/performance.policy.yaml"))
policy_root = mapping(mapping(policy).get("policy"))
pr_gating = mapping(policy_root.get("prGating"))
deterministic = set(list_value(pr_gating.get("deterministic")))
nonblocking = set(list_value(pr_gating.get("explicitlyNonBlockingInPr")))
required_deterministic = {
    "bounded-list-inputs",
    "query-count",
    "repeated-query-fingerprint",
    "no-database-io-in-reviewed-loops",
    "representative-query-plan-shape",
}
check("F6 policy declares the exact deterministic PR performance gates", required_deterministic == deterministic, str(sorted(deterministic)))
check("p95 is not an ordinary deterministic PR gate", "p95-latency" not in deterministic and "p95-latency" in nonblocking)
check("p99 is not an ordinary deterministic PR gate", "p99-latency" not in deterministic and "p99-latency" in nonblocking)

database_policy = mapping(policy_root.get("database"))
instrumentation_policy = mapping(database_policy.get("applicationQueryInstrumentation"))
check("SQL telemetry forbids parameter-value recording", instrumentation_policy.get("recordParameterValues") is False)
check("SQL telemetry declares fingerprint/query-count evidence", instrumentation_policy.get("recordStatementFingerprint") is True and instrumentation_policy.get("recordParameterCount") is True)
performance_source = text("packages/data-postgres/src/performance.ts")
database_source = text("packages/data-postgres/src/database.ts")
check("SQL observation contains no wall-clock latency field", "elapsed" not in performance_source.lower() and "perf_hooks" not in database_source)
check("SQL observer exposes stable statement fingerprint", "fingerprintSqlStatement" in performance_source and "createHash('sha256')" in performance_source)
check("SQL observer exposes deterministic query budgets", "requireSqlQueryBudget" in performance_source and "maxRepeatedFingerprint" in performance_source)
check("Database instrumentation does not attach SQL params to observation", "params," not in re.sub(r"executor\.query<Row>\(text, params\)", "", database_source) and "parameterCount: params.length" in database_source)
check("Database instruments success and error outcomes", "outcome: 'success'" in database_source and "outcome: 'error'" in database_source)

reviewed = [mapping(item) for item in list_value(database_policy.get("reviewedPaths"))]
reviewed_by_id = {str(item.get("id")): item for item in reviewed}
reviewed_paths = sorted({str(item.get("source")) for item in reviewed if item.get("source")})
check("F6 policy is scoped to the five declared real persistence checks", set(reviewed_by_id) == {
    "audit-records-by-action",
    "settings-history",
    "identity-sessions",
    "identity-roles-by-ids",
    "identity-permission-write",
}, str(sorted(reviewed_by_id)))
combined = "\n".join(text(path) for path in reviewed_paths)
check("Reviewed persistence lists do not use SELECT *", re.search(r"SELECT\s+\*", combined, re.I) is None)
audit_source = text(str(reviewed_by_id["audit-records-by-action"].get("source")))
settings_source = text(str(reviewed_by_id["settings-history"].get("source")))
identity_source = text(str(reviewed_by_id["identity-sessions"].get("source")))
role_source = text(str(reviewed_by_id["identity-roles-by-ids"].get("source")))
check("Audit list policy and source are bounded to 100", reviewed_by_id["audit-records-by-action"].get("maxLimit") == 100 and "const MAX_LIMIT = 100" in audit_source and "limit > MAX_LIMIT" in audit_source)
check("Settings history policy and source are bounded to 100", reviewed_by_id["settings-history"].get("maxLimit") == 100 and "const MAX_HISTORY = 100" in settings_source and "limit > MAX_HISTORY" in settings_source)
check("Identity sessions policy and source are bounded to 100", reviewed_by_id["identity-sessions"].get("maxLimit") == 100 and "requireLimit(limit, 1, 100)" in identity_source)
check("Representative audit query budget is exactly one", reviewed_by_id["audit-records-by-action"].get("maxQueries") == 1 and reviewed_by_id["audit-records-by-action"].get("maxRepeatedFingerprint") == 1)
check("Identity multi-role read is one set query", "WHERE r.id = ANY($1::text[])" in role_source)
check("Identity permission writes are set-based", "unnest($2::text[])" in role_source)

# Detect the high-risk form directly: a loop body containing an awaited DB query.
# This is intentionally scoped to the four real persistence paths above instead
# of pretending to be a whole-language static analyzer.
loop_query_hits: list[str] = []
loop_pattern = re.compile(r"\b(?:for|while)\s*\([^)]*\)\s*\{(?P<body>.*?)\}", re.S)
for relative in reviewed_paths:
    source = text(relative)
    for match in loop_pattern.finditer(source):
        if re.search(r"await\s+[^;\n]*\.query\s*\(", match.group("body")):
            loop_query_hits.append(relative)
check("No DB I/O in loops on reviewed persistence paths", not loop_query_hits, ", ".join(sorted(set(loop_query_hits))))
plan_policy = mapping(database_policy.get("planEvidence"))
check("Query-plan proof is tied to the representative audit path", plan_policy.get("representativePath") == "audit-records-by-action" and reviewed_by_id["audit-records-by-action"].get("existingIndex") == "audit_records_action_idx")

integration = text("apps/api/tests/f6-performance.integration.test.mjs")
for phrase in [
    "SHOW server_version_num",
    "F6_DATABASE_TESTS === '1'",
    "SqlQueryRecorder",
    "requireSqlQueryBudget",
    "maxQueries: 1",
    "maxRepeatedFingerprint: 1",
    "MAX_AUDIT_LIMIT + 1",
    "EXPLAIN (FORMAT JSON)",
    "audit_records_action_idx",
    "ANALYZE audit_records",
]:
    check(f"F6 PostgreSQL proof contract covers {phrase}", phrase in integration)
check("F6 proof does not create a performance-only index", "CREATE INDEX" not in integration.upper())

manifest = yaml.safe_load(text("blueprints/foundation/foundation.manifest.yaml"))
foundation = mapping(mapping(manifest).get("foundation"))
capabilities = {item.get("id"): item for item in list_value(mapping(manifest).get("capabilities")) if isinstance(item, dict)}
performance = mapping(capabilities.get("performance.query-runtime"))
check("Foundation remains at F6 before PostgreSQL proof", foundation.get("currentStage") == "F6", str(foundation.get("currentStage")))
check("Performance capability is implemented but not prematurely PROVEN", performance.get("currentMaturity") == "IMPLEMENTED", str(performance.get("currentMaturity")))
check("Performance capability still records real PostgreSQL proof as remaining", any("PostgreSQL 18" in str(item) for item in list_value(performance.get("remaining"))))

root_package = json.loads(text("package.json"))
scripts = mapping(root_package.get("scripts"))
check("Root exposes deterministic F6 verifier", scripts.get("f6:verify") == "python3 scripts/verify-f6-performance.py")
check("Root exposes explicit PostgreSQL 18 F6 proof command", scripts.get("f6:test:postgres") == "node --test apps/api/tests/f6-performance.integration.test.mjs")

report = text("docs/FOUNDATION_F6_PERFORMANCE_REPORT.md")
check("F6 report explicitly keeps the stage open before real DB proof", "F6 remains open" in report)
check("F6 report rejects synthetic PR latency SLOs", "p95/p99" in report and "not PR blocking" in report)

for name, detail in PASS:
    print(f"PASS: {name}" + (f" — {detail}" if detail else ""))
for name, detail in FAIL:
    print(f"FAIL: {name}" + (f" — {detail}" if detail else ""))
print(f"SUMMARY: {'PASS' if not FAIL else 'FAIL'} ({len(PASS)} passed, {len(FAIL)} failed)")
raise SystemExit(1 if FAIL else 0)

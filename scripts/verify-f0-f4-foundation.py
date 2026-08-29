#!/usr/bin/env python3
"""Deep F0-F4 structural verifier.

This verifier intentionally checks consistency between independent truth surfaces instead
of treating any one descriptive file as authoritative. Runtime/PostgreSQL execution is
validated separately by the PostgreSQL 18 integration harness.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import tarfile
from pathlib import Path
from typing import Iterable

import yaml

ROOT = Path(__file__).resolve().parents[1]
EXPECTED_CONTEXT_HASHES = {
    "Problem_Context.md": "2a1ba448df2b7041665edc66b8d5774c9a0a9ca6d81a046ebf898f34a73cbd26",
    "TAYMEX_CUMULATIVE_EXPERT_REVIEW.md": "125524f61a524f2ff9059829018cb28fc23385cf8c543bc26d5c7d919d34bed7",
}
SCHEMA_FILES = [
    ROOT / "packages/data-postgres/src/schema.ts",
    ROOT / "packages/identity/src/persistence/schema.ts",
    ROOT / "packages/settings-runtime/src/schema.ts",
    ROOT / "packages/audit/src/schema.ts",
]
MANIFEST_FILES = [
    ROOT / "packages/data-postgres/module.manifest.yaml",
    ROOT / "packages/identity/module.manifest.yaml",
    ROOT / "packages/settings-runtime/module.manifest.yaml",
    ROOT / "packages/audit/module.manifest.yaml",
    ROOT / "packages/observability/module.manifest.yaml",
]
MIGRATION_DIR = ROOT / "packages/data-postgres/migrations"
MIGRATION_RUNNER = ROOT / "packages/data-postgres/src/migrations.ts"

FAILURES: list[str] = []
PASSES: list[str] = []


def fail(message: str) -> None:
    FAILURES.append(message)


def passed(message: str) -> None:
    PASSES.append(message)


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def strip_sql_comments(sql: str) -> str:
    return re.sub(r"--[^\n]*", "", sql)


def find_balanced(text: str, open_pos: int, opening: str = "{", closing: str = "}") -> tuple[str, int]:
    depth = 0
    quote: str | None = None
    escaped = False
    for i in range(open_pos, len(text)):
        c = text[i]
        if quote:
            if escaped:
                escaped = False
            elif c == "\\":
                escaped = True
            elif c == quote:
                quote = None
            continue
        if c in ("'", '"', "`"):
            quote = c
            continue
        if c == opening:
            depth += 1
        elif c == closing:
            depth -= 1
            if depth == 0:
                return text[open_pos + 1 : i], i + 1
    raise ValueError(f"Unbalanced {opening}{closing} at {open_pos}")


def ts_type(builder: str, options: str | None) -> str:
    if builder == "text":
        return "text"
    if builder == "uuid":
        return "uuid"
    if builder == "integer":
        return "integer"
    if builder == "jsonb":
        return "jsonb"
    if builder == "timestamp":
        return "timestamptz" if options and "withTimezone: true" in options else "timestamp"
    if builder == "char":
        match = re.search(r"length\s*:\s*(\d+)", options or "")
        return f"char({match.group(1)})" if match else "char"
    return builder


def parse_drizzle_tables(path: Path) -> dict[str, dict[str, str]]:
    text = read(path)
    result: dict[str, dict[str, str]] = {}
    pattern = re.compile(r"pgTable\(\s*['\"]([^'\"]+)['\"]\s*,\s*\{")
    for match in pattern.finditer(text):
        table = match.group(1)
        open_pos = match.end() - 1
        body, _ = find_balanced(text, open_pos)
        columns: dict[str, str] = {}
        column_pattern = re.compile(
            r"(?m)^\s*[A-Za-z_$][\w$]*\s*:\s*"
            r"(text|uuid|integer|jsonb|timestamp|char)\(\s*['\"]([^'\"]+)['\"]"
            r"(?:\s*,\s*\{([^}]*)\})?\s*\)"
        )
        for col in column_pattern.finditer(body):
            builder, sql_name, options = col.groups()
            columns[sql_name] = ts_type(builder, options)
        if not columns:
            fail(f"No columns parsed from Drizzle table {table} in {path.relative_to(ROOT)}")
        result[table] = columns
    return result


def extract_create_table_blocks(sql: str) -> dict[str, str]:
    tables: dict[str, str] = {}
    pattern = re.compile(r"CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+([a-z_][a-z0-9_]*)\s*\(", re.I)
    for match in pattern.finditer(sql):
        table = match.group(1).lower()
        open_pos = match.end() - 1
        depth = 0
        quote: str | None = None
        for i in range(open_pos, len(sql)):
            c = sql[i]
            if quote:
                if c == quote and (i == 0 or sql[i - 1] != "\\"):
                    quote = None
                continue
            if c == "'":
                quote = c
                continue
            if c == "(":
                depth += 1
            elif c == ")":
                depth -= 1
                if depth == 0:
                    tables[table] = sql[open_pos + 1 : i]
                    break
    return tables


def split_top_level_commas(body: str) -> list[str]:
    parts: list[str] = []
    start = 0
    depth = 0
    quote: str | None = None
    for i, c in enumerate(body):
        if quote:
            if c == quote and (i == 0 or body[i - 1] != "\\"):
                quote = None
            continue
        if c == "'":
            quote = c
        elif c == "(":
            depth += 1
        elif c == ")":
            depth -= 1
        elif c == "," and depth == 0:
            parts.append(body[start:i].strip())
            start = i + 1
    tail = body[start:].strip()
    if tail:
        parts.append(tail)
    return parts


def normalize_sql_type(raw: str) -> str:
    t = raw.strip().lower()
    t = re.sub(r"\s+", " ", t)
    if t.startswith("character("):
        return "char" + t[len("character") :]
    if t.startswith("character varying"):
        return "varchar"
    if t in {"int", "int4"}:
        return "integer"
    if t in {"timestamp with time zone"}:
        return "timestamptz"
    return t


def parse_sql_columns(body: str) -> dict[str, str]:
    columns: dict[str, str] = {}
    for item in split_top_level_commas(body):
        cleaned = item.strip()
        if not cleaned:
            continue
        if re.match(r"^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|CHECK|UNIQUE)\b", cleaned, re.I):
            continue
        match = re.match(
            r"^([a-z_][a-z0-9_]*)\s+"
            r"(timestamp\s+with\s+time\s+zone|timestamptz|timestamp|uuid|jsonb|integer|int4|int|text|char\s*\(\s*\d+\s*\)|character\s*\(\s*\d+\s*\)|character\s+varying(?:\s*\(\s*\d+\s*\))?)(?=\s|$)",
            cleaned,
            re.I,
        )
        if match:
            columns[match.group(1).lower()] = normalize_sql_type(match.group(2).replace(" ", "") if match.group(2).lower().startswith(("char", "character(")) else match.group(2))
    return columns


def final_sql_schema() -> tuple[dict[str, dict[str, str]], str]:
    sql_parts = [read(MIGRATION_RUNNER)]
    sql_parts.extend(read(path) for path in sorted(MIGRATION_DIR.glob("*.sql")))
    combined = "\n".join(sql_parts)
    tables = {name: parse_sql_columns(body) for name, body in extract_create_table_blocks(combined).items()}

    # Apply additive ALTER TABLE ... ADD COLUMN operations to final-state truth.
    for statement in re.findall(r"ALTER\s+TABLE\s+[a-z_][a-z0-9_]*\s+.*?;", combined, re.I | re.S):
        table_match = re.match(r"ALTER\s+TABLE\s+([a-z_][a-z0-9_]*)", statement, re.I)
        if not table_match:
            continue
        table = table_match.group(1).lower()
        for col_match in re.finditer(
            r"ADD\s+COLUMN\s+([a-z_][a-z0-9_]*)\s+"
            r"(timestamptz|timestamp|uuid|jsonb|integer|text|char\s*\(\s*\d+\s*\))(?=\s|,|$)",
            statement, re.I
        ):
            column, typ = col_match.groups()
            tables.setdefault(table, {})[column.lower()] = normalize_sql_type(typ.replace(" ", "") if typ.lower().startswith("char") else typ)
    return tables, combined


def manifest_owned_tables() -> set[str]:
    owned: set[str] = set()
    for path in MANIFEST_FILES:
        doc = yaml.safe_load(read(path)) or {}
        data = doc.get("data") or {}
        for entry in data.get("owns") or []:
            if not isinstance(entry, str) or not entry.startswith("db.table."):
                fail(f"Invalid data ownership entry in {path.relative_to(ROOT)}: {entry!r}")
                continue
            table = entry.removeprefix("db.table.")
            if table in owned:
                fail(f"Database table is owned by more than one module: {table}")
            owned.add(table)
    return owned


def drizzle_schema() -> dict[str, dict[str, str]]:
    tables: dict[str, dict[str, str]] = {}
    for path in SCHEMA_FILES:
        for table, columns in parse_drizzle_tables(path).items():
            if table in tables:
                fail(f"Drizzle table declared more than once: {table}")
            tables[table] = columns
    return tables


def check_context() -> None:
    for name, expected in EXPECTED_CONTEXT_HASHES.items():
        path = ROOT / name
        if not path.exists():
            fail(f"Context file missing from repository root: {name}")
            continue
        actual = sha256(path)
        if actual != expected:
            fail(f"Context file changed: {name}; expected sha256={expected}, actual={actual}")
        else:
            passed(f"Context preserved verbatim: {name}")


def check_schema_truth() -> None:
    drizzle = drizzle_schema()
    sql, combined_sql = final_sql_schema()
    owned = manifest_owned_tables()
    sets = {"Drizzle": set(drizzle), "SQL": set(sql), "manifest ownership": owned}
    union = set().union(*sets.values())
    for label, values in sets.items():
        missing = sorted(union - values)
        if missing:
            fail(f"{label} missing table(s): {', '.join(missing)}")
    if not any(union - values for values in sets.values()):
        passed(f"Table truth parity: {len(union)} tables agree across SQL, Drizzle and module ownership")

    for table in sorted(set(drizzle) & set(sql)):
        dcols = drizzle[table]
        scols = sql[table]
        missing_drizzle = sorted(set(scols) - set(dcols))
        missing_sql = sorted(set(dcols) - set(scols))
        if missing_drizzle:
            fail(f"Drizzle {table} missing SQL column(s): {', '.join(missing_drizzle)}")
        if missing_sql:
            fail(f"SQL {table} missing Drizzle column(s): {', '.join(missing_sql)}")
        for col in sorted(set(dcols) & set(scols)):
            if dcols[col] != scols[col]:
                fail(f"Type mismatch {table}.{col}: Drizzle={dcols[col]}, SQL={scols[col]}")
    if not any("missing SQL column" in f or "missing Drizzle column" in f or "Type mismatch" in f for f in FAILURES):
        passed("Column/type parity: SQL and Drizzle agree for all foundation tables")

    stripped = strip_sql_comments("\n".join(read(p) for p in sorted(MIGRATION_DIR.glob("*.sql"))))
    destructive = re.findall(r"\b(DROP|TRUNCATE)\b", stripped, flags=re.I)
    if destructive:
        fail(f"Destructive migration keyword(s) present: {', '.join(destructive)}")
    else:
        passed("Migration policy: no DROP/TRUNCATE in F4 migrations")

    sql_indexes = set(re.findall(r"CREATE\s+(?:UNIQUE\s+)?INDEX\s+([a-z_][a-z0-9_]*)", combined_sql, re.I))
    drizzle_text = "\n".join(read(p) for p in SCHEMA_FILES)
    drizzle_indexes = set(re.findall(r"\bindex\(\s*['\"]([^'\"]+)['\"]", drizzle_text))
    if sql_indexes != drizzle_indexes:
        fail(f"Index truth mismatch: SQL-only={sorted(sql_indexes-drizzle_indexes)}, Drizzle-only={sorted(drizzle_indexes-sql_indexes)}")
    else:
        passed(f"Index parity: {len(sql_indexes)} named indexes agree")

    migration_0002 = read(MIGRATION_DIR / "0002_f4_integrity_hardening.sql")
    added_constraints = set(re.findall(r"ADD\s+CONSTRAINT\s+([a-z_][a-z0-9_]*)", migration_0002, re.I))
    drizzle_checks = set(re.findall(r"\bcheck\(\s*['\"]([^'\"]+)['\"]", drizzle_text))
    drizzle_fk_names = set(re.findall(r"name\s*:\s*['\"]([^'\"]+)['\"]", drizzle_text))
    missing_constraint_projection = sorted(added_constraints - (drizzle_checks | drizzle_fk_names))
    if missing_constraint_projection:
        fail(f"F4 hardening constraint(s) missing from Drizzle projection: {', '.join(missing_constraint_projection)}")
    else:
        passed(f"F4 hardening constraint parity: {len(added_constraints)} named constraints projected")

    required_named_fks = {"identity_account_roles_role_set_fk", "runtime_setting_application_history_fk"}
    sql_named = set(re.findall(r"ADD\s+CONSTRAINT\s+([a-z_][a-z0-9_]*)\s+FOREIGN\s+KEY", combined_sql, re.I))
    drizzle_named = set(re.findall(r"name\s*:\s*['\"]([^'\"]+)['\"]", drizzle_text))
    for name in required_named_fks:
        if name not in sql_named or name not in drizzle_named:
            fail(f"Named cross-table integrity constraint missing from SQL/Drizzle parity: {name}")
    if required_named_fks <= sql_named and required_named_fks <= drizzle_named:
        passed("Cross-table named FK parity verified")

    for trigger in ("audit_records_no_update", "audit_records_no_delete"):
        if not re.search(rf"CREATE\s+TRIGGER\s+{re.escape(trigger)}\b", combined_sql, re.I):
            fail(f"Audit append-only trigger missing: {trigger}")
    if not re.search(r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+taymex_reject_audit_mutation\b", combined_sql, re.I):
        fail("Audit append-only rejection function missing")
    else:
        passed("Audit append-only controls present at database layer")


def check_exports_and_access_patterns() -> None:
    for package in ("identity", "audit", "settings-runtime", "observability"):
        index = ROOT / f"packages/{package}/src/index.ts"
        if re.search(r"\bMemory[A-Za-z0-9_]*\b", read(index)):
            fail(f"Production index exports a Memory implementation: {index.relative_to(ROOT)}")
    if not any("Production index exports" in f for f in FAILURES):
        passed("Test-only memory implementations are absent from production package entry points")

    roles = read(ROOT / "packages/identity/src/roles.ts")
    if "findRolesByIds(normalized)" not in roles or not re.search(r"resolveAccountRoles\([^)]*accountId", roles, re.I):
        fail("Role access path is not using the required set-based/snapshot store operations")
    else:
        passed("Role assignment/resolution uses set-based store operations")
    settings = read(ROOT / "packages/settings-runtime/src/service.ts")
    if "findCurrentMany<T>(coordinates)" not in settings:
        fail("Settings effective resolution is not using batched scope retrieval")
    else:
        passed("Settings effective resolution uses batched scope retrieval")

    transaction_services = [
        ROOT / "packages/identity/src/authentication.ts",
        ROOT / "packages/identity/src/roles.ts",
        ROOT / "packages/settings-runtime/src/service.ts",
    ]
    for path in transaction_services:
        content = read(path)
        if "private readonly transactions: AtomicTransactionBoundary" not in content or "return this.transactions.run(work);" not in content:
            fail(f"Atomic transaction boundary is not mandatory in {path.relative_to(ROOT)}")
        if "transactions?: AtomicTransactionBoundary" in content or "this.transactions ?" in content:
            fail(f"Optional atomicity fallback remains in {path.relative_to(ROOT)}")
    if not any("Atomic transaction boundary" in f or "Optional atomicity fallback" in f for f in FAILURES):
        passed("Identity, Role and Settings mutations require an explicit atomic transaction boundary")

    todo_matches: list[str] = []
    for package in ("foundation", "data-postgres", "identity", "settings-runtime", "audit", "observability"):
        for path in (ROOT / "packages" / package).rglob("*"):
            if path.is_file() and path.suffix in {".ts", ".mjs", ".sql", ".yaml", ".yml"} and "dist" not in path.parts:
                text = read(path)
                if re.search(r"\b(TODO|FIXME|HACK)\b", text, re.I):
                    todo_matches.append(str(path.relative_to(ROOT)))
    if todo_matches:
        fail(f"Unregistered TODO/FIXME/HACK marker(s) in F1-F4 source: {', '.join(todo_matches[:10])}")
    else:
        passed("No TODO/FIXME/HACK markers in reviewed F1-F4 source")


def check_artifact_bootstrap_and_toolchain() -> None:
    runtime_lock_path = ROOT / ".platform/runtime.lock.yaml"
    workspace_path = ROOT / "pnpm-workspace.yaml"
    package_path = ROOT / "package.json"
    project_profile_path = ROOT / "blueprints/project-profiles/taymex.yaml"
    lockfile_path = ROOT / "pnpm-lock.yaml"

    runtime_lock = yaml.safe_load(read(runtime_lock_path)) or {}
    workspace = yaml.safe_load(read(workspace_path)) or {}
    package = json.loads(read(package_path))
    project_profile = yaml.safe_load(read(project_profile_path)) or {}
    artifacts = runtime_lock.get("artifacts") or []
    overrides = workspace.get("overrides") or {}

    locked_by_name: dict[str, dict] = {}
    for artifact in artifacts:
        name = artifact.get("name")
        if not isinstance(name, str) or name in locked_by_name:
            fail(f"Runtime artifact name is missing or duplicated: {name!r}")
            continue
        locked_by_name[name] = artifact
        rel = artifact.get("file")
        path = ROOT / str(rel)
        if not path.exists():
            fail(f"Locked runtime artifact is missing: {rel}")
            continue
        actual_hash = sha256(path)
        actual_size = path.stat().st_size
        if actual_hash != artifact.get("sha256"):
            fail(f"Runtime artifact hash mismatch for {name}: {actual_hash}")
        if actual_size != artifact.get("size"):
            fail(f"Runtime artifact size mismatch for {name}: {actual_size}")
        expected_override = f"file:{rel}"
        if overrides.get(name) != expected_override:
            fail(f"Bootstrap override mismatch for {name}: expected {expected_override!r}, found {overrides.get(name)!r}")
        try:
            with tarfile.open(path, "r:gz") as tf:
                member = tf.extractfile("package/package.json")
                if member is None:
                    raise ValueError("package/package.json missing")
                manifest = json.loads(member.read().decode("utf-8"))
        except Exception as exc:
            fail(f"Unable to inspect runtime artifact {name}: {exc}")
            continue
        if manifest.get("name") != name or manifest.get("version") != artifact.get("version"):
            fail(
                f"Runtime artifact identity mismatch for {name}: "
                f"package={manifest.get('name')}@{manifest.get('version')}, lock={name}@{artifact.get('version')}"
            )
        for section in ("dependencies", "optionalDependencies"):
            for dependency, requested in (manifest.get(section) or {}).items():
                if not dependency.startswith("@engineering-platform/"):
                    continue
                target = locked_by_name.get(dependency)
                if target is None:
                    fail(f"Internal artifact dependency is outside runtime.lock closure: {name} -> {dependency}@{requested}")
                elif requested != target.get("version"):
                    fail(
                        f"Internal artifact dependency version mismatch: {name} -> {dependency}@{requested}, "
                        f"locked={target.get('version')}"
                    )

    if set(overrides) != set(locked_by_name):
        fail(
            "Bootstrap override/runtime.lock name mismatch: "
            f"override-only={sorted(set(overrides)-set(locked_by_name))}, "
            f"lock-only={sorted(set(locked_by_name)-set(overrides))}"
        )
    if not any("Runtime artifact" in f or "Bootstrap override" in f or "Internal artifact" in f for f in FAILURES):
        passed(f"Artifact bootstrap closure: {len(locked_by_name)} locked artifacts resolve locally with verified identity/hash/size")

    package_manager = package.get("packageManager")
    engine = (package.get("engines") or {}).get("node")
    node_types = (package.get("devDependencies") or {}).get("@types/node")
    profile_node = ((project_profile.get("runtime") or {}).get("node"))
    lock_text = read(lockfile_path)
    toolchain_errors: list[str] = []
    if package_manager != "pnpm@11.24.0":
        toolchain_errors.append(f"packageManager={package_manager!r}")
    if profile_node != "24.x":
        toolchain_errors.append(f"profile runtime.node={profile_node!r}")
    if engine != ">=24 <25":
        toolchain_errors.append(f"engines.node={engine!r}")
    if node_types != "24.13.3":
        toolchain_errors.append(f"@types/node={node_types!r}")
    if not re.search(r"'@types/node':\s*\n\s*specifier:\s*24\.13\.3\s*\n\s*version:\s*24\.13\.3", lock_text):
        toolchain_errors.append("pnpm-lock root @types/node specifier is not exactly 24.13.3")
    if "onlyBuiltDependencies" in workspace:
        toolchain_errors.append("deprecated/duplicate onlyBuiltDependencies is present")
    if workspace.get("allowBuilds") != {"esbuild": True, "nx": True}:
        toolchain_errors.append(f"allowBuilds={workspace.get('allowBuilds')!r}")
    if toolchain_errors:
        fail("Node/pnpm toolchain truth mismatch: " + "; ".join(toolchain_errors))
    else:
        passed("Toolchain truth: pnpm 11.24.0, Node 24.x engine/profile, exact Node 24 types, and one build-script allow-list agree")


def check_maturity_integrity() -> None:
    path = ROOT / "blueprints/foundation/foundation.manifest.yaml"
    f4_proof_path = ROOT / "docs/evidence/F4_POSTGRESQL18_PROOF.md"
    f5_proof_path = ROOT / "docs/evidence/F5_HTTP_SECURITY_PROOF.md"
    manifest = yaml.safe_load(read(path))
    foundation = manifest.get("foundation") or {}
    current_stage = foundation.get("currentStage")
    lawful_post_f4_stages = {"F5", "F6", "F7", "F8", "F9", "F10"}
    if current_stage not in lawful_post_f4_stages:
        fail(f"Foundation stage regressed before the accepted F4 closure: currentStage={current_stage!r}")
    else:
        passed(f"Maturity integrity: F4 remains closed while foundation lawfully progresses at {current_stage}")
    if not f4_proof_path.exists():
        fail("F4 PostgreSQL 18 evidence file is missing")

    proven_data = {
        "data.postgresql-runtime",
        "data.migrations-integrity",
        "data.transactions-concurrency-idempotency",
    }
    f5_dependent = {
        "identity.authentication-sessions",
        "authorization.permissions-policies",
        "settings.effective-runtime",
        "audit.core",
        "observability.logging-tracing-health",
        "api.contracts",
        "security.application-baseline",
    }
    capability_by_id = {c.get("id"): c for c in manifest.get("capabilities") or []}
    for cid in proven_data:
        capability = capability_by_id.get(cid) or {}
        if capability.get("currentMaturity") != "PROVEN":
            fail(f"F4 data capability was not preserved at PROVEN maturity: {cid}={capability.get('currentMaturity')!r}")
        if capability.get("remaining"):
            fail(f"F4 data capability declares unresolved F4 work after proof: {cid}: {capability.get('remaining')}")
    if not any("F4 data capability" in f for f in FAILURES):
        passed("F4 data maturity remains PROVEN with no reopened F4 work")

    promoted_f5 = [cid for cid in f5_dependent if (capability_by_id.get(cid) or {}).get("currentMaturity") in {"PROVEN", "PRODUCTION_PROVEN"}]
    if promoted_f5:
        if not f5_proof_path.exists() or "**PROVEN**" not in read(f5_proof_path):
            fail(f"F5-dependent capabilities are PROVEN without accepted F5 runtime evidence: {sorted(promoted_f5)}")
        elif current_stage == "F5":
            fail(f"F5-dependent capabilities are PROVEN while currentStage is still F5: {sorted(promoted_f5)}")
        else:
            passed("F2/F3/API/security maturity is backed by separate accepted F5 runtime proof rather than inherited from F4")
    else:
        passed("F2/F3/API/security maturity has not been inherited from F4 data proof")


def main() -> int:
    check_context()
    check_schema_truth()
    check_exports_and_access_patterns()
    check_artifact_bootstrap_and_toolchain()
    check_maturity_integrity()
    for message in PASSES:
        print(f"PASS: {message}")
    if FAILURES:
        for message in FAILURES:
            print(f"FAIL: {message}", file=sys.stderr)
        print(f"SUMMARY: FAIL ({len(FAILURES)} finding(s), {len(PASSES)} passed checks)", file=sys.stderr)
        return 1
    print(f"SUMMARY: PASS ({len(PASSES)} checks)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

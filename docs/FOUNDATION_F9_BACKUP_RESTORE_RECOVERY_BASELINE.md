# Foundation F9: Backup, Restore & Recovery Baseline Architecture

## 1. Executive Summary

This architecture decision baseline establishes the executable **Recovery Authority** for TAYMEX (`operations/f9/recovery.authority.yaml`) and provides deterministic local verification of the end-to-end database recovery lifecycle on **PostgreSQL 18**.

In accordance with TAYMEX platform principles, a backup file alone is never considered proof of recovery capability. Real disaster recovery readiness requires proving:
1. Deterministic database backup creation (`pg_dump -Fc --no-owner --no-privileges`).
2. Cryptographic backup identity and SHA-256 integrity verification.
3. Isolated, clean destination database provisioning (restoring into a clean database, never the live source).
4. Full relational schema, migration history, foreign key constraints, indexes, triggers, and record integrity verification.
5. Functional application readiness verification against the restored database state.
6. Strict negative proof: detection and preflight rejection of tampered/corrupted backup archives.

---

## 2. Recovery Authority Specification

The machine-readable authority at `operations/f9/recovery.authority.yaml` governs disaster recovery policies across environments:

* **Backup Strategy:** Logical portable archive (`pg_dump`) in PostgreSQL custom archive format (`-Fc`) with explicit UTF-8 character encoding and server data page checksum validation.
* **Restore Strategy:** Isolated clean destination restore (`pg_restore`) with `--single-transaction` and `--exit-on-error`.
* **Integrity Gate:** Mandatory SHA-256 checksum verification before any restore attempt.
* **Security & Least Privilege:**
  - Encryption at rest and in transit required.
  - Dedicated backup role with read-only least-privilege access.
  - Strict redaction of secrets, passwords, and sensitive payloads from logs, manifests, and command outputs.
  - Failure-domain separation between live database workloads and backup storage.
* **Continuous Backup & PITR:**
  - Logical portable dumps serve as baseline disaster recovery.
  - Continuous WAL archiving and Point-in-Time Recovery (PITR) are mandatory for production, marked `PENDING_PROVIDER_SELECTION` until cloud infrastructure is selected.
* **RPO & RTO Targets:**
  - Recovery Point Objective (RPO) and Recovery Time Objective (RTO) are strictly governed by Business Impact Analysis (BIA) and marked `PENDING_BIA` to avoid arbitrary estimations.
* **Media File Recovery:**
  - Marked `PENDING_PROVIDER` to be bound when the production blob storage provider is provisioned.

---

## 3. External Rules Library Consultation

As required by governance, external rules libraries were consulted and evaluated:

| Rule / Library File | Classification | Applied Architecture Decision |
| :--- | :--- | :--- |
| `SECURITY_PROTECTION_RULES_LIBRARY / 05_DATA_CRYPTO_FILES / 13_backup-restore-security.md` | **ADOPT** | Mandates tested restore drills, SHA-256 integrity preflight, least-privilege roles, encryption, and failure-domain separation. |
| `SECURITY_PROTECTION_RULES_LIBRARY / 07_LOGGING_INCIDENT_RESILIENCE / 08_ransomware-resilience.md` | **ADAPT** | Immutability and offline storage protection defined in policy, with production activation status set to `PENDING_PROVIDER_SELECTION`. |
| `SECURITY_PROTECTION_RULES_LIBRARY / 05_DATA_CRYPTO_FILES / 07_sensitive-log-redaction.md` | **ADOPT** | Database passwords and connection strings are completely redacted from evidence, test outputs, and manifests. |
| `PERFORMANCE_SPEED_RULES_LIBRARY / 00_MEASUREMENT_SLOS / 01_measure-before-optimize.md` | **ADOPT** | Record execution durations (dump, restore, verification) and archive sizes as baseline observations without creating synthetic SLA gates. |
| `DESIGNMOTION_UX_UI_RULES_LIBRARY` | **NOT APPLICABLE** | F9-002 is a backend database disaster recovery baseline; no UI components or visual interfaces are introduced. |

---

## 4. Local PostgreSQL 18 Recovery Drill & Negative Proof

The automated drill (`scripts/drill-f9-recovery.py`) executes:
1. **Source State Verification**: Confirms PostgreSQL major version 18, seeds deterministic multi-module fixtures (identity accounts, credentials, roles, settings history, append-only audit records, idempotency keys), and records baseline counts.
2. **Deterministic Backup**: Creates `pg_dump -Fc` archive, calculates SHA-256 hash and size.
3. **Isolated Destination Restore**: Creates clean database `taymex_recovery_test_db` and restores using `pg_restore`.
4. **Deep Invariant Verification**: Validates 100% schema match, all tables present, exact record counts match, specific fixture fields match, append-only audit trigger `taymex_reject_audit_mutation()` is strictly enforced in the restored database, and application database readiness query returns `UP`.
5. **Negative Proof**: Mutates archive bytes, verifies SHA-256 mismatch, and proves the pre-restore integrity gate strictly rejects the corrupted archive.
6. **Clean Teardown**: Drops test database and cleans temporary files.

---

## 5. Capability Maturity & Remaining Items

* **Capability:** `operations.backup-restore`
* **Current Maturity:** `IMPLEMENTED` (advanced from `DESIGNED`)
* **Exit Maturity:** `PROVEN`
* **Remaining Items for Production Exit:**
  1. Select cloud deployment profile and provision encrypted, immutable offsite backup storage.
  2. Complete Business Impact Analysis (BIA) to establish formal RPO and RTO SLA targets.
  3. Configure and prove continuous WAL streaming / cloud-managed PITR engine.
  4. Execute periodic production restore drills with failover runbook validation.
  5. Prove media/file storage recovery once cloud object storage provider is active.

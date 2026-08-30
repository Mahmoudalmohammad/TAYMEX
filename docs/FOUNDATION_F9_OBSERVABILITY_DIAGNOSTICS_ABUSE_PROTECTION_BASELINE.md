# Foundation F9: Production Observability, Diagnostics & Deployment Abuse Protection Baseline

**Stage:** F9 — Operations / Production Readiness  
**Task:** F9-003 — Production Observability, Diagnostics & Deployment Abuse Protection Baseline  
**Authority Owner:** `operations/f9/production-delivery.authority.yaml`  
**Capability Status:** `operations.environment-secrets-delivery` (`IMPLEMENTED`)

---

## 1. Architectural Intent & Scope

In stages F4–F8, application-level logging, correlation services, in-memory rate limiting, and health probes were implemented within individual service boundaries. However, production readiness requires formal operational authorities and automated proof covering:

1. **Production Logging Contract:** Standardized line-delimited JSON format, UTC ISO-8601 timestamps, service and release identity, non-leaking correlation IDs, and strict recursive redaction of credentials, session secrets, tokens, and database DSNs.
2. **Production Diagnostics Contract:** Unambiguous architectural separation between **process liveness** (`/api/health` without external dependencies), **dependency readiness** (`/api/health/ready` checking PostgreSQL), **runtime diagnostics**, **telemetry export**, and **alerting**.
3. **Deployment Abuse Protection Baseline:** Explicit separation between local in-process throttling (for defense-in-depth) and multi-instance distributed edge protection (governed by the chosen deployment profile and edge/gateway provider).

---

## 2. Canonical Contracts & Architecture Decisions

### 2.1 Single Authority Ownership
All production observability, diagnostics, and deployment abuse policies are integrated directly into the canonical **`operations/f9/production-delivery.authority.yaml`**. No duplicate or competing authority models (such as `ObservabilityAuthorityV2` or `EdgeSecurityNew`) are created.

### 2.2 Vendor-Neutral Telemetry Boundary
- The application emits unbuffered line-delimited JSON logs to `stdout`/`stderr`.
- Log ingestion and forwarding to central storage is the responsibility of the deployment collector or sidecar (e.g., Vector, Fluentbit, or cloud-native collector).
- Metrics export and distributed tracing are marked **`PENDING_PROVIDER_PROFILE`** to prevent inventing artificial local implementations before cloud infrastructure selection.

### 2.3 Strict Redaction Invariants
- **Headers:** `Authorization` header values are stripped from all logs and diagnostic payloads.
- **Cookies & Sessions:** Session IDs and cookie secrets are never recorded in logs or error bodies.
- **Credentials & DSNs:** Plaintext passwords, Argon2/Bcrypt hashes, and connection strings containing database passwords (`postgres://...:...@`) are strictly redacted recursively.
- **Error Masks:** Internal stack traces are never exposed in client-facing HTTP response bodies; only safe, canonical error descriptors (`code`, `category`, `messageKey`, `correlationId`) are returned.

### 2.4 Diagnostics Separation
- **Liveness (`/api/health`):** Validates that the Node.js/Fastify process is running and accepting events. It must **never** query external databases or third-party APIs.
- **Readiness (`/api/health/ready`):** Queries registered critical dependencies (`postgresql`). Returns `READY` (200) when all checks pass, and fails closed (`NOT_READY` / 503) if any dependency is down.
- **Diagnostics Metadata:** Diagnostic envelopes expose only safe metadata (`service`, `version`, `environment`, `buildRevision`, `checkedAt`) and never configuration secrets.

### 2.5 Multi-Instance Abuse Protection & Edge Boundary
- **Local Process Layer:** Fastify enforces body size limits (default 1MB, configurable up to 4MB), 15-second request timeouts, 240-character parameter limits, prototype poisoning protection, strict CORS allowlists, and per-process memory throttling.
- **Production Edge Layer:** Multi-instance distributed rate limiting, IP reputation filtering, WAF inspection, and sign-in brute-force protection are designated as edge/gateway responsibilities and remain **`PENDING_PROVIDER_PROFILE`** until production cloud profile selection.

---

## 3. External Rules Library Consultation Summary

| Rules Library | Rule File | Classification | Applied Architecture Decision |
| :--- | :--- | :--- | :--- |
| `SECURITY_PROTECTION_RULES_LIBRARY` | `05_DATA_CRYPTO_FILES/07_sensitive-log-redaction.md` | **ADOPT** | Strict recursive redaction of secrets, tokens, passwords, hashes, DSNs, and Authorization headers across all logs and error descriptors. |
| `SECURITY_PROTECTION_RULES_LIBRARY` | `07_LOGGING_INCIDENT_RESILIENCE/01_security-event-logging.md` | **ADOPT** | Structured JSON format, ISO-8601 timestamps, lowercase event codes, and consistent request-to-response correlation ID propagation. |
| `SECURITY_PROTECTION_RULES_LIBRARY` | `01_IDENTITY_AUTHENTICATION/04_login-throttling-credential-stuffing.md` | **ADOPT** | Per-process login throttling with distinct limits for sensitive authentication and password-reset flows. |
| `SECURITY_PROTECTION_RULES_LIBRARY` | `00_GOVERNANCE_FOUNDATIONS/03_threat-modeling-abuse-cases.md` | **ADAPT** | Formalized multi-instance edge abuse protection requirements in the authority while marking distributed enforcement `PENDING_PROVIDER_PROFILE`. |
| `PERFORMANCE_SPEED_RULES_LIBRARY` | `09_OBSERVABILITY_PROFILING/01_metrics-traces-logs.md` | **ADAPT** | Adopted vendor-neutral structured logging and process diagnostics; marked OpenTelemetry metrics and trace exporters `PENDING_PROVIDER_PROFILE`. |
| `PERFORMANCE_SPEED_RULES_LIBRARY` | `00_MEASUREMENT_SLOS/01_measure-before-optimize.md` | **ADOPT** | Recorded request duration, log payload size, and readiness execution time as observation baselines without imposing arbitrary SLA gates. |
| `DESIGNMOTION_UX_UI_RULES_LIBRARY` | - | **NOT APPLICABLE** | F9-003 is a backend observability and operational security baseline; no UI components or visual flows are introduced. |

---

## 4. Capability Maturity & Retained Production Gaps

* **Capability:** `operations.environment-secrets-delivery` (`IMPLEMENTED`)
* **Capability:** `observability.logging-tracing-health` (`PROVEN` at application layer; operational delivery baseline verified)
* **Retained Production Items (Intentionally Pending):**
  1. Production telemetry collector and log delivery pipeline configuration on selected cloud provider.
  2. Metrics exporter (e.g. Prometheus/OTel) and distributed tracing exporter integration.
  3. Edge/WAF provider configuration (e.g. Cloudflare/AWS WAF) for distributed IP rate limiting and DDoS protection.
  4. Central alerting rules for error budget exhaustion and dependency outages.

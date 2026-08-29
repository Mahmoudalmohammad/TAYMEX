#!/usr/bin/env python3
"""Deterministic F7 files/events/notifications/side-effect verifier.

This gate preserves the F7 construction rules and verifies the accepted exact-SHA
real filesystem/PostgreSQL closure evidence after F7 is promoted to PROVEN.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
PASS: list[tuple[str, str]] = []
FAIL: list[tuple[str, str]] = []


def text(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def check(name: str, condition: bool, detail: str = "") -> None:
    (PASS if condition else FAIL).append((name, detail))


def mapping(value: object) -> dict:
    return value if isinstance(value, dict) else {}


def list_value(value: object) -> list:
    return value if isinstance(value, list) else []


manifest = yaml.safe_load(text("blueprints/foundation/foundation.manifest.yaml"))
foundation = mapping(mapping(manifest).get("foundation"))
capabilities = {
    item.get("id"): item
    for item in list_value(mapping(manifest).get("capabilities"))
    if isinstance(item, dict)
}
files_cap = mapping(capabilities.get("files.media-storage"))
notify_cap = mapping(capabilities.get("notifications.events-side-effects"))
check("F7 closure advances foundation to F8 readiness", foundation.get("currentStage") == "F8", str(foundation.get("currentStage")))
proof_path = "docs/evidence/F7_FILES_SIDE_EFFECTS_REAL_PROOF.md"
for cid, capability in (("files.media-storage", files_cap), ("notifications.events-side-effects", notify_cap)):
    check(f"{cid} is PROVEN from exact-SHA real proof", capability.get("currentMaturity") == "PROVEN", str(capability.get("currentMaturity")))
    check(f"{cid} has no unresolved F7 work after proof", not list_value(capability.get("remaining")), str(capability.get("remaining")))
    check(f"{cid} cites the accepted F7 proof", proof_path in list_value(capability.get("evidence")))

root_package = json.loads(text("package.json"))
scripts = mapping(root_package.get("scripts"))
check("Root exposes generated event binding check", scripts.get("events:check") == "python3 scripts/generate-event-bindings.py --check")
check("Root exposes F7 structural verifier", scripts.get("f7:verify") == "python3 scripts/verify-f7-files-side-effects.py")
check("Root exposes explicit PostgreSQL 18 F7 proof command", scripts.get("f7:test:postgres") == "node --test apps/api/tests/f7-files-side-effects.integration.test.mjs")

registry = yaml.safe_load(text("tooling/registry/events.registry.yaml"))
events = [mapping(item) for item in list_value(mapping(registry).get("events"))]
by_id = {item.get("id"): item for item in events}
secret_event = mapping(by_id.get("notification.secret-delivery.requested"))
check("Canonical notification event is registry-owned by notifications", secret_event.get("owner") == "notifications")
check("Canonical secret-delivery event is sensitive outbox delivery", secret_event.get("delivery") == "outbox" and secret_event.get("classification") == "sensitive")
check("Canonical secret-delivery event declares deliveryId idempotency", secret_event.get("idempotencyKey") == "deliveryId")
check("Notification event id is unique in canonical registry", sum(1 for item in events if item.get("id") == "notification.secret-delivery.requested") == 1)

generator = text("scripts/generate-event-bindings.py")
identity_generated = text("packages/identity/src/generated/events.generated.ts")
notification_generated = text("packages/notifications/src/generated/events.generated.ts")
check("Event generation remains owner-scoped rather than duplicating a second registry", "tooling/registry/events.registry.yaml" in generator and "item.get('owner') == owner" in generator)
check("Identity generated binding does not gain unrelated notification descriptors", "identityEventDescriptors" not in identity_generated)
check("Notification generated descriptor derives the canonical event metadata", "notificationEventDescriptors" in notification_generated and '"idempotencyKey": "deliveryId"' in notification_generated)

media_manifest = yaml.safe_load(text("packages/media-storage/module.manifest.yaml"))
check("Media package is foundation-owned and DB-neutral", media_manifest.get("layer") == "foundation" and mapping(media_manifest.get("data")).get("adapter") == "none")
check("Media package owns no database table", not list_value(mapping(media_manifest.get("data")).get("owns")))
media_contracts = text("packages/media-storage/src/contracts.ts")
media_validation = text("packages/media-storage/src/validation.ts")
media_service = text("packages/media-storage/src/service.ts")
media_fs = text("packages/media-storage/src/filesystem-provider.ts")
media_sanitizer = text("packages/media-storage/src/image-sanitizer.ts")
media_tests = text("packages/media-storage/tests/media-storage.test.mjs")
check("Media contract supports only the narrow JPEG/PNG allowlist", "['image/jpeg', 'image/png']" in media_contracts and "pdf" not in media_contracts.lower() and "svg" not in media_contracts.lower())
check("Media classifications exclude public serving", "['internal', 'confidential', 'restricted']" in media_contracts)
check("Media storage is provider-neutral behind an explicit port", "interface MediaStorageProvider" in media_contracts and all(name in media_contracts for name in ["put(", "get(", "remove("]))
check("Media access decisions are explicit for upload/read/delete", all(name in media_contracts for name in ["canUpload", "canDownload", "canDelete"]))
check("Media runtime validates classification rather than trusting TypeScript only", "requireMediaClassification" in media_validation and "requireMediaClassification(input.classification)" in media_service)
check("Trusted MIME is derived from bytes", "detectMediaMime(input.bytes)" in media_service and "PNG_SIGNATURE" in media_validation and "0xff" in media_validation)
check("Declared MIME mismatch fails closed", "MIME_MISMATCH" in media_service)
check("Original extension must agree with detected content", "requireMatchingOriginalExtension" in media_service and "FILE_EXTENSION_MISMATCH" in media_service)
check("Upload size is bounded before storage", "input.bytes.length > this.#maxUploadBytes" in media_service and "50 * 1024 * 1024" in media_service)
check("Upload path requires authorization before storage", "this.access.canUpload" in media_service and media_service.index("this.access.canUpload") < media_service.index("this.storage.put"))
check("Stored key is generated opaque UUID rather than original filename", "requireMediaId(this.#nextId()" in media_service and "storageKey: id" in media_service and "originalName" not in re.search(r"#path\(key: string, extension: string\).*?\n  }", media_fs, re.S).group(0))
check("Stored content integrity is SHA-256 verified on download", "sha256Hex(sanitized)" in media_service and "MEDIA_INTEGRITY_FAILED" in media_service)
check("Filesystem adapter creates/tightens private root and exclusive files", "mode: 0o700" in media_fs and "chmod(this.#root, 0o700)" in media_fs and "open(path, 'wx', mode)" in media_fs and "0o600" in media_fs)
check("Filesystem adapter rejects non-opaque traversal keys", "INVALID_STORAGE_KEY" in media_fs and "dirname(candidate) !== this.#root" in media_fs)
check("Failed sidecar commit cleans a newly written binary", "if (binaryCommitted) await rm(binaryPath" in media_fs)
check("PNG sanitizer validates CRC and safe dimensions", "crc32(" in media_sanitizer and "MAX_IMAGE_PIXELS" in media_sanitizer and "PNG dimensions exceed the safe image bound" in media_sanitizer)
check("Media sanitizer decodes and re-encodes instead of trusting source metadata containers", "import sharp from 'sharp'" in media_sanitizer and ".metadata()" in media_sanitizer and ".toBuffer()" in media_sanitizer and "withMetadata" not in media_sanitizer)
check("JPEG path is intentionally baseline-only and dimension bounded", "Only baseline JPEG frames are accepted" in media_sanitizer and "MAX_IMAGE_PIXELS" in media_sanitizer)
check("Media sanitizer rejects trailing/polyglot data", "trailing data" in media_sanitizer and "contains trailing data" in media_sanitizer)
check("Media service writes audit evidence for sensitive upload/download/delete", all(action in media_service for action in ["media.uploaded", "media.downloaded", "media.deleted"]) and "AuditRecorder" in media_service)
check("Upload compensates stored content when audit persistence fails", "await this.storage.remove(metadata.storageKey).catch" in media_service)
check("Delete compensates removal when audit persistence fails", "await this.storage.put(object)" in media_service and "Media deletion audit failed" in media_service)
check("Filesystem read validates stored metadata before access policy consumes it", "deserializeMetadata" in media_fs and "MEDIA_METADATA_INVALID" in media_fs and "requireMediaClassification" in media_fs)
for phrase in ["opaque keys", "FILE_EXTENSION_MISMATCH", "MIME_MISMATCH", "INVALID_MEDIA_CLASSIFICATION", "INVALID_ORIGINAL_NAME", "badCrc", "MEDIA_ACCESS_DENIED", "EEXIST", "trailing polyglot", "audit failure", "delete audit failure"]:
    check(f"Media regression proof covers {phrase}", phrase in media_tests)

notifications_manifest = yaml.safe_load(text("packages/notifications/module.manifest.yaml"))
notification_data = mapping(notifications_manifest.get("data"))
check("Notifications owns the outbox table rather than persistence infrastructure", notification_data.get("owns") == ["db.table.foundation_outbox_messages"])
check("Notifications owns its Drizzle schema projection", notification_data.get("adapter") == "drizzle-postgres" and notification_data.get("schemaRoots") == ["packages/notifications/src/schema.ts"])
notification_schema = text("packages/notifications/src/schema.ts")
check("Notification schema projects the dedupe key as a unique index", "uniqueIndex('foundation_outbox_dedupe_key_idx')" in notification_schema)

notification_contracts = text("packages/notifications/src/contracts.ts")
notification_crypto = text("packages/notifications/src/crypto.ts")
notification_outbox = text("packages/notifications/src/outbox.ts")
notification_store = text("packages/notifications/src/postgres-store.ts")
notification_tests = text("packages/notifications/tests/notifications.test.mjs")
check("Notification provider is an explicit replaceable port", "interface NotificationProvider" in notification_contracts and "send(request: NotificationProviderRequest)" in notification_contracts)
check("Provider template contract carries explicit locale and mandatory security classification", "locale: string" in notification_contracts and "mandatory: true" in notification_contracts and "locale: requireLocale(recipient.locale)" in notification_outbox and "mandatory: true" in notification_outbox)
check("Provider request carries stable idempotency", "idempotencyKey: string" in notification_contracts and "idempotencyKey: job.dedupeKey" in notification_outbox)
check("Encrypted payload uses AES-256-GCM with random 12-byte IV and AAD", "aes-256-gcm" in notification_crypto and "randomBytes(12)" in notification_crypto and "setAAD" in notification_crypto)
check("Notification encryption key requires exactly 32 bytes", "key.length !== 32" in notification_crypto)
check("Secret delivery is encrypted before enqueue", notification_outbox.index("this.codec.encrypt") < notification_outbox.index("this.store.enqueue"))
check("Outbox dedupe is stable on deliveryId", "dedupeKey: `secret-delivery:${deliveryId}`" in notification_outbox)
check("Outbox processor has bounded claim/retry controls", all(token in notification_outbox for token in ["batchSize ?? 25", "1, 100", "maxAttempts ?? 5", "baseRetryDelayMs", "maxRetryDelayMs"]))
check("Outbox processor has terminal expired/dead behavior", "delivery-expired" in notification_outbox and "markDead" in notification_outbox)
check("PostgreSQL enqueue is idempotent on dedupe key", "ON CONFLICT (dedupe_key) DO NOTHING" in notification_store)
check("PostgreSQL concurrent claim uses SKIP LOCKED", "FOR UPDATE SKIP LOCKED" in notification_store)
check("PostgreSQL claim is bounded to 100", "input.limit > 100" in notification_store)
check("PostgreSQL processor lease is explicit and reclaimable", "lease_expires_at <= $1" in notification_store and "lease_token" in notification_store)
check("Persisted failure surface uses opaque error codes", "last_error_code" in notification_store and "normalizeErrorCode" in notification_outbox)
check("Notification unit proof covers encryption idempotency retry and expiry", all(phrase in notification_tests for phrase in ["encrypted before durable enqueue", "duplicate deliveryId is idempotent", "stable provider idempotency", "end in DEAD", "expired secret"]))

migration = text("packages/data-postgres/migrations/0003_f7_outbox.sql")
check("F7 migration is additive", re.search(r"\b(DROP|TRUNCATE|ALTER\s+TABLE\s+[^\n]+\s+DROP)\b", migration, re.I) is None)
check("F7 migration creates only the declared outbox table", migration.upper().count("CREATE TABLE") == 1 and "CREATE TABLE foundation_outbox_messages" in migration)
check("Outbox SQL does not persist plaintext secret or recipient address", "secret" not in re.sub(r"--[^\n]*", "", migration, flags=re.M).lower() and "recipient_address" not in migration.lower())
check("Outbox SQL has dedupe and bounded claim indexes", "foundation_outbox_dedupe_key_idx" in migration and "foundation_outbox_claim_idx" in migration)

identity = text("packages/identity/src/authentication.ts")
identity_contracts = text("packages/identity/src/contracts.ts")
check("Identity secret-delivery contract carries stable deliveryId", "deliveryId: string" in identity_contracts)
for anchor in ["requestPasswordReset", "requestEmailVerification"]:
    start = identity.index(f"async {anchor}")
    end = identity.find("\n  async ", start + 10)
    block = identity[start: end if end != -1 else len(identity)]
    check(f"{anchor} enqueues secret delivery inside atomic boundary", "await this.atomic(async () =>" in block and "await this.secretDelivery.deliver" in block)

runtime = text("apps/api/src/platform/runtime.ts")
f5_http = text("apps/api/tests/f5-http.integration.test.mjs")
check("API runtime requires outbox encryption key at startup", "requiredEnv('NOTIFICATION_OUTBOX_ENCRYPTION_KEY')" in runtime)
check("API runtime has no missing-key delivery fallback", "Secret delivery is unavailable because" not in runtime)
check("Existing real HTTP regression supplies the new required secret", "NOTIFICATION_OUTBOX_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString('base64')" in f5_http)

integration = text("apps/api/tests/f7-files-side-effects.integration.test.mjs")
for phrase in [
    "SHOW server_version_num",
    "F7_DATABASE_TESTS === '1'",
    "forced-after-outbox-enqueue",
    "challenge and outbox must roll back together",
    "persisted outbox row must not contain the decrypted delivery secret",
    "persisted outbox row must not contain the recipient address",
    "SKIP LOCKED claim must not hand one row to two processors",
    "provider_idempotency_key=PASS",
    "retry_dead_letter=PASS",
    "foundation_outbox_claim_idx",
]:
    check(f"F7 PostgreSQL proof contract covers {phrase}", phrase in integration)

package_surfaces = "\n".join([
    text("packages/media-storage/package.json"),
    text("packages/notifications/package.json"),
    text("apps/api/package.json"),
])
for forbidden in ["kafka", "rabbitmq", "bullmq", "redis", "@aws-sdk", "azure-storage", "google-cloud/storage", "k6", "artillery", "autocannon"]:
    check(f"F7 does not introduce generalized infrastructure dependency {forbidden}", forbidden not in package_surfaces.lower())
check("F7 creates no worker/scheduler package tree", not any(p.is_dir() for p in [ROOT / "packages/workers", ROOT / "packages/jobs", ROOT / "packages/queue", ROOT / "packages/broker"]))

proof = text(proof_path)
for phrase in [
    "**PROVEN**",
    "9affa751b5a5e3be9820aa1ff530be63fd571a33",
    "c3d865ee97f33c7d0247e00fdd02e0c771ea6f98",
    "v24.14.0",
    "11.24.0",
    "18.6 (Debian 18.6-1.pgdg13+2)",
    "180006",
    "d3fe0b65c9361df341248578b9fd5354818af997eb0d755049ea7f0c60f53f72",
    "packages/media-storage test: pass 6",
    "packages/media-storage test: fail 0",
    "f7.outbox.rollback_atomic=PASS",
    "f7.outbox.plaintext_persisted=false",
    "f7.outbox.concurrent_double_claim=false",
    "f7.outbox.provider_idempotency_key=PASS",
    "f7.outbox.retry_dead_letter=PASS",
    "foundation_outbox_claim_idx",
    "Consumer Boundary verification — PASS",
    "Handoff create/verify — PASS",
]:
    check(f"F7 closure proof records {phrase}", phrase in proof)

report = text("docs/FOUNDATION_F7_FILES_SIDE_EFFECTS_REPORT.md")
check("F7 report records the stage as CLOSED", "**Final stage decision:** **CLOSED**" in report and "F7                                     CLOSED" in report)
check("F7 report advances only to F8 readiness", "**Next foundation stage:** `F8`" in report and "implementation not started" in report)
check("F7 report explicitly rejects generalized broker/worker expansion", "generic worker/scheduler subsystem" in report and "Kafka" in report and "Generalized broker/worker framework    NOT INTRODUCED" in report)
check("F7 report preserves the narrow storage boundary", "Generalized storage ecosystem          NOT INTRODUCED" in report and "Public media/CDN serving                NOT INTRODUCED" in report)
check("F7 report does not claim arbitrary document safety", "does not claim safe handling for arbitrary document" in report)

for name, detail in PASS:
    print(f"PASS: {name}" + (f" — {detail}" if detail else ""))
for name, detail in FAIL:
    print(f"FAIL: {name}" + (f" — {detail}" if detail else ""))
print(f"SUMMARY: {'PASS' if not FAIL else 'FAIL'} ({len(PASS)} passed, {len(FAIL)} failed)")
raise SystemExit(1 if FAIL else 0)

// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/permissions.registry.yaml
// Source-SHA256: 40628fc90da5901bd13b3a42b7b74b0b2412f20d4c1f2d0ac185fbe1465e36e6
// Regenerate: python3 scripts/generate-permission-bindings.py

export const auditRecordsReadPermission = "audit.records.read" as const;

export const auditPermissionKeys = {
  "audit.records.read": auditRecordsReadPermission,
} as const;

export type GeneratedAuditPermissionKey = keyof typeof auditPermissionKeys;

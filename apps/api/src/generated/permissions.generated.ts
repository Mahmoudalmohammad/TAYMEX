// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/permissions.registry.yaml
// Source-SHA256: 40628fc90da5901bd13b3a42b7b74b0b2412f20d4c1f2d0ac185fbe1465e36e6
// Regenerate: python3 scripts/generate-permission-bindings.py

export const auditRecordsReadPermission = "audit.records.read" as const;
export const catalogProductsManagePermission = "catalog.products.manage" as const;
export const catalogProductsReadPermission = "catalog.products.read" as const;
export const identityAccountsManagePermission = "identity.accounts.manage" as const;
export const identityRolesManagePermission = "identity.roles.manage" as const;
export const identitySessionsManagePermission = "identity.sessions.manage" as const;
export const settingsValuesManagePermission = "settings.values.manage" as const;

export const permissionKeys = {
  "audit.records.read": auditRecordsReadPermission,
  "catalog.products.manage": catalogProductsManagePermission,
  "catalog.products.read": catalogProductsReadPermission,
  "identity.accounts.manage": identityAccountsManagePermission,
  "identity.roles.manage": identityRolesManagePermission,
  "identity.sessions.manage": identitySessionsManagePermission,
  "settings.values.manage": settingsValuesManagePermission,
} as const;

export type GeneratedPermissionKey = keyof typeof permissionKeys;

// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/permissions.registry.yaml
// Regenerate: python3 scripts/generate-permission-bindings.py

export const catalogProductsManagePermission = "catalog.products.manage" as const;
export const catalogProductsReadPermission = "catalog.products.read" as const;

export const permissionKeys = {
  "catalog.products.manage": catalogProductsManagePermission,
  "catalog.products.read": catalogProductsReadPermission,
} as const;

export type GeneratedPermissionKey = keyof typeof permissionKeys;

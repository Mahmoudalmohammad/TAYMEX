// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/permissions.registry.yaml
// Source-SHA256: 588e04d784e238f649b3ff8091a835f2698ba761d91d5c5541f25097c0cc4d51
// Regenerate: python3 scripts/generate-permission-bindings.py

export const catalogProductsManagePermission = "catalog.products.manage" as const;
export const catalogProductsReadPermission = "catalog.products.read" as const;

export const permissionKeys = {
  "catalog.products.manage": catalogProductsManagePermission,
  "catalog.products.read": catalogProductsReadPermission,
} as const;

export type GeneratedPermissionKey = keyof typeof permissionKeys;

// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/permissions.registry.yaml
// Source-SHA256: 40628fc90da5901bd13b3a42b7b74b0b2412f20d4c1f2d0ac185fbe1465e36e6
// Regenerate: python3 scripts/generate-permission-bindings.py

export const identityAccountsManagePermission = "identity.accounts.manage" as const;
export const identityRolesManagePermission = "identity.roles.manage" as const;
export const identitySessionsManagePermission = "identity.sessions.manage" as const;

export const identityPermissionKeys = {
  "identity.accounts.manage": identityAccountsManagePermission,
  "identity.roles.manage": identityRolesManagePermission,
  "identity.sessions.manage": identitySessionsManagePermission,
} as const;

export type GeneratedIdentityPermissionKey = keyof typeof identityPermissionKeys;

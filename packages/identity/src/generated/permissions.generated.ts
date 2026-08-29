// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/permissions.registry.yaml
// Source-SHA256: b11aa70dc1b74ed95d0cf6bf6b80859a06d68fd2452f3966331817fadc4472ed
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

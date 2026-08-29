// GENERATED FILE — DO NOT EDIT.
// Source: contracts/openapi/taymex-v1/source.openapi.yaml
// Operational: contracts/openapi/taymex-v1/openapi.generated.yaml
// Source-SHA256: 16192eed173a7e406e63a0fcd0a208544be5f259298114d915a5a872573760ff
// Regenerate: python3 scripts/generate-api-contract-bindings.py

export type ApiAuthenticationMode = 'public' | 'session';
export type ApiDataClassification = 'public' | 'internal' | 'confidential' | 'sensitive' | 'restricted';
export type ApiAssurance = 'AAL1' | 'AAL2';
export type ApiCachePolicy = 'no-store';
export type GeneratedApiOperation = Readonly<{
  operationId: string;
  method: string;
  path: string;
  nestPath: string;
  successStatus: number;
  auth: ApiAuthenticationMode;
  permission?: string;
  assurance?: ApiAssurance;
  classification: ApiDataClassification;
  cache: ApiCachePolicy;
  requiresJsonBody: boolean;
}>;

export type AssignRolesRequest = Readonly<{ readonly roleIds: readonly string[]; readonly expectedVersion: number; }>;
export type AuditRecordListResponse = Readonly<{ readonly items: readonly AuditRecordResponse[]; }>;
export type AuditRecordResponse = Readonly<{ readonly id: string; readonly occurredAt: string; readonly actionCode: string; readonly category: string; readonly severity: string; readonly actorKind: "account" | "system"; readonly actorId: string; readonly correlationId?: string; readonly resourceType?: string; readonly resourceId?: string; }>;
export type CreateRoleRequest = Readonly<{ readonly id: string; readonly name: string; readonly permissions: readonly string[]; }>;
export type ErrorEnvelope = Readonly<{ readonly error: Readonly<{ readonly code: string; readonly category: string; readonly messageKey: string; readonly field?: string; readonly correlationId: string; }>; }>;
export type RoleAssignmentResponse = Readonly<{ readonly version: number; }>;
export type RoleResponse = Readonly<{ readonly id: string; readonly name: string; readonly permissions: readonly string[]; readonly version: number; }>;
export type SessionActorResponse = Readonly<{ readonly accountId: string; readonly assurance: "AAL1" | "AAL2"; }>;
export type SettingEffectiveResponse = Readonly<{ readonly key: string; readonly value: string | number | boolean; readonly source: string; }>;
export type SettingWriteRequest = Readonly<{ readonly scope: "platform" | "project"; readonly scopeRef?: string; readonly value: string | number | boolean; readonly expectedVersion: number; readonly source?: string; }>;
export type SettingWriteResponse = Readonly<{ readonly key: string; readonly scope: string; readonly scopeRef?: string; readonly version: number; }>;
export type SignInRequest = Readonly<{ readonly email: string; readonly password: string; readonly clientLabel?: string; }>;

export const apiOperations = {
  healthLiveness: Object.freeze({operationId: "healthLiveness", method: "GET", path: "/api/health", nestPath: "health", successStatus: 200, auth: "public", classification: "internal", cache: "no-store", requiresJsonBody: false}) satisfies GeneratedApiOperation,
  healthReadiness: Object.freeze({operationId: "healthReadiness", method: "GET", path: "/api/health/ready", nestPath: "health/ready", successStatus: 200, auth: "public", classification: "internal", cache: "no-store", requiresJsonBody: false}) satisfies GeneratedApiOperation,
  authSignIn: Object.freeze({operationId: "authSignIn", method: "POST", path: "/api/auth/sign-in", nestPath: "auth/sign-in", successStatus: 200, auth: "public", classification: "sensitive", cache: "no-store", requiresJsonBody: true}) satisfies GeneratedApiOperation,
  authSignOut: Object.freeze({operationId: "authSignOut", method: "POST", path: "/api/auth/sign-out", nestPath: "auth/sign-out", successStatus: 204, auth: "session", classification: "sensitive", cache: "no-store", requiresJsonBody: false}) satisfies GeneratedApiOperation,
  authCurrentSession: Object.freeze({operationId: "authCurrentSession", method: "GET", path: "/api/auth/session", nestPath: "auth/session", successStatus: 200, auth: "session", classification: "sensitive", cache: "no-store", requiresJsonBody: false}) satisfies GeneratedApiOperation,
  adminCreateRole: Object.freeze({operationId: "adminCreateRole", method: "POST", path: "/api/admin/roles", nestPath: "admin/roles", successStatus: 201, auth: "session", classification: "confidential", cache: "no-store", requiresJsonBody: true, permission: "identity.roles.manage", assurance: "AAL2"}) satisfies GeneratedApiOperation,
  adminAssignRoles: Object.freeze({operationId: "adminAssignRoles", method: "PUT", path: "/api/admin/accounts/{accountId}/roles", nestPath: "admin/accounts/:accountId/roles", successStatus: 200, auth: "session", classification: "confidential", cache: "no-store", requiresJsonBody: true, permission: "identity.roles.manage", assurance: "AAL2"}) satisfies GeneratedApiOperation,
  adminQueryAudit: Object.freeze({operationId: "adminQueryAudit", method: "GET", path: "/api/admin/audit/records", nestPath: "admin/audit/records", successStatus: 200, auth: "session", classification: "sensitive", cache: "no-store", requiresJsonBody: false, permission: "audit.records.read", assurance: "AAL2"}) satisfies GeneratedApiOperation,
  adminGetSetting: Object.freeze({operationId: "adminGetSetting", method: "GET", path: "/api/admin/settings/{key}", nestPath: "admin/settings/:key", successStatus: 200, auth: "session", classification: "confidential", cache: "no-store", requiresJsonBody: false, permission: "settings.values.manage", assurance: "AAL2"}) satisfies GeneratedApiOperation,
  adminWriteSetting: Object.freeze({operationId: "adminWriteSetting", method: "PUT", path: "/api/admin/settings/{key}", nestPath: "admin/settings/:key", successStatus: 200, auth: "session", classification: "confidential", cache: "no-store", requiresJsonBody: true, permission: "settings.values.manage", assurance: "AAL2"}) satisfies GeneratedApiOperation,
} as const;

export type GeneratedApiOperationId = keyof typeof apiOperations;

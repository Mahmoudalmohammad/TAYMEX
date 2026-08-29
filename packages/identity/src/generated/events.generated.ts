// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/events.registry.yaml
// Source-SHA256: 2374f325747225f34088bb1e1acd656f388db35ec878a48ebcb45da3f6191f2c
// Regenerate: python3 scripts/generate-event-bindings.py

export const identityAccountProvisionedEvent = "identity.account.provisioned" as const;
export const identityAccountStatusChangedEvent = "identity.account.status-changed" as const;
export const identityEmailVerificationCompletedEvent = "identity.email-verification.completed" as const;
export const identityEmailVerificationRequestedEvent = "identity.email-verification.requested" as const;
export const identityPasswordResetCompletedEvent = "identity.password-reset.completed" as const;
export const identityPasswordResetRequestedEvent = "identity.password-reset.requested" as const;
export const identityPasswordChangedEvent = "identity.password.changed" as const;
export const identityRolesChangedEvent = "identity.roles.changed" as const;
export const identitySessionIssuedEvent = "identity.session.issued" as const;
export const identitySessionRevokedEvent = "identity.session.revoked" as const;
export const identitySessionRevokedAllEvent = "identity.session.revoked-all" as const;
export const identitySessionRotatedEvent = "identity.session.rotated" as const;
export const identitySignInFailedEvent = "identity.sign-in.failed" as const;
export const identitySignInSucceededEvent = "identity.sign-in.succeeded" as const;

export const identityEventIds = {
  "identity.account.provisioned": identityAccountProvisionedEvent,
  "identity.account.status-changed": identityAccountStatusChangedEvent,
  "identity.email-verification.completed": identityEmailVerificationCompletedEvent,
  "identity.email-verification.requested": identityEmailVerificationRequestedEvent,
  "identity.password-reset.completed": identityPasswordResetCompletedEvent,
  "identity.password-reset.requested": identityPasswordResetRequestedEvent,
  "identity.password.changed": identityPasswordChangedEvent,
  "identity.roles.changed": identityRolesChangedEvent,
  "identity.session.issued": identitySessionIssuedEvent,
  "identity.session.revoked": identitySessionRevokedEvent,
  "identity.session.revoked-all": identitySessionRevokedAllEvent,
  "identity.session.rotated": identitySessionRotatedEvent,
  "identity.sign-in.failed": identitySignInFailedEvent,
  "identity.sign-in.succeeded": identitySignInSucceededEvent,
} as const;

export type GeneratedIdentityEventId = keyof typeof identityEventIds;

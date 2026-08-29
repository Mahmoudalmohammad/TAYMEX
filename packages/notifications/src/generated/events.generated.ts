// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/events.registry.yaml
// Source-SHA256: 29099350d85f6e122c5f2a5f17bd1c6fe040461bf7018208449c26eeef07f689
// Regenerate: python3 scripts/generate-event-bindings.py

export const notificationSecretDeliveryRequestedEvent = "notification.secret-delivery.requested" as const;

export const notificationEventIds = {
  "notification.secret-delivery.requested": notificationSecretDeliveryRequestedEvent,
} as const;

export const notificationEventDescriptors = {
  "notification.secret-delivery.requested": Object.freeze({"id": "notification.secret-delivery.requested", "owner": "notifications", "version": 1, "delivery": "outbox", "classification": "sensitive", "lifecycle": "experimental", "idempotencyKey": "deliveryId"}),
} as const;

export type GeneratedNotificationEventId = keyof typeof notificationEventIds;

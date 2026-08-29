// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/settings.registry.yaml
// Source-SHA256: 6877862054fd902a1bcbd35ea6fc110dea3a2b6517343d8fd4df12c9f735adc9
// Regenerate: python3 scripts/generate-settings-bindings.py

import type { SettingDefinition } from '@engineering-platform/settings';

export type GeneratedManagedSettingDefinition<T> = SettingDefinition<T> & Readonly<{
  owner: string;
  kind: 'configuration' | 'preference' | 'feature-flag' | 'security-policy' | 'secret-reference' | 'invariant';
  lifecycle: 'experimental' | 'beta' | 'stable' | 'deprecated';
  runtimeBehavior: 'hot' | 'reload' | 'restart' | 'deploy';
  sensitive: boolean;
}>;

export const catalogProductsDefaultPageSizeSetting = {
  key: "catalog.products.defaultPageSize",
  owner: "catalog",
  kind: "configuration",
  lifecycle: "experimental",
  runtimeBehavior: "restart",
  valueType: "integer",
  resolution: "OVERRIDE",
  scopes: ["platform", "project"] as const,
  precedence: ["platform", "project"] as const,
  default: 25,
  minimum: 1,
  maximum: 100,
  sensitive: false,
} as const satisfies GeneratedManagedSettingDefinition<number>;

export const platformGovernanceEnforcementModeSetting = {
  key: "platform.governance.enforcementMode",
  owner: "platform-governance",
  kind: "invariant",
  lifecycle: "stable",
  runtimeBehavior: "deploy",
  valueType: "enum",
  resolution: "NO_OVERRIDE",
  scopes: ["platform"] as const,
  default: "enforce",
  enumValues: ["enforce"] as const,
  sensitive: false,
} as const satisfies GeneratedManagedSettingDefinition<"enforce">;

export const settingDefinitions = {
  "catalog.products.defaultPageSize": catalogProductsDefaultPageSizeSetting,
  "platform.governance.enforcementMode": platformGovernanceEnforcementModeSetting
} as const;

export type GeneratedSettingKey = keyof typeof settingDefinitions;

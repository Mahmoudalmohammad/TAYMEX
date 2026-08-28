// GENERATED FILE — DO NOT EDIT.
// Source: tooling/registry/settings.registry.yaml
// Regenerate: python3 scripts/generate-settings-bindings.py

import type { SettingDefinition } from '@engineering-platform/settings';

export const catalogProductsDefaultPageSizeSetting = {
  key: "catalog.products.defaultPageSize",
  valueType: "integer",
  resolution: "OVERRIDE",
  scopes: ["platform", "project"] as const,
  precedence: ["platform", "project"] as const,
  default: 25,
  minimum: 1,
  maximum: 100,
  sensitive: false,
} as const satisfies SettingDefinition<number>;

export const platformGovernanceEnforcementModeSetting = {
  key: "platform.governance.enforcementMode",
  valueType: "enum",
  resolution: "NO_OVERRIDE",
  scopes: ["platform"] as const,
  default: "enforce",
  enumValues: ["enforce"] as const,
  sensitive: false,
} as const satisfies SettingDefinition<"enforce">;

export const settingDefinitions = {
  "catalog.products.defaultPageSize": catalogProductsDefaultPageSizeSetting,
  "platform.governance.enforcementMode": platformGovernanceEnforcementModeSetting
} as const;

export type GeneratedSettingKey = keyof typeof settingDefinitions;

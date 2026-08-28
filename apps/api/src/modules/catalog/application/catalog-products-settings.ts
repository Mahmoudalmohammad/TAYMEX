import {
  explainSetting,
  resolveSettingValue,
  type ScopedSettingValue,
  type SettingResolutionTrace,
} from '@engineering-platform/settings';
import { catalogProductsDefaultPageSizeSetting } from '../../../generated/settings.generated.js';

export type CatalogProductsDefaultPageSizeSources = Readonly<{
  platform?: ScopedSettingValue<number>;
  project?: ScopedSettingValue<number>;
}>;

/**
 * Resolves the effective Products list page size from the canonical generated
 * setting definition. This adapter must not duplicate defaults, bounds, or
 * precedence rules from the settings registry.
 */
export function getCatalogProductsDefaultPageSize(
  sources: CatalogProductsDefaultPageSizeSources = {},
): number {
  return resolveSettingValue(catalogProductsDefaultPageSizeSetting, sources);
}

export function explainCatalogProductsDefaultPageSize(
  sources: CatalogProductsDefaultPageSizeSources = {},
): SettingResolutionTrace<number> {
  return explainSetting(catalogProductsDefaultPageSizeSetting, sources);
}

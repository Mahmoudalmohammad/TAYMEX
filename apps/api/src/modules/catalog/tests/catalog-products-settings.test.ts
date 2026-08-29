import assert from 'node:assert/strict';
import test from 'node:test';
import { SettingsResolutionError } from '@engineering-platform/settings';
import { catalogProductsDefaultPageSizeSetting } from '../../../generated/settings.generated.js';
import {
  explainCatalogProductsDefaultPageSize,
  getCatalogProductsDefaultPageSize,
} from '../application/catalog-products-settings.js';

test('uses the canonical registry default when no scoped value exists', () => {
  assert.equal(getCatalogProductsDefaultPageSize(), 25);
});

test('uses explicit project-over-platform precedence from the generated definition', () => {
  assert.equal(
    getCatalogProductsDefaultPageSize({
      platform: { value: 30, source: 'platform-config', version: 2 },
      project: { value: 40, source: 'taymex-project', version: 7 },
    }),
    40,
  );
});

test('falls back to the platform value when no project override exists', () => {
  assert.equal(
    getCatalogProductsDefaultPageSize({
      platform: { value: 35, source: 'platform-config', version: 4 },
    }),
    35,
  );
});

test('explain returns winner, source and version provenance', () => {
  const trace = explainCatalogProductsDefaultPageSize({
    platform: { value: 30, source: 'platform-config', version: 2 },
    project: { value: 50, source: 'taymex-project-settings', version: 9 },
  });

  assert.equal(trace.value, 50);
  assert.deepEqual(trace.winner, {
    scope: 'project',
    source: 'taymex-project-settings',
    version: 9,
  });
  assert.equal(trace.considered.find((item) => item.scope === 'platform')?.populated, true);
  assert.equal(trace.considered.find((item) => item.scope === 'project')?.populated, true);
});

test('rejects out-of-range configured values instead of clamping or silently falling back', () => {
  assert.throws(
    () => getCatalogProductsDefaultPageSize({ project: { value: 101 } }),
    (error: unknown) =>
      error instanceof SettingsResolutionError && error.code === 'SETTING_VALUE_INVALID',
  );

  assert.throws(
    () => getCatalogProductsDefaultPageSize({ platform: { value: 0 } }),
    (error: unknown) =>
      error instanceof SettingsResolutionError && error.code === 'SETTING_VALUE_INVALID',
  );
});


test('generated definition carries canonical administration metadata without changing resolution authority', () => {
  assert.equal(catalogProductsDefaultPageSizeSetting.owner, 'catalog');
  assert.equal(catalogProductsDefaultPageSizeSetting.kind, 'configuration');
  assert.equal(catalogProductsDefaultPageSizeSetting.lifecycle, 'experimental');
  assert.equal(catalogProductsDefaultPageSizeSetting.runtimeBehavior, 'restart');
  assert.deepEqual(catalogProductsDefaultPageSizeSetting.precedence, ['platform', 'project']);
  assert.equal(catalogProductsDefaultPageSizeSetting.default, 25);
});

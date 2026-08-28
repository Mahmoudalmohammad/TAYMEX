import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCT_ERROR_CODES,
  ProductDomainError,
  changeProductPublicationStatus,
  createProduct,
  productModelCodeComparisonKey,
  updateProduct,
} from '../domain/product.js';

const PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440000';
const CREATED_AT = new Date('2026-08-28T10:00:00.000Z');
const UPDATED_AT = new Date('2026-08-28T11:00:00.000Z');

function createValidProduct() {
  return createProduct({
    id: PRODUCT_ID,
    modelCode: '  UGP6R-78HBC  ',
    category: 'solar-panel',
    name: {
      ar: '  لوح شمسي  ',
      tr: '  Güneş paneli  ',
      en: '  Solar panel  ',
    },
    priceAmount: '125.50',
    priceCurrency: 'usd',
    now: CREATED_AT,
  });
}

function expectDomainError(
  action: () => unknown,
  code: (typeof PRODUCT_ERROR_CODES)[keyof typeof PRODUCT_ERROR_CODES],
  field?: string,
) {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof ProductDomainError);
    assert.equal(error.code, code);
    if (field) assert.equal(error.field, field);
    return true;
  });
}

test('creates canonical Product and normalizes localized values without floats', () => {
  const product = createValidProduct();

  assert.equal(product.id, PRODUCT_ID);
  assert.equal(product.modelCode, 'UGP6R-78HBC');
  assert.deepEqual(product.name, {
    ar: 'لوح شمسي',
    tr: 'Güneş paneli',
    en: 'Solar panel',
  });
  assert.equal(product.priceAmount, '125.50');
  assert.equal(product.priceCurrency, 'USD');
  assert.equal(typeof product.priceAmount, 'string');
  assert.equal(product.publicationStatus, 'draft');
  assert.equal(product.version, 1);
  assert.equal(product.createdAt.toISOString(), CREATED_AT.toISOString());
  assert.equal(product.updatedAt.toISOString(), CREATED_AT.toISOString());
});

test('provides a case-insensitive canonical model-code comparison key', () => {
  assert.equal(productModelCodeComparisonKey(' ugp6r-78hbc '), 'UGP6R-78HBC');
  assert.equal(
    productModelCodeComparisonKey('UGP75K-GP-LV-G10'),
    productModelCodeComparisonKey('ugp75k-gp-lv-g10'),
  );
});

test('requires all enabled localized names', () => {
  expectDomainError(
    () => createProduct({
      id: PRODUCT_ID,
      modelCode: 'UGP6-66HBD',
      category: 'solar-panel',
      name: { ar: 'لوح', tr: 'Panel', en: '   ' },
      now: CREATED_AT,
    }),
    PRODUCT_ERROR_CODES.validation,
    'name.en',
  );
});

test('requires price amount and currency as one atomic optional pair', () => {
  expectDomainError(
    () => createProduct({
      id: PRODUCT_ID,
      modelCode: 'UGP6-66HBD',
      category: 'solar-panel',
      name: { ar: 'لوح', tr: 'Panel', en: 'Panel' },
      priceAmount: '100',
      now: CREATED_AT,
    }),
    PRODUCT_ERROR_CODES.validation,
    'price',
  );

  expectDomainError(
    () => createProduct({
      id: PRODUCT_ID,
      modelCode: 'UGP6-66HBD',
      category: 'solar-panel',
      name: { ar: 'لوح', tr: 'Panel', en: 'Panel' },
      priceCurrency: 'USD',
      now: CREATED_AT,
    }),
    PRODUCT_ERROR_CODES.validation,
    'price',
  );
});

test('rejects malformed or negative decimal price without parsing through Number', () => {
  for (const invalidAmount of ['-1', '12.3456789', '1e3', 'NaN', '']) {
    expectDomainError(
      () => createProduct({
        id: PRODUCT_ID,
        modelCode: 'UGP6-66HBD',
        category: 'solar-panel',
        name: { ar: 'لوح', tr: 'Panel', en: 'Panel' },
        priceAmount: invalidAmount,
        priceCurrency: 'USD',
        now: CREATED_AT,
      }),
      PRODUCT_ERROR_CODES.validation,
      'priceAmount',
    );
  }
});



test('requires price fields to be updated together and can clear the pair atomically', () => {
  const product = createValidProduct();

  expectDomainError(
    () => updateProduct(product, {
      expectedVersion: 1,
      priceAmount: null,
      now: UPDATED_AT,
    }),
    PRODUCT_ERROR_CODES.validation,
    'price',
  );

  const cleared = updateProduct(product, {
    expectedVersion: 1,
    priceAmount: null,
    priceCurrency: null,
    now: UPDATED_AT,
  });
  assert.equal(cleared.priceAmount, null);
  assert.equal(cleared.priceCurrency, null);
});

test('rejects stale optimistic-concurrency writes before mutation', () => {
  const product = createValidProduct();

  expectDomainError(
    () => updateProduct(product, {
      expectedVersion: 2,
      name: { ar: 'جديد', tr: 'Yeni', en: 'New' },
      now: UPDATED_AT,
    }),
    PRODUCT_ERROR_CODES.versionConflict,
    'expectedVersion',
  );

  assert.equal(product.version, 1);
  assert.equal(product.name.en, 'Solar panel');
});

test('updates mutable fields and increments version exactly once', () => {
  const product = createValidProduct();
  const updated = updateProduct(product, {
    expectedVersion: 1,
    modelCode: ' UGP6R-78HBC-V2 ',
    name: { ar: 'لوح مطور', tr: 'Yeni panel', en: 'Updated panel' },
    priceAmount: '130',
    priceCurrency: 'eur',
    now: UPDATED_AT,
  });

  assert.equal(updated.version, 2);
  assert.equal(updated.modelCode, 'UGP6R-78HBC-V2');
  assert.equal(updated.priceAmount, '130');
  assert.equal(updated.priceCurrency, 'EUR');
  assert.equal(updated.updatedAt.toISOString(), UPDATED_AT.toISOString());
  assert.equal(product.version, 1);
});

test('allows explicit draft -> published -> draft transitions with version checks', () => {
  const product = createValidProduct();
  const published = changeProductPublicationStatus(product, {
    expectedVersion: 1,
    publicationStatus: 'published',
    now: UPDATED_AT,
  });
  const draft = changeProductPublicationStatus(published, {
    expectedVersion: 2,
    publicationStatus: 'draft',
    now: new Date('2026-08-28T12:00:00.000Z'),
  });

  assert.equal(published.publicationStatus, 'published');
  assert.equal(published.version, 2);
  assert.equal(draft.publicationStatus, 'draft');
  assert.equal(draft.version, 3);
});

test('archive is terminal and makes Product immutable in v0', () => {
  const product = createValidProduct();
  const archived = changeProductPublicationStatus(product, {
    expectedVersion: 1,
    publicationStatus: 'archived',
    now: UPDATED_AT,
  });

  assert.equal(archived.publicationStatus, 'archived');
  assert.equal(archived.version, 2);

  expectDomainError(
    () => updateProduct(archived, {
      expectedVersion: 2,
      modelCode: 'NEW-CODE',
      now: new Date('2026-08-28T12:00:00.000Z'),
    }),
    PRODUCT_ERROR_CODES.archived,
    'publicationStatus',
  );

  expectDomainError(
    () => changeProductPublicationStatus(archived, {
      expectedVersion: 2,
      publicationStatus: 'draft',
      now: new Date('2026-08-28T12:00:00.000Z'),
    }),
    PRODUCT_ERROR_CODES.archived,
    'publicationStatus',
  );
});

test('rejects creation as archived and same-state transitions explicitly', () => {
  expectDomainError(
    () => createProduct({
      id: PRODUCT_ID,
      modelCode: 'UGP6-66HBD',
      category: 'solar-panel',
      name: { ar: 'لوح', tr: 'Panel', en: 'Panel' },
      publicationStatus: 'archived',
      now: CREATED_AT,
    }),
    PRODUCT_ERROR_CODES.validation,
    'publicationStatus',
  );

  const product = createValidProduct();
  expectDomainError(
    () => changeProductPublicationStatus(product, {
      expectedVersion: 1,
      publicationStatus: 'draft',
      now: UPDATED_AT,
    }),
    PRODUCT_ERROR_CODES.invalidTransition,
    'publicationStatus',
  );
});

test('rejects mutation timestamps that move backwards', () => {
  const product = createValidProduct();
  expectDomainError(
    () => updateProduct(product, {
      expectedVersion: 1,
      modelCode: 'NEW',
      now: new Date('2026-08-28T09:00:00.000Z'),
    }),
    PRODUCT_ERROR_CODES.validation,
    'now',
  );
});

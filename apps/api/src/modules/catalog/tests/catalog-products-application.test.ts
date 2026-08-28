import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AuthorizationDeniedError,
  type AuthorizationSubject,
} from '@engineering-platform/authorization';
import {
  PRODUCT_ERROR_CODES,
  ProductDomainError,
  createProduct as createDomainProduct,
  productModelCodeComparisonKey,
  type Product,
} from '../domain/product.js';
import type {
  CatalogProductRepository,
  CreateProductPersistenceResult,
  ProductListRequest,
  ProductListResult,
  ReplaceProductPersistenceResult,
} from '../application/catalog-product-repository.js';
import {
  CATALOG_PRODUCTS_APPLICATION_ERROR_CODES,
  CatalogProductsApplicationError,
  CatalogProductsService,
} from '../application/catalog-products-service.js';

const READ = 'catalog.products.read';
const MANAGE = 'catalog.products.manage';
const PRODUCT_1 = '550e8400-e29b-41d4-a716-446655440001';
const PRODUCT_2 = '550e8400-e29b-41d4-a716-446655440002';
const PRODUCT_3 = '550e8400-e29b-41d4-a716-446655440003';
const T0 = new Date('2026-08-28T12:00:00.000Z');
const T1 = new Date('2026-08-28T13:00:00.000Z');

function subject(id: string, permissions: readonly string[]): AuthorizationSubject {
  return { id, permissions: new Set(permissions) };
}

class FixedClock {
  constructor(private current: Date) {}
  now(): Date { return new Date(this.current.getTime()); }
  set(value: Date): void { this.current = value; }
}

class SequenceIds {
  constructor(private readonly ids: string[]) {}
  next(): string {
    const value = this.ids.shift();
    if (!value) throw new Error('No test id available.');
    return value;
  }
}

class InMemoryProductRepository implements CatalogProductRepository {
  readonly products = new Map<string, Product>();
  lastListRequest: ProductListRequest | null = null;
  beforeReplace?: () => void;

  constructor(seed: readonly Product[] = []) {
    for (const product of seed) this.products.set(product.id, product);
  }

  async listPage(request: ProductListRequest): Promise<ProductListResult> {
    this.lastListRequest = request;
    const all = [...this.products.values()].sort((a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    return {
      items: all.slice(request.offset, request.offset + request.limit),
      total: all.length,
    };
  }

  async findById(id: string): Promise<Product | null> {
    return this.products.get(id) ?? null;
  }

  async create(input: Readonly<{ product: Product; modelCodeKey: string }>): Promise<CreateProductPersistenceResult> {
    if (this.hasModelCodeKey(input.modelCodeKey)) return { kind: 'duplicate-model-code' };
    this.products.set(input.product.id, input.product);
    return { kind: 'created' };
  }

  async replaceIfVersionMatches(input: Readonly<{
    product: Product;
    expectedVersion: number;
    modelCodeKey: string;
  }>): Promise<ReplaceProductPersistenceResult> {
    this.beforeReplace?.();
    const current = this.products.get(input.product.id);
    if (!current || current.version !== input.expectedVersion) return { kind: 'version-conflict' };
    if (this.hasModelCodeKey(input.modelCodeKey, input.product.id)) return { kind: 'duplicate-model-code' };
    this.products.set(input.product.id, input.product);
    return { kind: 'updated' };
  }

  private hasModelCodeKey(key: string, excludingId?: string): boolean {
    return [...this.products.values()].some((product) =>
      product.id !== excludingId && productModelCodeComparisonKey(product.modelCode) === key);
  }
}

function seedProduct(id: string, modelCode: string, createdAt = T0): Product {
  return createDomainProduct({
    id,
    modelCode,
    category: 'solar-panel',
    name: { ar: `منتج ${modelCode}`, tr: `Ürün ${modelCode}`, en: `Product ${modelCode}` },
    priceAmount: '100.00',
    priceCurrency: 'USD',
    now: createdAt,
  });
}

function service(repository: InMemoryProductRepository, clock = new FixedClock(T1)) {
  return new CatalogProductsService(repository, clock, new SequenceIds([PRODUCT_2, PRODUCT_3]));
}

function validCreateInput(actor: AuthorizationSubject) {
  return {
    subject: actor,
    modelCode: 'UGP-NEW-100',
    category: 'solar-panel' as const,
    name: { ar: 'لوح جديد', tr: 'Yeni panel', en: 'New panel' },
    priceAmount: '250.00',
    priceCurrency: 'USD',
  };
}

test('list requires read permission and uses canonical default bounded page size', async () => {
  const repository = new InMemoryProductRepository([seedProduct(PRODUCT_1, 'MODEL-1')]);
  const result = await service(repository).listProducts({
    subject: subject('reader', [READ]),
    page: 2,
  });

  assert.deepEqual(repository.lastListRequest, { offset: 25, limit: 25 });
  assert.equal(result.page, 2);
  assert.equal(result.pageSize, 25);
  assert.equal(result.total, 1);
  assert.equal(result.pageCount, 1);

  await assert.rejects(
    () => service(repository).listProducts({ subject: subject('manager-only', [MANAGE]) }),
    AuthorizationDeniedError,
  );
});

test('list uses explicit project-over-platform setting precedence without a local fallback', async () => {
  const repository = new InMemoryProductRepository();
  const result = await service(repository).listProducts({
    subject: subject('reader', [READ]),
    page: 3,
    pageSizeSources: {
      platform: { value: 30, source: 'platform' },
      project: { value: 40, source: 'taymex' },
    },
  });

  assert.deepEqual(repository.lastListRequest, { offset: 80, limit: 40 });
  assert.equal(result.pageSize, 40);
  assert.equal(result.pageCount, 0);
});

test('invalid or overflow page fails before repository access', async () => {
  for (const page of [0, -1, 1.5, Number.MAX_SAFE_INTEGER]) {
    const repository = new InMemoryProductRepository();
    await assert.rejects(
      () => service(repository).listProducts({ subject: subject('reader', [READ]), page }),
      (error: unknown) => error instanceof CatalogProductsApplicationError
        && error.code === CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.invalidPage,
    );
    assert.equal(repository.lastListRequest, null);
  }
});

test('create requires manage permission and persists the canonical Product', async () => {
  const repository = new InMemoryProductRepository();
  const actor = subject('manager', [MANAGE]);
  const created = await service(repository).createProduct(validCreateInput(actor));

  assert.equal(created.id, PRODUCT_2);
  assert.equal(created.modelCode, 'UGP-NEW-100');
  assert.equal(created.version, 1);
  assert.equal((await repository.findById(PRODUCT_2))?.id, PRODUCT_2);

  await assert.rejects(
    () => service(new InMemoryProductRepository()).createProduct(validCreateInput(subject('reader', [READ]))),
    AuthorizationDeniedError,
  );
});

test('create rejects duplicate model code using canonical normalized comparison', async () => {
  const repository = new InMemoryProductRepository([seedProduct(PRODUCT_1, 'UGP-NEW-100')]);
  await assert.rejects(
    () => service(repository).createProduct({
      ...validCreateInput(subject('manager', [MANAGE])),
      modelCode: '  ugp-new-100  ',
    }),
    (error: unknown) => error instanceof CatalogProductsApplicationError
      && error.code === CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.duplicateModelCode
      && error.field === 'modelCode',
  );
});

test('get Product requires read permission and exposes stable not-found error', async () => {
  const repository = new InMemoryProductRepository();
  await assert.rejects(
    () => service(repository).getProduct({ subject: subject('reader', [READ]), id: PRODUCT_1 }),
    (error: unknown) => error instanceof CatalogProductsApplicationError
      && error.code === CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.notFound,
  );
  await assert.rejects(
    () => service(repository).getProduct({ subject: subject('manager', [MANAGE]), id: PRODUCT_1 }),
    AuthorizationDeniedError,
  );
});

test('update reuses domain validation and compare-and-swap repository contract', async () => {
  const repository = new InMemoryProductRepository([seedProduct(PRODUCT_1, 'MODEL-1')]);
  const updated = await service(repository).updateProduct({
    subject: subject('manager', [MANAGE]),
    id: PRODUCT_1,
    expectedVersion: 1,
    modelCode: 'MODEL-2',
  });

  assert.equal(updated.modelCode, 'MODEL-2');
  assert.equal(updated.version, 2);
  assert.equal((await repository.findById(PRODUCT_1))?.version, 2);
});

test('a concurrent repository compare-and-swap loss becomes PRODUCT_VERSION_CONFLICT', async () => {
  const repository = new InMemoryProductRepository([seedProduct(PRODUCT_1, 'MODEL-1')]);
  repository.beforeReplace = () => {
    repository.beforeReplace = undefined;
    const current = repository.products.get(PRODUCT_1)!;
    repository.products.set(PRODUCT_1, Object.freeze({
      ...current,
      version: current.version + 1,
      updatedAt: new Date(current.updatedAt.getTime() + 1),
    }));
  };

  await assert.rejects(
    () => service(repository).updateProduct({
      subject: subject('manager', [MANAGE]),
      id: PRODUCT_1,
      expectedVersion: 1,
      modelCode: 'MODEL-2',
    }),
    (error: unknown) => error instanceof ProductDomainError
      && error.code === PRODUCT_ERROR_CODES.versionConflict
      && error.field === 'expectedVersion',
  );
});

test('update rejects a duplicate model code introduced by another Product', async () => {
  const repository = new InMemoryProductRepository([
    seedProduct(PRODUCT_1, 'MODEL-1'),
    seedProduct(PRODUCT_2, 'MODEL-2'),
  ]);

  await assert.rejects(
    () => service(repository).updateProduct({
      subject: subject('manager', [MANAGE]),
      id: PRODUCT_1,
      expectedVersion: 1,
      modelCode: ' model-2 ',
    }),
    (error: unknown) => error instanceof CatalogProductsApplicationError
      && error.code === CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.duplicateModelCode,
  );
});

test('publication status mutation uses the domain state machine and repository CAS', async () => {
  const repository = new InMemoryProductRepository([seedProduct(PRODUCT_1, 'MODEL-1')]);
  const catalog = service(repository);
  const published = await catalog.changePublicationStatus({
    subject: subject('manager', [MANAGE]),
    id: PRODUCT_1,
    expectedVersion: 1,
    publicationStatus: 'published',
  });
  assert.equal(published.publicationStatus, 'published');
  assert.equal(published.version, 2);

  const archived = await catalog.changePublicationStatus({
    subject: subject('manager', [MANAGE]),
    id: PRODUCT_1,
    expectedVersion: 2,
    publicationStatus: 'archived',
  });
  assert.equal(archived.publicationStatus, 'archived');
  assert.equal(archived.version, 3);

  await assert.rejects(
    () => catalog.updateProduct({
      subject: subject('manager', [MANAGE]),
      id: PRODUCT_1,
      expectedVersion: 3,
      modelCode: 'MODEL-X',
    }),
    (error: unknown) => error instanceof ProductDomainError
      && error.code === PRODUCT_ERROR_CODES.archived,
  );
});

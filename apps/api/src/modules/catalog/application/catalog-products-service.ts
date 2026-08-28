import { ApplicationError, ValidationError, requirePositiveSafeInteger, type Clock } from '@taymex/foundation';
import type { AuthorizationSubject } from '@engineering-platform/authorization';
import {
  PRODUCT_ERROR_CODES,
  ProductDomainError,
  changeProductPublicationStatus,
  createProduct,
  productModelCodeComparisonKey,
  updateProduct,
  type CreateProductInput,
  type LocalizedProductName,
  type Product,
  type ProductCategory,
  type ProductPublicationStatus,
} from '../domain/product.js';
import type { CatalogProductRepository } from './catalog-product-repository.js';
import { requireProductsManage, requireProductsRead } from './catalog-products-authorization.js';
import {
  getCatalogProductsDefaultPageSize,
  type CatalogProductsDefaultPageSizeSources,
} from './catalog-products-settings.js';

export const CATALOG_PRODUCTS_APPLICATION_ERROR_CODES = {
  notFound: 'CATALOG_PRODUCT_NOT_FOUND',
  duplicateModelCode: 'CATALOG_PRODUCT_DUPLICATE_MODEL_CODE',
  invalidPage: 'CATALOG_PRODUCT_INVALID_PAGE',
} as const;

export type CatalogProductsApplicationErrorCode =
  (typeof CATALOG_PRODUCTS_APPLICATION_ERROR_CODES)[keyof typeof CATALOG_PRODUCTS_APPLICATION_ERROR_CODES];

export class CatalogProductsApplicationError extends ApplicationError {
  readonly code: CatalogProductsApplicationErrorCode;

  constructor(code: CatalogProductsApplicationErrorCode, message: string, field?: string) {
    super({
      code,
      category: code === CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.notFound
        ? 'not-found'
        : code === CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.invalidPage
          ? 'validation'
          : 'conflict',
      message,
      safeMessageKey: `errors.catalog.products.${code.toLowerCase()}`,
      field,
    });
    this.name = 'CatalogProductsApplicationError';
    this.code = code;
  }
}


export interface ProductIdGenerator {
  next(): string;
}

export type ListProductsInput = Readonly<{
  subject: AuthorizationSubject;
  page?: number;
  pageSizeSources?: CatalogProductsDefaultPageSizeSources;
}>;

export type ProductPage = Readonly<{
  items: readonly Product[];
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
}>;

export type GetProductInput = Readonly<{
  subject: AuthorizationSubject;
  id: string;
}>;

export type CreateCatalogProductInput = Readonly<{
  subject: AuthorizationSubject;
  modelCode: string;
  category: ProductCategory;
  name: LocalizedProductName;
  priceAmount?: string | null;
  priceCurrency?: string | null;
  publicationStatus?: ProductPublicationStatus;
}>;

export type UpdateCatalogProductInput = Readonly<{
  subject: AuthorizationSubject;
  id: string;
  expectedVersion: number;
  modelCode?: string;
  category?: ProductCategory;
  name?: LocalizedProductName;
  priceAmount?: string | null;
  priceCurrency?: string | null;
}>;

export type ChangeCatalogProductStatusInput = Readonly<{
  subject: AuthorizationSubject;
  id: string;
  expectedVersion: number;
  publicationStatus: ProductPublicationStatus;
}>;

export class CatalogProductsService {
  constructor(
    private readonly repository: CatalogProductRepository,
    private readonly clock: Clock,
    private readonly idGenerator: ProductIdGenerator,
  ) {}

  async listProducts(input: ListProductsInput): Promise<ProductPage> {
    requireProductsRead(input.subject);

    const page = normalizePage(input.page ?? 1);
    const pageSize = getCatalogProductsDefaultPageSize(input.pageSizeSources);
    const offset = calculateOffset(page, pageSize);
    const result = await this.repository.listPage({ offset, limit: pageSize });

    return Object.freeze({
      items: Object.freeze([...result.items]),
      page,
      pageSize,
      total: result.total,
      pageCount: result.total === 0 ? 0 : Math.ceil(result.total / pageSize),
    });
  }

  async getProduct(input: GetProductInput): Promise<Product> {
    requireProductsRead(input.subject);
    return this.loadRequired(input.id);
  }

  async createProduct(input: CreateCatalogProductInput): Promise<Product> {
    requireProductsManage(input.subject);

    const product = createProduct({
      id: this.idGenerator.next(),
      modelCode: input.modelCode,
      category: input.category,
      name: input.name,
      priceAmount: input.priceAmount,
      priceCurrency: input.priceCurrency,
      publicationStatus: input.publicationStatus,
      now: this.clock.now(),
    } satisfies CreateProductInput);

    const result = await this.repository.create({
      product,
      modelCodeKey: productModelCodeComparisonKey(product.modelCode),
    });

    if (result.kind === 'duplicate-model-code') {
      throw duplicateModelCodeError();
    }

    return product;
  }

  async updateProduct(input: UpdateCatalogProductInput): Promise<Product> {
    requireProductsManage(input.subject);
    const current = await this.loadRequired(input.id);
    const updated = updateProduct(current, {
      expectedVersion: input.expectedVersion,
      modelCode: input.modelCode,
      category: input.category,
      name: input.name,
      priceAmount: input.priceAmount,
      priceCurrency: input.priceCurrency,
      now: this.clock.now(),
    });

    const result = await this.repository.replaceIfVersionMatches({
      product: updated,
      expectedVersion: input.expectedVersion,
      modelCodeKey: productModelCodeComparisonKey(updated.modelCode),
    });

    if (result.kind === 'duplicate-model-code') {
      throw duplicateModelCodeError();
    }
    if (result.kind === 'version-conflict') {
      throw repositoryVersionConflict(input.expectedVersion);
    }

    return updated;
  }

  async changePublicationStatus(input: ChangeCatalogProductStatusInput): Promise<Product> {
    requireProductsManage(input.subject);
    const current = await this.loadRequired(input.id);
    const updated = changeProductPublicationStatus(current, {
      expectedVersion: input.expectedVersion,
      publicationStatus: input.publicationStatus,
      now: this.clock.now(),
    });

    const result = await this.repository.replaceIfVersionMatches({
      product: updated,
      expectedVersion: input.expectedVersion,
      modelCodeKey: productModelCodeComparisonKey(updated.modelCode),
    });

    if (result.kind === 'duplicate-model-code') {
      throw duplicateModelCodeError();
    }
    if (result.kind === 'version-conflict') {
      throw repositoryVersionConflict(input.expectedVersion);
    }

    return updated;
  }

  private async loadRequired(id: string): Promise<Product> {
    const product = await this.repository.findById(id);
    if (!product) {
      throw new CatalogProductsApplicationError(
        CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.notFound,
        'Product was not found.',
        'id',
      );
    }
    return product;
  }
}

function normalizePage(page: number): number {
  try {
    return requirePositiveSafeInteger(page, 'page');
  } catch (error) {
    if (error instanceof ValidationError) {
      throw new CatalogProductsApplicationError(
        CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.invalidPage,
        'Page must be a positive safe integer.',
        'page',
      );
    }
    throw error;
  }
}

function calculateOffset(page: number, pageSize: number): number {
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset)) {
    throw new CatalogProductsApplicationError(
      CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.invalidPage,
      'Page is too large to calculate a safe bounded offset.',
      'page',
    );
  }
  return offset;
}

function duplicateModelCodeError(): CatalogProductsApplicationError {
  return new CatalogProductsApplicationError(
    CATALOG_PRODUCTS_APPLICATION_ERROR_CODES.duplicateModelCode,
    'A Product with the same model code already exists.',
    'modelCode',
  );
}

function repositoryVersionConflict(expectedVersion: number): ProductDomainError {
  return new ProductDomainError(
    PRODUCT_ERROR_CODES.versionConflict,
    `Product changed concurrently after version ${expectedVersion} was read.`,
    'expectedVersion',
  );
}

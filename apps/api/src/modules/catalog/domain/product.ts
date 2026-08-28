import {
  ApplicationError,
  MoneyError,
  ValidationError,
  money,
  requireNonBlank,
  requireOneOf,
  requireUuid,
  requireValidDate,
} from '@taymex/foundation';

export const PRODUCT_CATEGORIES = [
  'solar-panel',
  'lithium-battery',
  'high-voltage-lithium-battery',
  'inverter',
  'bipv',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const PRODUCT_PUBLICATION_STATUSES = ['draft', 'published', 'archived'] as const;

export type ProductPublicationStatus = (typeof PRODUCT_PUBLICATION_STATUSES)[number];

export type LocalizedProductName = Readonly<{
  ar: string;
  tr: string;
  en: string;
}>;

export type ProductPrice = Readonly<{
  /** Decimal string by design: money never enters the domain as binary floating point. */
  amount: string;
  /** Normalized uppercase three-letter currency code. */
  currency: string;
}>;

export type Product = Readonly<{
  id: string;
  modelCode: string;
  category: ProductCategory;
  name: LocalizedProductName;
  priceAmount: string | null;
  priceCurrency: string | null;
  publicationStatus: ProductPublicationStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}>;

export const PRODUCT_ERROR_CODES = {
  validation: 'PRODUCT_VALIDATION',
  versionConflict: 'PRODUCT_VERSION_CONFLICT',
  archived: 'PRODUCT_ARCHIVED',
  invalidTransition: 'PRODUCT_INVALID_TRANSITION',
} as const;

export type ProductErrorCode = (typeof PRODUCT_ERROR_CODES)[keyof typeof PRODUCT_ERROR_CODES];

export class ProductDomainError extends ApplicationError {
  readonly code: ProductErrorCode;

  constructor(code: ProductErrorCode, message: string, field?: string) {
    super({
      code,
      category: code === PRODUCT_ERROR_CODES.validation ? 'validation' : 'conflict',
      message,
      safeMessageKey: `errors.catalog.product.${code.toLowerCase()}`,
      field,
    });
    this.name = 'ProductDomainError';
    this.code = code;
  }
}

export type CreateProductInput = Readonly<{
  id: string;
  modelCode: string;
  category: ProductCategory;
  name: LocalizedProductName;
  priceAmount?: string | null;
  priceCurrency?: string | null;
  publicationStatus?: ProductPublicationStatus;
  now: Date;
}>;

export type UpdateProductInput = Readonly<{
  expectedVersion: number;
  modelCode?: string;
  category?: ProductCategory;
  name?: LocalizedProductName;
  priceAmount?: string | null;
  priceCurrency?: string | null;
  now: Date;
}>;

export type ChangeProductPublicationStatusInput = Readonly<{
  expectedVersion: number;
  publicationStatus: ProductPublicationStatus;
  now: Date;
}>;


export function productModelCodeComparisonKey(modelCode: string): string {
  return normalizeRequiredText(modelCode, 'modelCode').toLocaleUpperCase('en-US');
}

export function createProduct(input: CreateProductInput): Product {
  const id = normalizeUuid(input.id);
  const modelCode = normalizeRequiredText(input.modelCode, 'modelCode');
  const category = normalizeCategory(input.category);
  const name = normalizeLocalizedName(input.name);
  const price = normalizePrice(input.priceAmount, input.priceCurrency);
  const publicationStatus = normalizePublicationStatus(input.publicationStatus ?? 'draft');
  const now = normalizeDate(input.now, 'now');

  if (publicationStatus === 'archived') {
    throw validationError('publicationStatus', 'A Product cannot be created as archived.');
  }

  return freezeProduct({
    id,
    modelCode,
    category,
    name,
    priceAmount: price?.amount ?? null,
    priceCurrency: price?.currency ?? null,
    publicationStatus,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateProduct(product: Product, input: UpdateProductInput): Product {
  assertMutable(product);
  assertExpectedVersion(product, input.expectedVersion);
  const now = normalizeMutationTime(product, input.now);

  const modelCode = input.modelCode === undefined
    ? product.modelCode
    : normalizeRequiredText(input.modelCode, 'modelCode');
  const category = input.category === undefined ? product.category : normalizeCategory(input.category);
  const name = input.name === undefined ? product.name : normalizeLocalizedName(input.name);

  const amountSpecified = input.priceAmount !== undefined;
  const currencySpecified = input.priceCurrency !== undefined;
  if (amountSpecified !== currencySpecified) {
    throw validationError(
      'price',
      'priceAmount and priceCurrency must be updated together.',
    );
  }

  const price = amountSpecified
    ? normalizePrice(input.priceAmount, input.priceCurrency)
    : null;

  return freezeProduct({
    ...product,
    modelCode,
    category,
    name,
    priceAmount: amountSpecified ? (price?.amount ?? null) : product.priceAmount,
    priceCurrency: amountSpecified ? (price?.currency ?? null) : product.priceCurrency,
    version: product.version + 1,
    updatedAt: now,
  });
}

export function changeProductPublicationStatus(
  product: Product,
  input: ChangeProductPublicationStatusInput,
): Product {
  assertMutable(product);
  assertExpectedVersion(product, input.expectedVersion);
  const nextStatus = normalizePublicationStatus(input.publicationStatus);
  const now = normalizeMutationTime(product, input.now);

  if (product.publicationStatus === nextStatus) {
    throw new ProductDomainError(
      PRODUCT_ERROR_CODES.invalidTransition,
      `Product is already ${nextStatus}.`,
      'publicationStatus',
    );
  }

  if (!isAllowedTransition(product.publicationStatus, nextStatus)) {
    throw new ProductDomainError(
      PRODUCT_ERROR_CODES.invalidTransition,
      `Publication transition ${product.publicationStatus} -> ${nextStatus} is not allowed.`,
      'publicationStatus',
    );
  }

  return freezeProduct({
    ...product,
    publicationStatus: nextStatus,
    version: product.version + 1,
    updatedAt: now,
  });
}

function isAllowedTransition(
  current: ProductPublicationStatus,
  next: ProductPublicationStatus,
): boolean {
  if (current === 'archived') return false;
  if (current === 'draft') return next === 'published' || next === 'archived';
  return next === 'draft' || next === 'archived';
}

function assertMutable(product: Product): void {
  if (product.publicationStatus === 'archived') {
    throw new ProductDomainError(
      PRODUCT_ERROR_CODES.archived,
      'Archived Product is immutable in v0.',
      'publicationStatus',
    );
  }
}

function assertExpectedVersion(product: Product, expectedVersion: number): void {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) {
    throw validationError('expectedVersion', 'Expected version must be a positive integer.');
  }

  if (product.version !== expectedVersion) {
    throw new ProductDomainError(
      PRODUCT_ERROR_CODES.versionConflict,
      `Stale Product version. Expected ${expectedVersion}, current ${product.version}.`,
      'expectedVersion',
    );
  }
}

function normalizeLocalizedName(name: LocalizedProductName): LocalizedProductName {
  return Object.freeze({
    ar: normalizeRequiredText(name.ar, 'name.ar'),
    tr: normalizeRequiredText(name.tr, 'name.tr'),
    en: normalizeRequiredText(name.en, 'name.en'),
  });
}

function normalizePrice(
  rawAmount: string | null | undefined,
  rawCurrency: string | null | undefined,
): ProductPrice | null {
  const hasAmount = rawAmount !== undefined && rawAmount !== null;
  const hasCurrency = rawCurrency !== undefined && rawCurrency !== null;

  if (!hasAmount && !hasCurrency) return null;

  if (hasAmount !== hasCurrency) {
    throw validationError(
      'price',
      'priceAmount and priceCurrency must either both be present or both be absent.',
    );
  }

  try {
    const parsed = money(rawAmount as string, rawCurrency as string, {
      maxScale: 6,
      allowNegative: false,
    });
    return Object.freeze({ amount: parsed.amount, currency: parsed.currency });
  } catch (error) {
    if (error instanceof MoneyError) {
      const field = error.code === 'MONEY_INVALID_CURRENCY' ? 'priceCurrency' : 'priceAmount';
      throw validationError(field, error.message);
    }
    throw error;
  }
}

function normalizeUuid(id: string): string {
  try {
    return requireUuid(id, 'id');
  } catch (error) {
    if (error instanceof ValidationError) throw validationError('id', error.message);
    throw error;
  }
}

function normalizeCategory(category: ProductCategory): ProductCategory {
  try {
    return requireOneOf(category, PRODUCT_CATEGORIES, 'category');
  } catch (error) {
    if (error instanceof ValidationError) {
      throw validationError('category', `Unsupported Product category: ${String(category)}.`);
    }
    throw error;
  }
}

function normalizePublicationStatus(status: ProductPublicationStatus): ProductPublicationStatus {
  try {
    return requireOneOf(status, PRODUCT_PUBLICATION_STATUSES, 'publicationStatus');
  } catch (error) {
    if (error instanceof ValidationError) {
      throw validationError(
        'publicationStatus',
        `Unsupported publication status: ${String(status)}.`,
      );
    }
    throw error;
  }
}

function normalizeRequiredText(value: string, field: string): string {
  try {
    return requireNonBlank(value, field);
  } catch (error) {
    if (error instanceof ValidationError) throw validationError(field, `${field} must not be empty.`);
    throw error;
  }
}

function normalizeDate(value: Date, field: string): Date {
  try {
    return requireValidDate(value, field);
  } catch (error) {
    if (error instanceof ValidationError) throw validationError(field, `${field} must be a valid Date.`);
    throw error;
  }
}

function normalizeMutationTime(product: Product, value: Date): Date {
  const normalized = normalizeDate(value, 'now');
  if (normalized.getTime() < product.updatedAt.getTime()) {
    throw validationError('now', 'Mutation time cannot be earlier than the current Product update time.');
  }
  return normalized;
}

function freezeProduct(product: Product): Product {
  return Object.freeze({
    ...product,
    name: Object.freeze({ ...product.name }),
    createdAt: new Date(product.createdAt.getTime()),
    updatedAt: new Date(product.updatedAt.getTime()),
  });
}

function validationError(field: string, message: string): ProductDomainError {
  return new ProductDomainError(PRODUCT_ERROR_CODES.validation, message, field);
}

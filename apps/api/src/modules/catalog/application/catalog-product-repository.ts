import type { Product } from '../domain/product.js';

export type ProductListRequest = Readonly<{
  offset: number;
  limit: number;
}>;

export type ProductListResult = Readonly<{
  items: readonly Product[];
  total: number;
}>;

export type CreateProductPersistenceResult =
  | Readonly<{ kind: 'created' }>
  | Readonly<{ kind: 'duplicate-model-code' }>;

export type ReplaceProductPersistenceResult =
  | Readonly<{ kind: 'updated' }>
  | Readonly<{ kind: 'duplicate-model-code' }>
  | Readonly<{ kind: 'version-conflict' }>;

/**
 * Persistence port for the Catalog Product aggregate.
 *
 * A production adapter MUST implement replaceIfVersionMatches as an atomic
 * compare-and-swap against expectedVersion. Loading a row and then performing
 * an unconditional update does not satisfy this contract.
 */
export interface CatalogProductRepository {
  listPage(request: ProductListRequest): Promise<ProductListResult>;
  findById(id: string): Promise<Product | null>;

  create(input: Readonly<{
    product: Product;
    modelCodeKey: string;
  }>): Promise<CreateProductPersistenceResult>;

  replaceIfVersionMatches(input: Readonly<{
    product: Product;
    expectedVersion: number;
    modelCodeKey: string;
  }>): Promise<ReplaceProductPersistenceResult>;
}

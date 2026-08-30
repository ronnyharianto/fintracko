/**
 * Shared category domain types.
 *
 * Client-safe: contains type definitions only, no server-only imports.
 */

import type { TransactionType } from "../../../generated/prisma/enums";

export type { TransactionType };

/** SubCategory view returned by the categories list endpoint. */
export interface SubCategoryView {
  id: string;
  name: string;
  isArchived: boolean;
  createdAt: string;
}

/** Category view with nested subcategories. */
export interface CategoryView {
  id: string;
  name: string;
  type: TransactionType;
  isArchived: boolean;
  subCategories: SubCategoryView[];
  createdAt: string;
}

/** Form data for creating a category. */
export interface CategoryFormData {
  name: string;
  type: TransactionType;
}

/** Form data for creating a subcategory. */
export interface SubCategoryFormData {
  name: string;
}

/** Response shape from the categories list endpoint. */
export interface CategoryListResponse {
  categories: CategoryView[];
}

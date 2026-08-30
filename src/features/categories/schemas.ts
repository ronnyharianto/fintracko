/**
 * Zod schemas for category validation.
 *
 * All incoming payloads are validated using strict Zod schema validation
 * before reaching the service layer (§4 — validate all untrusted input).
 */

import { z } from "zod";
import { TransactionType } from "../../../generated/prisma/enums";

/**
 * Transaction type enum derived from the Prisma-generated TransactionType
 * so the Zod schema stays in sync with the database schema.
 */
export const TransactionTypeEnum = z.enum(
  Object.values(TransactionType) as [string, ...string[]],
);

/** Category name field validation. */
export const CategoryNameSchema = z
  .string()
  .min(1, "Category name is required")
  .max(100, "Category name must be at most 100 characters");

/** SubCategory name field validation. */
export const SubCategoryNameSchema = z
  .string()
  .min(1, "Subcategory name is required")
  .max(100, "Subcategory name must be at most 100 characters");

/** Create category request schema. */
export const CreateCategorySchema = z.object({
  name: CategoryNameSchema,
  type: TransactionTypeEnum,
});

/** Update category request schema (type not editable). */
export const UpdateCategorySchema = z.object({
  name: CategoryNameSchema,
});

/** Create subcategory request schema. */
export const CreateSubCategorySchema = z.object({
  name: SubCategoryNameSchema,
});

/** Update subcategory request schema. */
export const UpdateSubCategorySchema = z.object({
  name: SubCategoryNameSchema,
});

/** Type inference from schemas. */
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CreateSubCategoryInput = z.infer<typeof CreateSubCategorySchema>;
export type UpdateSubCategoryInput = z.infer<typeof UpdateSubCategorySchema>;

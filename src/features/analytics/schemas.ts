/**
 * Zod schemas for analytics query validation (§4 — validate all untrusted
 * input).
 */

import { z } from "zod";
import { TransactionType } from "../../../generated/prisma/enums";

/**
 * Transaction type enum derived from the Prisma-generated `TransactionType` so
 * the schema cannot drift from the database.
 */
export const TransactionTypeEnum = z.enum(
  Object.values(TransactionType) as [string, ...string[]],
);

/** Query parameters for the analytics summary endpoint. */
export const AnalyticsQuerySchema = z
  .object({
    type: TransactionTypeEnum,
    /** First day of the viewed window; defaults to the current month. */
    from: z.iso.date().optional(),
    /** Last day of the viewed window; defaults to the current month. */
    to: z.iso.date().optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: "`from` must not be after `to`.",
    path: ["from"],
  });

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>;

/** Transaction type stored in the analytics page URL. */
export type AnalyticsViewType =
  (typeof TransactionType)[keyof typeof TransactionType];

/** Parsed state that the analytics page keeps in its URL. */
export interface AnalyticsViewParams {
  type: AnalyticsViewType;
  range: { from: string; to: string };
  /** Drilled category, restored when returning from the transactions page. */
  categoryId?: string;
}

const AnalyticsViewDateSchema = z.iso.date();
const AnalyticsViewCategorySchema = z.uuid();

/**
 * Parse the analytics view from page query parameters.
 *
 * Each field falls back independently so one malformed parameter does not
 * discard the rest of the view. The date range only survives when both dates
 * are valid ISO dates in the correct order.
 */
export function parseAnalyticsViewParams(
  params: { get(name: string): string | null },
  fallback: { type: AnalyticsViewType; from: string; to: string },
): AnalyticsViewParams {
  const type = TransactionTypeEnum.safeParse(params.get("type"));
  const from = AnalyticsViewDateSchema.safeParse(params.get("from"));
  const to = AnalyticsViewDateSchema.safeParse(params.get("to"));
  const categoryId = AnalyticsViewCategorySchema.safeParse(
    params.get("categoryId"),
  );

  const range =
    from.success && to.success && from.data <= to.data
      ? { from: from.data, to: to.data }
      : { from: fallback.from, to: fallback.to };

  return {
    type: type.success ? (type.data as AnalyticsViewType) : fallback.type,
    range,
    categoryId: categoryId.success ? categoryId.data : undefined,
  };
}

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

/**
 * Zod schemas for budget validation.
 *
 * All incoming payloads are validated with strict Zod schema validation before
 * reaching the service layer (§4 — validate all untrusted input).
 */

import { z } from "zod";
import { BudgetInterval } from "../../../generated/prisma/enums";
import { OPEN_ENDED_DATE, isRangeAligned } from "./utilization";

/**
 * Interval enum derived from the Prisma-generated `BudgetInterval` so the Zod
 * schema stays in sync with the database schema.
 */
export const BudgetIntervalEnum = z.enum(
  Object.values(BudgetInterval) as [string, ...string[]],
);

const RANGE_ALIGNMENT_MESSAGE =
  "A budget must start on the first day of a month or year and end on the last day of one.";

/**
 * Create budget request schema.
 *
 * The range may span many periods (that is what makes a budget recurring) or
 * exactly one. Omitting `endDate` creates an open-ended budget.
 */
export const CreateBudgetSchema = z
  .object({
    subCategoryId: z.uuid(),
    amount: z.number().positive("Amount must be greater than zero"),
    interval: BudgetIntervalEnum,
    startDate: z.iso.date(),
    endDate: z.iso.date().optional(),
  })
  .refine(
    (data) =>
      isRangeAligned(
        data.interval as BudgetInterval,
        data.startDate,
        data.endDate ?? OPEN_ENDED_DATE,
      ),
    { message: RANGE_ALIGNMENT_MESSAGE, path: ["endDate"] },
  );

/**
 * Update budget request schema.
 *
 * `interval` is intentionally absent: it is fixed at creation and cannot be
 * changed. `splitFrom` asks the service to keep earlier periods untouched,
 * ending the current range the day before and starting a new one there.
 */
export const UpdateBudgetSchema = z.object({
  subCategoryId: z.uuid().optional(),
  amount: z.number().positive("Amount must be greater than zero").optional(),
  startDate: z.iso.date().optional(),
  endDate: z.iso.date().optional(),
  splitFrom: z.iso.date().optional(),
});

/** Query parameters for the budget listing endpoint. */
export const BudgetQuerySchema = z
  .object({
    interval: BudgetIntervalEnum.optional(),
    status: z.enum(["ACTIVE", "UPCOMING", "ENDED"]).optional(),
    /** First day of the window being reviewed; defaults to today. */
    from: z.iso.date().optional(),
    /** Last day of the window being reviewed; defaults to today. */
    to: z.iso.date().optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: "`from` must not be after `to`.",
    path: ["from"],
  });

/** Type inference from schemas. */
export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type BudgetQueryInput = z.infer<typeof BudgetQuerySchema>;

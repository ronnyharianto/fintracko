/**
 * Zod schemas for budget validation.
 *
 * All incoming payloads are validated with strict Zod schema validation before
 * reaching the service layer (§4 — validate all untrusted input).
 */

import { z } from "zod";
import { BudgetInterval } from "../../../generated/prisma/enums";
import { isPeriodAligned } from "./utilization";

/**
 * Interval enum derived from the Prisma-generated `BudgetInterval` so the Zod
 * schema stays in sync with the database schema.
 */
export const BudgetIntervalEnum = z.enum(
  Object.values(BudgetInterval) as [string, ...string[]],
);

const PERIOD_ALIGNMENT_MESSAGE =
  "Monthly budgets must span a full calendar month; yearly budgets must span a full calendar year.";

/**
 * Create budget request schema.
 *
 * Validates the payload sent to POST /api/v1/workspaces/[workspaceId]/budgets.
 * The period must be aligned to the chosen interval, and the amount must be
 * strictly positive.
 */
export const CreateBudgetSchema = z
  .object({
    subCategoryId: z.uuid(),
    amount: z.number().positive("Amount must be greater than zero"),
    interval: BudgetIntervalEnum,
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .refine(
    (data) =>
      isPeriodAligned(
        data.interval as BudgetInterval,
        data.startDate,
        data.endDate,
      ),
    { message: PERIOD_ALIGNMENT_MESSAGE, path: ["endDate"] },
  );

/**
 * Update budget request schema.
 *
 * `interval` is intentionally absent: it is fixed at creation and cannot be
 * changed. Period alignment is re-validated in the service layer after merging
 * with the stored interval, since the payload alone does not carry it.
 */
export const UpdateBudgetSchema = z
  .object({
    subCategoryId: z.uuid().optional(),
    amount: z.number().positive("Amount must be greater than zero").optional(),
    startDate: z.iso.date().optional(),
    endDate: z.iso.date().optional(),
  })
  .refine(
    (data) =>
      !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: "End date must not be before the start date.", path: ["endDate"] },
  );

/** Query parameters for the budget listing endpoint. */
export const BudgetQuerySchema = z.object({
  interval: BudgetIntervalEnum.optional(),
  status: z.enum(["ACTIVE", "UPCOMING", "ENDED"]).optional(),
});

/** Type inference from schemas. */
export type CreateBudgetInput = z.infer<typeof CreateBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof UpdateBudgetSchema>;
export type BudgetQueryInput = z.infer<typeof BudgetQuerySchema>;

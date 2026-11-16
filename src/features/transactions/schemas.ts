/**
 * Zod schemas for transaction validation.
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

const TransactionAmountSchema = z
  .string()
  .regex(
    /^-?\d{1,14}(?:\.\d{1,4})?$/,
    "Amount must fit within 14 digits and 4 decimal places",
  )
  .refine((value) => /[1-9]/.test(value), "Amount must not be zero");

/**
 * Create transaction request schema.
 *
 * Validates the payload sent to POST /api/v1/workspaces/[workspaceId]/transactions.
 * Amounts are decimal strings within the database precision limit. Positive
 * and negative values are supported for investment tracking and refunds.
 */
export const CreateTransactionSchema = z
  .object({
    type: TransactionTypeEnum,
    amount: TransactionAmountSchema,
    date: z.iso.date(),
    subCategoryId: z.uuid(),
    sourceAccountId: z.uuid().optional(),
    destinationAccountId: z.uuid().optional(),
    description: z.string().max(500).optional(),
    payeePayer: z.string().max(100).optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    attachmentUrl: z.string().url().optional(),
  })
  .refine(
    (data) => {
      if (data.type === TransactionType.INCOME) {
        return !!data.destinationAccountId;
      }
      if (data.type === TransactionType.EXPENSE) {
        return !!data.sourceAccountId;
      }
      if (data.type === TransactionType.TRANSFER) {
        return !!data.sourceAccountId && !!data.destinationAccountId;
      }
      return false;
    },
    {
      message:
        "INCOME requires destinationAccountId, EXPENSE requires sourceAccountId, TRANSFER requires both",
    },
  );

/**
 * Update transaction request schema.
 *
 * Validates the payload sent to PATCH /api/v1/workspaces/[workspaceId]/transactions/[transactionId].
 * Type is not editable after creation. Account rules (which accounts are required)
 * are enforced in the service layer where the current transaction type is known.
 */
export const UpdateTransactionSchema = z
  .object({
    amount: TransactionAmountSchema.optional(),
    date: z.iso.date().optional(),
    subCategoryId: z.uuid().optional(),
    sourceAccountId: z.uuid().optional(),
    destinationAccountId: z.uuid().optional(),
    description: z.string().max(500).optional().nullable(),
    payeePayer: z.string().max(100).optional().nullable(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    attachmentUrl: z.string().url().optional().nullable(),
  })
  .refine(
    (data) => {
      if (
        data.sourceAccountId !== undefined &&
        data.destinationAccountId !== undefined
      ) {
        return data.sourceAccountId !== data.destinationAccountId;
      }
      return true;
    },
    {
      message: "Source and destination accounts must be different",
    },
  );

/** Type inference from schemas. */
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

/** Query parameters for paginated transaction listing. */
export const TransactionQuerySchema = z.object({
  type: TransactionTypeEnum.optional(),
  subCategoryId: z.uuid().optional(),
  accountId: z.uuid().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type TransactionQueryInput = z.infer<typeof TransactionQuerySchema>;

/**
 * Query parameters that make the transactions page open with a fixed analytics
 * filter. Keep this schema limited to the fields the page understands; an
 * incomplete or malformed preset falls back to the normal list.
 */
export const TransactionListPresetSchema = z
  .object({
    type: TransactionTypeEnum.optional(),
    subCategoryId: z.uuid(),
    from: z.iso.date(),
    to: z.iso.date(),
  })
  .refine((data) => data.from <= data.to, {
    message: "The start date must be on or before the end date",
  });

export type TransactionListPresetInput = z.infer<
  typeof TransactionListPresetSchema
>;

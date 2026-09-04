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

/**
 * Create transaction request schema.
 *
 * Validates the payload sent to POST /api/v1/workspaces/[workspaceId]/transactions.
 * Amount can be any non-zero number (positive or negative) to support
 * investment tracking and refunds.
 */
export const CreateTransactionSchema = z
  .object({
    type: TransactionTypeEnum,
    amount: z.number().refine((v) => v !== 0, "Amount must not be zero"),
    date: z.string().min(1, "Date is required"),
    subCategoryId: z.string().min(1, "Subcategory is required"),
    sourceAccountId: z.string().optional(),
    destinationAccountId: z.string().optional(),
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
    amount: z.number().refine((v) => v !== 0, "Amount must not be zero").optional(),
    date: z.string().min(1).optional(),
    subCategoryId: z.string().min(1).optional(),
    sourceAccountId: z.string().optional(),
    destinationAccountId: z.string().optional(),
    description: z.string().max(500).optional().nullable(),
    payeePayer: z.string().max(100).optional().nullable(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    attachmentUrl: z.string().url().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.sourceAccountId !== undefined && data.destinationAccountId !== undefined) {
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

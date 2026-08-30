/**
 * Zod schemas for account validation.
 *
 * All incoming payloads are validated using strict Zod schema validation
 * before reaching the service layer (§4 — validate all untrusted input).
 */

import { z } from "zod";
import { AccountType } from "../../../generated/prisma/enums";

/**
 * Account type enum derived from the Prisma-generated AccountType
 * so the Zod schema stays in sync with the database schema.
 */
export const AccountTypeEnum = z.enum(
  Object.values(AccountType) as [string, ...string[]],
);

/**
 * Account name field validation.
 *
 * Shared by create and update schemas so the name contract lives
 * in exactly one place (§2 — feature schema module).
 */
export const AccountNameSchema = z
  .string()
  .min(1, "Account name is required")
  .max(100, "Account name must be at most 100 characters");

/**
 * Create account request schema.
 *
 * Validates the payload sent to POST /api/v1/workspaces/[workspaceId]/accounts.
 */
export const CreateAccountSchema = z.object({
  name: AccountNameSchema,
  type: AccountTypeEnum,
  initialBalance: z.number(),
});

/**
 * Update account request schema.
 *
 * Validates the payload sent to PATCH /api/v1/workspaces/[workspaceId]/accounts/[accountId].
 * Type is not editable after creation (§3.3 — account type is fixed at creation).
 */
export const UpdateAccountSchema = z.object({
  name: AccountNameSchema,
  initialBalance: z.number(),
});

/**
 * Type inference from schemas.
 */
export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;

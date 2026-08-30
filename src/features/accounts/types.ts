/**
 * Shared account domain types.
 *
 * These describe the shapes returned by the `/api/v1/workspaces/[id]/accounts`
 * endpoints. This module is client-safe: it contains type definitions only,
 * with no server-only imports, so it can be imported from Client Components.
 */

import type { AccountType } from "../../../generated/prisma/enums";

export type { AccountType };

/**
 * Account view returned by GET /api/v1/workspaces/[workspaceId]/accounts.
 * Mirrors the Prisma FinancialAccount shape exposed to the client.
 */
export interface AccountView {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: string;
  netTransactionSum: string;
  isArchived: boolean;
  createdAt: string;
}

/**
 * Form data for creating or editing an account.
 */
export interface AccountFormData {
  name: string;
  type: AccountType;
  initialBalance: number;
}

/**
 * Response shape from the accounts list endpoint.
 */
export interface AccountListResponse {
  accounts: AccountView[];
}

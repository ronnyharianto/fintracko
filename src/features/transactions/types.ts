/**
 * Shared transaction domain types.
 *
 * Client-safe: contains type definitions only, no server-only imports.
 */

import type { TransactionType } from "../../../generated/prisma/enums";

export type { TransactionType };

/** Transaction view returned by GET /api/v1/workspaces/[workspaceId]/transactions. */
export interface TransactionView {
  id: string;
  type: TransactionType;
  amount: string;
  date: string;
  subCategoryId: string;
  subCategoryName: string;
  /** Parent category of the subcategory. */
  categoryId: string;
  categoryName: string;
  sourceAccountId: string | null;
  sourceAccountName: string | null;
  destinationAccountId: string | null;
  destinationAccountName: string | null;
  description: string | null;
  payeePayer: string | null;
  tags: string[];
  attachmentUrl: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Form data for creating a transaction. */
export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  date: string;
  subCategoryId: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  description?: string;
  payeePayer?: string;
  tags?: string[];
  attachmentUrl?: string;
}

/** Response shape from the transactions list endpoint. */
export interface TransactionListResponse {
  transactions: TransactionView[];
  /** Rows matching the requested period and filters (all pages). */
  total: number;
  /**
   * Rows in the persistent scope (workspace, or one account) ignoring the
   * period/type filters, so an empty period is not mistaken for an empty
   * workspace or account.
   */
  scopeTotal: number;
}

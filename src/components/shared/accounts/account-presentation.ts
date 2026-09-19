/**
 * Presentation helpers for financial accounts.
 *
 * Client-safe: plain constants and functions only, no server-only imports.
 * Shared by the accounts page and the account detail view so labels, badge
 * variants, and balance arithmetic cannot drift between the two surfaces.
 */

import type { AccountType } from "@/features/accounts/types";
import type { BadgeVariant } from "@/components/ui/badge";
import type { AccountView } from "@/features/accounts/types";

/** Human-readable labels for account types. */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
  DIGITAL_WALLET: "Digital Wallet",
  INVESTMENT: "Investment",
};

/** Badge color variant per account type. */
export const ACCOUNT_TYPE_VARIANT: Record<AccountType, BadgeVariant> = {
  CHECKING: "info",
  SAVINGS: "success",
  CASH: "warning",
  CREDIT_CARD: "danger",
  DIGITAL_WALLET: "accent",
  INVESTMENT: "primary",
};

/**
 * Final balance of an account: initial balance plus the running transaction
 * balance effect. Amounts travel as decimal strings, so parse before summing;
 * display arithmetic only, never persisted.
 */
export function getAccountFinalBalance(account: AccountView): number {
  return (
    (parseFloat(account.initialBalance) || 0) +
    (parseFloat(account.netTransactionSum) || 0)
  );
}

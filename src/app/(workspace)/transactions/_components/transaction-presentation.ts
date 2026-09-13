/**
 * Shared presentation helpers for transaction list rows.
 *
 * The mobile card row and the tablet/desktop table row both read the type
 * color, the signed amount, and the account/detail labels from here, so the
 * two layouts cannot drift apart.
 */

import { TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import type {
  TransactionView,
  TransactionType,
} from "@/features/transactions/types";
import { formatCurrency } from "@/lib/utils";

export const TYPE_TEXT_COLOR: Record<TransactionType, string> = {
  INCOME: "text-emerald-600",
  EXPENSE: "text-red-600",
  TRANSFER: "text-blue-600",
};

export const TYPE_ICON: Record<TransactionType, typeof TrendingUp> = {
  INCOME: TrendingUp,
  EXPENSE: TrendingDown,
  TRANSFER: ArrowRightLeft,
};

const AMOUNT_SIGN: Record<TransactionType, string> = {
  INCOME: "+",
  EXPENSE: "-",
  TRANSFER: "",
};

/**
 * Signed, grouped amount without a currency symbol (e.g. "-1,234.50").
 * Transfers carry no sign because no value leaves the workspace.
 */
export function formatSignedAmount(txn: TransactionView): string {
  const amount = parseFloat(txn.amount) || 0;
  return `${AMOUNT_SIGN[txn.type]}${formatCurrency(Math.abs(amount))}`;
}

/**
 * The account a row belongs to: the source for an expense, the destination for
 * income, and both endpoints for a transfer.
 */
export function getAccountLabel(txn: TransactionView): string | null {
  if (txn.type === "TRANSFER") {
    const label = [txn.sourceAccountName, txn.destinationAccountName]
      .filter(Boolean)
      .join(" → ");
    return label || null;
  }

  return txn.type === "INCOME"
    ? txn.destinationAccountName
    : txn.sourceAccountName;
}

/** The one extra line a row can show: the payee when set, otherwise the description. */
export function getDetailText(txn: TransactionView): string | null {
  return txn.payeePayer ?? txn.description;
}

/**
 * Transaction total arithmetic.
 *
 * Client-safe: plain functions only, no server-only imports.
 *
 * The period Summary card and the day section headings both total the same
 * filtered list, so they share one implementation and cannot disagree.
 */

import type { TransactionView } from "./types";

export interface TransactionTotals {
  totalIncome: number;
  totalExpense: number;
  /** Income minus expense. */
  net: number;
}

/**
 * Total a set of transactions.
 *
 * Transfers are excluded from both sides: the money moves between the user's
 * own accounts, so counting it would inflate income and expense while leaving
 * the net unchanged.
 */
export function sumTransactions(
  transactions: readonly TransactionView[],
): TransactionTotals {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const transaction of transactions) {
    const amount = parseFloat(transaction.amount) || 0;
    if (transaction.type === "INCOME") totalIncome += amount;
    if (transaction.type === "EXPENSE") totalExpense += amount;
  }

  return { totalIncome, totalExpense, net: totalIncome - totalExpense };
}

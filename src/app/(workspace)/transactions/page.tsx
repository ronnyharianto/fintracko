"use client";

/**
 * Workspace-wide transactions page.
 *
 * The full view (period navigation, filters, summary, list, dialogs) lives in
 * the shared `TransactionListView` so the per-account detail view renders the
 * exact same list; changes to that component apply to both pages.
 */

import { TransactionListView } from "@/components/shared/transactions/transaction-list-view";

export default function TransactionsPage() {
  return <TransactionListView title="Transactions" />;
}

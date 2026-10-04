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
  // Bounded flex column so the shared list view can fill the viewport and
  // scroll internally instead of growing the page.
  return (
    <div className="flex h-full flex-col">
      <TransactionListView title="Transactions" />
    </div>
  );
}

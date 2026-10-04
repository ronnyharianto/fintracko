"use client";

/**
 * Client view for the account detail page.
 *
 * Fetches the account header (name, type badge, balance) from the
 * single-account endpoint, which enforces both path identifiers server-side,
 * then renders the shared `TransactionListView` scoped to this account. An
 * unknown or foreign account id lands on the not-found state below.
 */

import Link from "next/link";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { useWorkspaceCollection } from "@/lib/hooks/use-workspace-collection";
import type { AccountView } from "@/features/accounts/types";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_VARIANT,
  getAccountFinalBalance,
} from "@/components/shared/accounts/account-presentation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { TransactionListView } from "@/components/shared/transactions/transaction-list-view";

export default function AccountDetailView({
  accountId,
}: {
  accountId: string;
}) {
  const { activeWorkspaceId } = useWorkspace();

  // The hook returns a list contract, so the single account travels as a
  // one-element array; an absent account (NOT_FOUND) arrives as an empty one.
  const {
    data: accounts,
    isLoading,
    error,
    errorCode,
    refetch,
  } = useWorkspaceCollection<AccountView, { account: AccountView }>({
    workspaceId: activeWorkspaceId,
    getPath: (id) => `/api/v1/workspaces/${id}/accounts/${accountId}`,
    select: (data) => (data.account ? [data.account] : []),
    fallbackMessage: "Failed to load the account. Please try again.",
  });
  const account = accounts[0];

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">
          Select a workspace to view accounts.
        </p>
      </div>
    );
  }

  // The single-account endpoint returns NOT_FOUND for an unknown id or one
  // belonging to another workspace, so both land on the same honest state.
  if (!isLoading && errorCode === "NOT_FOUND") {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-lg font-medium">Account not found</p>
        <p className="mb-4 text-center text-sm text-muted-foreground">
          This account may have been removed, or it does not belong to the
          current workspace.
        </p>
        <Button asChild variant="outline">
          <Link href="/accounts">Back to accounts</Link>
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => void refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading || !account) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-10 w-52" />
      </div>
    );
  }

  const finalBalance = getAccountFinalBalance(account);

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Account header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href="/accounts" aria-label="Back to accounts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight sm:text-3xl">
            {account.name}
          </h1>
          <Badge
            variant={ACCOUNT_TYPE_VARIANT[account.type] ?? "default"}
            className="ml-1 hidden sm:inline-flex"
          >
            {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
          </Badge>
        </div>
        {!account.isArchived ? (
          <p className="pl-10 text-3xl font-bold tracking-tight">
            {finalBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        ) : (
          <p className="pl-10 text-sm text-muted-foreground">
            This account is archived. New transactions cannot be recorded.
          </p>
        )}
      </div>

      {/* Transactions for this account — same shared view as the transactions page */}
      <TransactionListView
        header={
          <p className="text-sm font-medium text-muted-foreground">
            Transactions
          </p>
        }
        accountId={accountId}
        defaultAccountId={accountId}
        createDisabled={account.isArchived}
      />
    </div>
  );
}

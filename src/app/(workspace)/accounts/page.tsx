"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import type { AccountView, AccountType } from "@/features/accounts/types";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FilterPills,
  type FilterPillOption,
} from "@/components/ui/filter-pills";
import { Plus, Wallet, MoreHorizontal, Archive, ArchiveRestore, Pencil } from "lucide-react";
import { CreateAccountDialog } from "./_components/create-account-dialog";
import { EditAccountDialog } from "./_components/edit-account-dialog";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CASH: "Cash",
  CREDIT_CARD: "Credit Card",
  DIGITAL_WALLET: "Digital Wallet",
  INVESTMENT: "Investment",
};

const ACCOUNT_TYPE_VARIANT: Record<AccountType, BadgeVariant> = {
  CHECKING: "info",
  SAVINGS: "success",
  CASH: "warning",
  CREDIT_CARD: "danger",
  DIGITAL_WALLET: "accent",
  INVESTMENT: "primary",
};

const ACCOUNT_TYPE_FILTER_OPTIONS: readonly FilterPillOption<
  AccountType | "ALL"
>[] = [
  { value: "ALL", label: "All" },
  ...(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => ({
    value: type,
    label: ACCOUNT_TYPE_LABELS[type],
  })),
];

/**
 * Accounts page — lists active and archived financial accounts
 * for the active workspace.
 */
export default function AccountsPage() {
  const { activeWorkspaceId } = useWorkspace();

  const [accounts, setAccounts] = useState<AccountView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [typeFilter, setTypeFilter] = useState<AccountType | "ALL">("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountView | null>(null);

  const fetchAccounts = useCallback(async () => {
    if (!activeWorkspaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ accounts: AccountView[] }>(
        `/api/v1/workspaces/${activeWorkspaceId}/accounts`,
      );
      setAccounts(data.accounts || []);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load accounts. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!activeWorkspaceId || cancelled) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch<{ accounts: AccountView[] }>(
          `/api/v1/workspaces/${activeWorkspaceId}/accounts`,
        );
        if (!cancelled) setAccounts(data.accounts || []);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiClientError
              ? err.message
              : "Failed to load accounts. Please try again.";
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.isArchived),
    [accounts],
  );

  const filteredActiveAccounts = useMemo(
    () => typeFilter === "ALL" ? activeAccounts : activeAccounts.filter((a) => a.type === typeFilter),
    [activeAccounts, typeFilter],
  );

  const archivedAccounts = useMemo(
    () => accounts.filter((a) => a.isArchived),
    [accounts],
  );

  const totalBalance = useMemo(
    () =>
      activeAccounts.reduce((sum, a) => {
        const initial = parseFloat(a.initialBalance) || 0;
        const net = parseFloat(a.netTransactionSum) || 0;
        return sum + initial + net;
      }, 0),
    [activeAccounts],
  );

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Select a workspace to view accounts.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => void fetchAccounts()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Accounts
          </h1>
          {!isLoading && activeAccounts.length > 0 && (
            <p className="text-3xl font-bold tracking-tight sm:text-4xl">
              {totalBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          )}
        </div>
        <div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Account
          </Button>
        </div>
      </div>

      {/* Type Filter */}
      {!isLoading && activeAccounts.length > 0 && (
        <FilterPills
          options={ACCOUNT_TYPE_FILTER_OPTIONS}
          value={typeFilter}
          onChange={setTypeFilter}
          ariaLabel="Filter by account type"
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-6 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && activeAccounts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No accounts yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Create an account to start tracking your finances.
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Account
          </Button>
        </div>
      )}

      {/* Active Accounts Grid */}
      {!isLoading && activeAccounts.length > 0 && filteredActiveAccounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredActiveAccounts.map((account) => (          <AccountCard key={account.id} account={account} onAction={fetchAccounts} onEdit={(a) => { setEditingAccount(a); setIsEditOpen(true); }} />
          ))}
        </div>
      )}

      {/* Filter Empty State */}
      {!isLoading && activeAccounts.length > 0 && filteredActiveAccounts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No accounts found</p>
          <p className="text-sm text-muted-foreground">
            No accounts match the selected filter.
          </p>
        </div>
      )}

      {/* Archived Section */}
      {!isLoading && archivedAccounts.length > 0 && (
        <div className="space-y-4">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Archive className="h-4 w-4" />
            Archived ({archivedAccounts.length})
            <span className="text-xs">{showArchived ? "▲" : "▼"}</span>
          </button>

          {showArchived && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archivedAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onAction={fetchAccounts}
                  onEdit={(a) => { setEditingAccount(a); setIsEditOpen(true); }}
                />
              ))}
            </div>
          )}
        </div>
      )}
      <CreateAccountDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => void fetchAccounts()}
      />
      <EditAccountDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        account={editingAccount}
        onUpdated={() => void fetchAccounts()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Account Card
// ---------------------------------------------------------------------------

function AccountCard({
  account,
  onAction,
  onEdit,
}: {
  account: AccountView;
  onAction: () => Promise<void>;
  onEdit: (account: AccountView) => void;
}) {
  const { activeWorkspaceId } = useWorkspace();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const finalBalance =
    (parseFloat(account.initialBalance) || 0) +
    (parseFloat(account.netTransactionSum) || 0);

  const handleArchive = async () => {
    setIsDropdownOpen(false);
    try {
      await apiFetch(
        `/api/v1/workspaces/${activeWorkspaceId}/accounts/${account.id}/archive`,
        { method: "PATCH" },
      );
      await onAction();
    } catch {
      // Error handled by toast in caller
    }
  };

  const handleUnarchive = async () => {
    setIsDropdownOpen(false);
    try {
      await apiFetch(
        `/api/v1/workspaces/${activeWorkspaceId}/accounts/${account.id}/unarchive`,
        { method: "PATCH" },
      );
      await onAction();
    } catch {
      // Error handled by toast in caller
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{account.name}</CardTitle>
          <div className="mt-1">
            <Badge variant={ACCOUNT_TYPE_VARIANT[account.type] ?? "default"}>
              {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
            </Badge>
          </div>
        </div>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setIsDropdownOpen(false); onEdit(account); }}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {account.isArchived ? (
              <DropdownMenuItem onClick={() => void handleUnarchive()}>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => void handleArchive()}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      {!account.isArchived && (
        <CardContent>
          <p className="text-2xl font-bold">
            {finalBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

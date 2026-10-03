"use client";

/**
 * Accounts page — lists active and archived financial accounts for the active
 * workspace.
 *
 * Cards link to the account detail view, which renders the shared
 * `TransactionListView` scoped to that account.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { apiFetch } from "@/lib/api/client";
import { useWorkspaceCollection } from "@/lib/hooks/use-workspace-collection";
import type { AccountView, AccountType } from "@/features/accounts/types";
import {
  ACCOUNT_TYPE_ICON,
  ACCOUNT_TYPE_LABELS,
  getAccountFinalBalance,
} from "@/components/shared/accounts/account-presentation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Plus,
  Wallet,
  MoreHorizontal,
  Archive,
  ArchiveRestore,
  Pencil,
  CreditCard,
} from "lucide-react";
import { CreateAccountDialog } from "@/components/shared/accounts/create-account-dialog";
import { EditAccountDialog } from "@/components/shared/accounts/edit-account-dialog";
import { withToast } from "@/lib/toast";

const ACCOUNT_TYPE_FILTER_OPTIONS: readonly FilterPillOption<
  AccountType | "ALL"
>[] = [
  { value: "ALL", label: "All" },
  ...(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => ({
    value: type,
    label: ACCOUNT_TYPE_LABELS[type],
  })),
];

/** Shared balance formatting so every balance on this page renders identically. */
function formatBalance(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AccountsPage() {
  const { activeWorkspaceId } = useWorkspace();
  const router = useRouter();

  const [showArchived, setShowArchived] = useState(false);
  const [typeFilter, setTypeFilter] = useState<AccountType | "ALL">("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountView | null>(
    null,
  );

  const {
    data: accounts,
    isLoading,
    error,
    refetch,
  } = useWorkspaceCollection<AccountView, { accounts: AccountView[] }>({
    workspaceId: activeWorkspaceId,
    getPath: (id) => `/api/v1/workspaces/${id}/accounts`,
    select: (data) => data.accounts ?? [],
    fallbackMessage: "Failed to load accounts. Please try again.",
  });

  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.isArchived),
    [accounts],
  );

  const filteredActiveAccounts = useMemo(
    () =>
      typeFilter === "ALL"
        ? activeAccounts
        : activeAccounts.filter((a) => a.type === typeFilter),
    [activeAccounts, typeFilter],
  );

  const archivedAccounts = useMemo(
    () => accounts.filter((a) => a.isArchived),
    [accounts],
  );

  const totalBalance = useMemo(
    () => activeAccounts.reduce((sum, a) => sum + getAccountFinalBalance(a), 0),
    [activeAccounts],
  );

  const openEdit = (account: AccountView) => {
    setEditingAccount(account);
    setIsEditOpen(true);
  };

  const openDetail = (account: AccountView) =>
    router.push(`/accounts/${account.id}`);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3 sm:items-baseline">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Accounts
          </h1>
          {!isLoading && activeAccounts.length > 0 && (
            <p className="hidden text-3xl font-bold tracking-tight tabular-nums sm:block sm:text-4xl">
              {formatBalance(totalBalance)}
            </p>
          )}
          {/* Mobile: compact icon trigger instead of a full-width button row. */}
          <Button
            size="icon"
            className="shrink-0 sm:hidden"
            onClick={() => setIsCreateOpen(true)}
            aria-label="New Account"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {!isLoading && activeAccounts.length > 0 && (
          <p className="text-sm font-semibold tabular-nums text-muted-foreground sm:hidden">
            Total balance {formatBalance(totalBalance)}
          </p>
        )}
        <div className="hidden sm:block">
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
        <div>
          {/* Mobile: dense list placeholders */}
          <div className="divide-y divide-border overflow-hidden rounded-xl border bg-card sm:hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-20 shrink-0" />
              </div>
            ))}
          </div>
          {/* Tablet and desktop: card grid placeholders */}
          <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
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

      {/* Active Accounts */}
      {!isLoading &&
        activeAccounts.length > 0 &&
        filteredActiveAccounts.length > 0 && (
          <div>
            {/* Mobile: dense rows, many accounts above the fold */}
            <div className="divide-y divide-border overflow-hidden rounded-xl border bg-card sm:hidden">
              {filteredActiveAccounts.map((account) => (
                <AccountListRow
                  key={account.id}
                  account={account}
                  onAction={refetch}
                  onEdit={openEdit}
                  onOpenDetail={openDetail}
                />
              ))}
            </div>
            {/* Tablet and desktop: card grid */}
            <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
              {filteredActiveAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onAction={refetch}
                  onEdit={openEdit}
                  onOpenDetail={openDetail}
                />
              ))}
            </div>
          </div>
        )}

      {/* Filter Empty State */}
      {!isLoading &&
        activeAccounts.length > 0 &&
        filteredActiveAccounts.length === 0 && (
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
            <div>
              {/* Mobile: dense rows */}
              <div className="divide-y divide-border overflow-hidden rounded-xl border bg-card sm:hidden">
                {archivedAccounts.map((account) => (
                  <AccountListRow
                    key={account.id}
                    account={account}
                    onAction={refetch}
                    onEdit={openEdit}
                    onOpenDetail={openDetail}
                  />
                ))}
              </div>
              {/* Tablet and desktop: card grid */}
              <div className="hidden gap-4 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                {archivedAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onAction={refetch}
                    onEdit={openEdit}
                    onOpenDetail={openDetail}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <CreateAccountDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={() => void refetch()}
      />
      <EditAccountDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        account={editingAccount}
        onUpdated={() => void refetch()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared account item pieces
// ---------------------------------------------------------------------------

/** Props every account surface (card and dense row) shares. */
interface AccountItemProps {
  account: AccountView;
  onAction: () => Promise<void>;
  onEdit: (account: AccountView) => void;
  onOpenDetail: (account: AccountView) => void;
}

/**
 * Dropdown state and archive/unarchive handlers shared by the card and the
 * dense row, so the toast + refetch behavior cannot drift between them.
 */
function useAccountActions(
  account: AccountView,
  onAction: () => Promise<void>,
) {
  const { activeWorkspaceId } = useWorkspace();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const runStatusChange = async (
    nextState: "archive" | "unarchive",
    successMessage: string,
    failureMessage: string,
  ) => {
    setIsDropdownOpen(false);
    await withToast(
      () =>
        apiFetch(
          `/api/v1/workspaces/${activeWorkspaceId}/accounts/${account.id}/${nextState}`,
          { method: "PATCH" },
        ).then(() => onAction()),
      successMessage,
      failureMessage,
    );
  };

  return {
    isDropdownOpen,
    setIsDropdownOpen,
    archive: () =>
      void runStatusChange(
        "archive",
        "Account archived",
        "Failed to archive account",
      ),
    unarchive: () =>
      void runStatusChange(
        "unarchive",
        "Account unarchived",
        "Failed to unarchive account",
      ),
  };
}

/** Enter/Space activation for a row or card marked up as role="link". */
function activateOnKeyDown(
  event: React.KeyboardEvent<HTMLDivElement>,
  onActivate: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
}

/** Actions dropdown shared by the card and the dense row. */
function AccountActionsMenu({
  account,
  isDropdownOpen,
  onOpenChange,
  onArchive,
  onUnarchive,
  onEdit,
  onOpenDetail,
}: {
  account: AccountView;
  isDropdownOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onEdit: (account: AccountView) => void;
  onOpenDetail: (account: AccountView) => void;
}) {
  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            onOpenChange(false);
            onOpenDetail(account);
          }}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          View transactions
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onOpenChange(false);
            onEdit(account);
          }}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        {account.isArchived ? (
          <DropdownMenuItem onClick={onUnarchive}>
            <ArchiveRestore className="mr-2 h-4 w-4" />
            Unarchive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={onArchive}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Account Card (tablet and desktop)
// ---------------------------------------------------------------------------

function AccountCard({
  account,
  onAction,
  onEdit,
  onOpenDetail,
}: AccountItemProps) {
  const { isDropdownOpen, setIsDropdownOpen, archive, unarchive } =
    useAccountActions(account, onAction);

  const finalBalance = getAccountFinalBalance(account);
  const Icon = ACCOUNT_TYPE_ICON[account.type] ?? Wallet;

  return (
    <Card
      role="link"
      tabIndex={0}
      aria-label={`View transactions for ${account.name}`}
      className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={() => onOpenDetail(account)}
      onKeyDown={(e) => activateOnKeyDown(e, () => onOpenDetail(account))}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">
              {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
            </span>
          </span>
          <CardTitle className="truncate text-base">{account.name}</CardTitle>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <AccountActionsMenu
            account={account}
            isDropdownOpen={isDropdownOpen}
            onOpenChange={setIsDropdownOpen}
            onArchive={archive}
            onUnarchive={unarchive}
            onEdit={onEdit}
            onOpenDetail={onOpenDetail}
          />
        </div>
      </CardHeader>
      {!account.isArchived && (
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {formatBalance(finalBalance)}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Account List Row (mobile)
// ---------------------------------------------------------------------------

/**
 * Dense list row used below the `sm` breakpoint. Same data and actions as
 * {@link AccountCard}, at roughly a third of the height so many accounts fit
 * above the fold. Marked up as a `role="link"` div rather than a button
 * because it contains the actions `DropdownMenu` trigger.
 */
function AccountListRow({
  account,
  onAction,
  onEdit,
  onOpenDetail,
}: AccountItemProps) {
  const { isDropdownOpen, setIsDropdownOpen, archive, unarchive } =
    useAccountActions(account, onAction);

  const finalBalance = getAccountFinalBalance(account);
  const Icon = ACCOUNT_TYPE_ICON[account.type] ?? Wallet;

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`View transactions for ${account.name}`}
      className="flex cursor-pointer items-center gap-2 px-3 py-2.5 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:bg-muted/60"
      onClick={() => onOpenDetail(account)}
      onKeyDown={(e) => activateOnKeyDown(e, () => onOpenDetail(account))}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">
          {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        {account.name}
      </span>
      {!account.isArchived && (
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {formatBalance(finalBalance)}
        </span>
      )}
      <div onClick={(e) => e.stopPropagation()}>
        <AccountActionsMenu
          account={account}
          isDropdownOpen={isDropdownOpen}
          onOpenChange={setIsDropdownOpen}
          onArchive={archive}
          onUnarchive={unarchive}
          onEdit={onEdit}
          onOpenDetail={onOpenDetail}
        />
      </div>
    </div>
  );
}

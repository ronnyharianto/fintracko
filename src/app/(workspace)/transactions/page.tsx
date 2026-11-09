/**
 * Workspace-wide transactions page.
 *
 * The full view (period navigation, filters, summary, list, dialogs) lives in
 * the shared `TransactionListView` so the per-account detail view renders the
 * exact same list; changes to that component apply to both pages.
 *
 * Analytics can deep-link into a fixed subcategory/date-range view with query
 * parameters. The preset is validated here before the client view receives it;
 * malformed links fall back to the normal transactions page instead of
 * surfacing an API validation error.
 */

import type {
  TransactionListPreset,
  TransactionType,
} from "@/features/transactions/types";
import { TransactionListPresetSchema } from "@/features/transactions/schemas";
import { TransactionListView } from "@/components/shared/transactions/transaction-list-view";

interface TransactionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function singleParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parsePreset(
  params: Record<string, string | string[] | undefined>,
): TransactionListPreset | undefined {
  const parsed = TransactionListPresetSchema.safeParse({
    type: singleParam(params.type),
    subCategoryId: singleParam(params.subCategoryId),
    from: singleParam(params.from),
    to: singleParam(params.to),
  });

  if (!parsed.success) return undefined;

  return {
    ...parsed.data,
    type: parsed.data.type as TransactionType | undefined,
  };
}

function presetKey(preset: TransactionListPreset | undefined): string {
  return preset
    ? `${preset.type ?? "ALL"}|${preset.subCategoryId}|${preset.from}|${preset.to}`
    : "all";
}

export default async function TransactionsPage({
  searchParams,
}: TransactionsPageProps) {
  const params = await searchParams;
  const preset = parsePreset(params);

  // Bounded flex column so the shared list view can fill the viewport and
  // scroll internally instead of growing the page.
  return (
    <div className="flex h-full flex-col">
      <TransactionListView
        key={presetKey(preset)}
        title="Transactions"
        preset={preset}
      />
    </div>
  );
}

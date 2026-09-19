"use client";

/**
 * Resolve the budget that covers a transaction date for a subcategory.
 *
 * Uses GET /workspaces/[id]/budgets?from=<date>&to=<date>, whose window
 * resolves every budget to the aligned period containing that date, so
 * `limit` and `spent` come back already scoped to it. Overlapping budgets for
 * the same subcategory are rejected at creation, so at most one can match.
 *
 * Results are keyed by their inputs, so a changed selection never shows the
 * previous period's figures as current. While the lookup for the new inputs
 * is in flight, the last budget seen for the same subcategory is still
 * returned (with `isLoading`) so the snapshot can hold its space instead of
 * blinking away on every date change.
 */

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { BudgetView } from "../types";

export interface UseBudgetForDateArgs {
  workspaceId: string | null | undefined;
  /** Expense subcategory the budget would target; falsy disables the lookup. */
  subCategoryId: string | null | undefined;
  /** Transaction date, `YYYY-MM-DD`; falsy disables the lookup. */
  date: string | null | undefined;
}

export interface UseBudgetForDateResult {
  /**
   * The budget whose period covers `date`, or null when none does. While
   * loading, the last budget seen for the same subcategory may be returned so
   * consumers can keep the snapshot mounted.
   */
  budget: BudgetView | null;
  isLoading: boolean;
  error: string | null;
}

interface BudgetEntry {
  key: string;
  budget: BudgetView | null;
  error: string | null;
}

function lookupKey(subCategoryId: string, date: string): string {
  return `${subCategoryId}|${date}`;
}

export function useBudgetForDate({
  workspaceId,
  subCategoryId,
  date,
}: UseBudgetForDateArgs): UseBudgetForDateResult {
  const [entry, setEntry] = useState<BudgetEntry | null>(null);
  const [lastBudgetBySub, setLastBudgetBySub] = useState<
    Record<string, BudgetView>
  >({});

  const enabled = Boolean(workspaceId && subCategoryId && date);
  const key =
    enabled && subCategoryId && date ? lookupKey(subCategoryId, date) : null;

  useEffect(() => {
    if (!workspaceId || !subCategoryId || !date) return;

    let cancelled = false;
    const entryKey = lookupKey(subCategoryId, date);

    void (async () => {
      try {
        const window = encodeURIComponent(date);
        const data = await apiFetch<{ budgets: BudgetView[] }>(
          `/api/v1/workspaces/${workspaceId}/budgets?from=${window}&to=${window}`,
        );
        if (cancelled) return;
        const matched =
          data.budgets.find((b) => b.subCategoryId === subCategoryId) ?? null;
        if (matched) {
          setLastBudgetBySub((prev) => ({ ...prev, [subCategoryId]: matched }));
        }
        setEntry({
          key: entryKey,
          budget: matched,
          error: null,
        });
      } catch {
        if (!cancelled) {
          setEntry({
            key: entryKey,
            budget: null,
            error: "Couldn't check the budget for this date.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, subCategoryId, date]);

  const current = entry && entry.key === key ? entry : null;
  const stale =
    !current && key !== null && subCategoryId
      ? (lastBudgetBySub[subCategoryId] ?? null)
      : null;

  return {
    budget: current?.budget ?? stale,
    isLoading: key !== null && current === null,
    error: current?.error ?? null,
  };
}

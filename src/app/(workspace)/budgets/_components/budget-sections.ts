import type { BudgetView } from "@/features/budgets/types";
import { groupBy } from "@/lib/utils";

/** One parent-category section of the budget list, with its rolled-up totals. */
export interface BudgetCategorySection {
  categoryId: string;
  categoryName: string;
  /** Budgets in this category, in {@link compareBudgets} order. */
  budgets: BudgetView[];
  /** Sum of the section's limits for the viewed window. */
  totalBudgeted: number;
  /** Section-level utilization percentage; may exceed 100. */
  utilization: number;
}

/**
 * Alphabetical order for budget lists.
 *
 * The subcategory is the card's title, so it leads; the category name breaks
 * ties, and the start date keeps several periods of one subcategory — a range
 * split by a history-preserving edit — in chronological order.
 */
export function compareBudgets(a: BudgetView, b: BudgetView): number {
  return (
    a.subCategoryName.localeCompare(b.subCategoryName) ||
    a.categoryName.localeCompare(b.categoryName) ||
    a.startDate.localeCompare(b.startDate)
  );
}

/** A copy of `budgets` in {@link compareBudgets} order. */
export function sortBudgets(budgets: BudgetView[]): BudgetView[] {
  return [...budgets].sort(compareBudgets);
}

/**
 * Group budgets by parent category for review.
 *
 * Sections and the cards inside them are both ordered alphabetically, so the
 * structure stays predictable regardless of the incoming budget order.
 */
export function buildCategorySections(
  budgets: BudgetView[],
): BudgetCategorySection[] {
  const grouped = groupBy(budgets, (budget) => budget.categoryId);

  const sections = [...grouped.values()].map((categoryBudgets) => {
    const sorted = sortBudgets(categoryBudgets);
    const totalBudgeted = sorted.reduce(
      (sum, budget) => sum + Number(budget.limit),
      0,
    );
    const totalSpent = sorted.reduce(
      (sum, budget) => sum + Number(budget.spent),
      0,
    );

    return {
      categoryId: sorted[0].categoryId,
      categoryName: sorted[0].categoryName,
      budgets: sorted,
      totalBudgeted,
      utilization: totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0,
    };
  });

  sections.sort((a, b) => a.categoryName.localeCompare(b.categoryName));

  return sections;
}

import type { BudgetView } from "@/features/budgets/types";
import { groupBy } from "@/lib/utils";

/** One parent-category section of the budget list, with its rolled-up totals. */
export interface BudgetCategorySection {
  categoryId: string;
  categoryName: string;
  /** Budgets in this category, most-used first. */
  budgets: BudgetView[];
  /** Sum of the section's budget limits. */
  totalBudgeted: number;
  /** Section-level utilization percentage; may exceed 100. */
  utilization: number;
}

/**
 * Group budgets by parent category for review.
 *
 * Sections are ordered alphabetically by category name so the structure stays
 * predictable regardless of the incoming budget order. Within a section,
 * budgets are sorted by utilization descending to surface the ones closest to
 * their limit.
 */
export function buildCategorySections(
  budgets: BudgetView[],
): BudgetCategorySection[] {
  const grouped = groupBy(budgets, (budget) => budget.categoryId);

  const sections = [...grouped.values()].map((categoryBudgets) => {
    const sorted = [...categoryBudgets].sort(
      (a, b) => b.utilization - a.utilization,
    );
    const totalBudgeted = sorted.reduce(
      (sum, budget) => sum + Number(budget.amount),
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

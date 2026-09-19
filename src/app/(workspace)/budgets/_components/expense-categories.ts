import { apiFetch } from "@/lib/api/client";
import type { CategoryView } from "@/features/categories/types";

/**
 * Loads the categories that can carry a budget: non-archived EXPENSE
 * categories with their non-archived subcategories.
 */
export async function fetchExpenseCategories(
  workspaceId: string,
): Promise<CategoryView[]> {
  const data = await apiFetch<{ categories: CategoryView[] }>(
    `/api/v1/workspaces/${workspaceId}/categories`,
  );

  return (data.categories ?? [])
    .filter((category) => category.type === "EXPENSE" && !category.isArchived)
    .map((category) => ({
      ...category,
      subCategories: category.subCategories.filter(
        (subCategory) => !subCategory.isArchived,
      ),
    }));
}

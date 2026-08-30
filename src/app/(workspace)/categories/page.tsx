"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/shared/workspace/workspace-context";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import type {
  CategoryView,
  SubCategoryView,
  TransactionType,
} from "@/features/categories/types";
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
  Plus,
  Tag,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { CreateCategoryDialog } from "./_components/create-category-dialog";
import { EditCategoryDialog } from "./_components/edit-category-dialog";
import { cn } from "@/lib/utils";

/** Type section config for display. */
const TYPE_CONFIG: Record<
  TransactionType,
  { label: string; icon: string; color: string }
> = {
  INCOME: { label: "Income", icon: "💰", color: "text-green-600" },
  EXPENSE: { label: "Expenses", icon: "💸", color: "text-red-600" },
  TRANSFER: { label: "Transfers", icon: "🔄", color: "text-blue-600" },
};

const TYPE_ORDER: TransactionType[] = ["EXPENSE", "INCOME", "TRANSFER"];

/**
 * Categories page — lists categories grouped by type with nested subcategories.
 */
export default function CategoriesPage() {
  const { activeWorkspaceId } = useWorkspace();

  const [categories, setCategories] = useState<CategoryView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createType, setCreateType] = useState<TransactionType>("EXPENSE");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{
    type: "category" | "subcategory";
    id: string;
    name: string;
    endpoint: string;
  } | null>(null);
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<string | null>(
    null,
  );

  const fetchCategories = useCallback(async () => {
    if (!activeWorkspaceId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch<{ categories: CategoryView[] }>(
        `/api/v1/workspaces/${activeWorkspaceId}/categories`,
      );
      setCategories(data.categories || []);
    } catch (err) {
      const message =
        err instanceof ApiClientError
          ? err.message
          : "Failed to load categories. Please try again.";
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
        const data = await apiFetch<{ categories: CategoryView[] }>(
          `/api/v1/workspaces/${activeWorkspaceId}/categories`,
        );
        if (!cancelled) setCategories(data.categories || []);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiClientError
              ? err.message
              : "Failed to load categories. Please try again.";
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  const groupedCategories = useMemo(() => {
    const groups: Record<TransactionType, CategoryView[]> = {
      INCOME: [],
      EXPENSE: [],
      TRANSFER: [],
    };
    for (const cat of categories) {
      if (showArchived || !cat.isArchived) {
        groups[cat.type].push(cat);
      }
    }
    return groups;
  }, [categories, showArchived]);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const openCreateDialog = (type: TransactionType) => {
    setCreateType(type);
    setIsCreateOpen(true);
  };

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Tag className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          Select a workspace to view categories.
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
          onClick={() => void fetchCategories()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Categories
        </h1>
        <Button onClick={() => openCreateDialog("EXPENSE")}>
          <Plus className="mr-2 h-4 w-4" />
          New Category
        </Button>
      </div>

      {/* Archived Toggle */}
      {!isLoading && categories.some((c) => c.isArchived || c.subCategories.some((s) => s.isArchived)) && (
        <button
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Archive className="h-4 w-4" />
          {showArchived ? "Hide Archived" : "Show Archived"}
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Sections */}
      {!isLoading &&
        TYPE_ORDER.map((type) => {
          const cats = groupedCategories[type];
          if (cats.length === 0) return null;
          const config = TYPE_CONFIG[type];

          return (
            <div key={type} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className={`text-lg font-semibold ${config.color}`}>
                  {config.icon} {config.label}
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openCreateDialog(type)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {cats.map((category) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    isExpanded={expandedCategories.has(category.id)}
                    onToggleExpand={() => toggleExpand(category.id)}
                    onEdit={(name) => {
                      setEditTarget({
                        type: "category",
                        id: category.id,
                        name,
                        endpoint: `/api/v1/workspaces/${activeWorkspaceId}/categories/${category.id}`,
                      });
                      setIsEditOpen(true);
                    }}
                    onArchive={async () => {
                      await apiFetch(
                        `/api/v1/workspaces/${activeWorkspaceId}/categories/${category.id}/archive`,
                        { method: "PATCH" },
                      );
                      await fetchCategories();
                    }}
                    onUnarchive={async () => {
                      await apiFetch(
                        `/api/v1/workspaces/${activeWorkspaceId}/categories/${category.id}/unarchive`,
                        { method: "PATCH" },
                      );
                      await fetchCategories();
                    }}
                    onEditSubcategory={(sub) => {
                      setEditTarget({
                        type: "subcategory",
                        id: sub.id,
                        name: sub.name,
                        endpoint: `/api/v1/workspaces/${activeWorkspaceId}/categories/${category.id}/subcategories/${sub.id}`,
                      });
                      setIsEditOpen(true);
                    }}
                    onArchiveSubcategory={async (subId) => {
                      await apiFetch(
                        `/api/v1/workspaces/${activeWorkspaceId}/categories/${category.id}/subcategories/${subId}/archive`,
                        { method: "PATCH" },
                      );
                      await fetchCategories();
                    }}
                    onUnarchiveSubcategory={async (subId) => {
                      await apiFetch(
                        `/api/v1/workspaces/${activeWorkspaceId}/categories/${category.id}/subcategories/${subId}/unarchive`,
                        { method: "PATCH" },
                      );
                      await fetchCategories();
                    }}
                    isAddingSubcategory={addingSubcategoryTo === category.id}
                    onStartAddSubcategory={() =>
                      setAddingSubcategoryTo(category.id)
                    }
                    onCancelAddSubcategory={() => setAddingSubcategoryTo(null)}
                    onSubcategoryCreated={async (name) => {
                      await apiFetch(
                        `/api/v1/workspaces/${activeWorkspaceId}/categories/${category.id}/subcategories`,
                        {
                          method: "POST",
                          body: { name },
                        },
                      );
                      setAddingSubcategoryTo(null);
                      await fetchCategories();
                    }}
                    showArchived={showArchived}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {/* Empty State */}
      {!isLoading && categories.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Tag className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No categories yet</p>
          <p className="mb-4 text-sm text-muted-foreground">
            Categories are created automatically when you set up a workspace.
          </p>
        </div>
      )}

      {/* Dialogs */}
      <CreateCategoryDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        defaultType={createType}
        onCreated={() => void fetchCategories()}
      />
      <EditCategoryDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        target={editTarget}
        onUpdated={() => void fetchCategories()}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Card
// ---------------------------------------------------------------------------

function CategoryCard({
  category,
  isExpanded,
  onToggleExpand,
  onEdit,
  onArchive,
  onUnarchive,
  onEditSubcategory,
  onArchiveSubcategory,
  onUnarchiveSubcategory,
  isAddingSubcategory,
  onStartAddSubcategory,
  onCancelAddSubcategory,
  onSubcategoryCreated,
  showArchived,
}: {
  category: CategoryView;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (name: string) => void;
  onArchive: () => Promise<void>;
  onUnarchive: () => Promise<void>;
  onEditSubcategory: (sub: SubCategoryView) => void;
  onArchiveSubcategory: (subId: string) => Promise<void>;
  onUnarchiveSubcategory: (subId: string) => Promise<void>;
  isAddingSubcategory: boolean;
  onStartAddSubcategory: () => void;
  onCancelAddSubcategory: () => void;
  onSubcategoryCreated: (name: string) => Promise<void>;
  showArchived: boolean;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const visibleSubs = showArchived
    ? category.subCategories
    : category.subCategories.filter(
        (s) => !s.isArchived && !category.isArchived,
      );

  const handleCreateSub = async () => {
    if (!newSubName.trim()) return;
    setIsSaving(true);
    try {
      await onSubcategoryCreated(newSubName.trim());
      setNewSubName("");
    } catch {
      // Error handled by caller
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn("gap-0 py-0", category.isArchived ? "opacity-60" : "")}>
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 py-3"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2 min-w-0 cursor-pointer">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <CardTitle className="truncate text-base">{category.name}</CardTitle>
          <span className="shrink-0 text-xs text-muted-foreground">
            {visibleSubs.length} sub{visibleSubs.length !== 1 ? "s" : ""}
          </span>
          {category.isArchived && (
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              Archived
            </span>
          )}
        </div>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsDropdownOpen(false);
                onEdit(category.name);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {category.isArchived ? (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(false);
                  void onUnarchive();
                }}
              >
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdownOpen(false);
                  void onArchive();
                }}
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      {/* Subcategories */}
      {isExpanded && (
        <CardContent className="pt-0 pb-6">
          <div className="space-y-1 border-l-2 border-muted pl-4">
            {visibleSubs.map((sub) => (
              <SubCategoryRow
                key={sub.id}
                sub={sub}
                isArchived={category.isArchived}
                onEdit={() => onEditSubcategory(sub)}
                onArchive={() => void onArchiveSubcategory(sub.id)}
                onUnarchive={() => void onUnarchiveSubcategory(sub.id)}
                showArchived={showArchived}
              />
            ))}

            {/* Add Subcategory */}
            {!category.isArchived && isAddingSubcategory && (
              <div className="flex items-center gap-2 py-1">
                <input
                  autoFocus
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void handleCreateSub();
                    if (e.key === "Escape") {
                      onCancelAddSubcategory();
                      setNewSubName("");
                    }
                  }}
                  placeholder="Subcategory name"
                  className="h-8 flex-1 rounded border bg-transparent px-2 text-sm"
                  disabled={isSaving}
                />
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => void handleCreateSub()}
                  disabled={isSaving || !newSubName.trim()}
                >
                  {isSaving ? "..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => {
                    onCancelAddSubcategory();
                    setNewSubName("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {!category.isArchived && !isAddingSubcategory && (
              <button
                onClick={onStartAddSubcategory}
                className="flex items-center gap-1 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" />
                Add subcategory
              </button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// SubCategory Row
// ---------------------------------------------------------------------------

function SubCategoryRow({
  sub,
  isArchived: isParentArchived,
  onEdit,
  onArchive,
  onUnarchive,
  showArchived,
}: {
  sub: SubCategoryView;
  isArchived: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  showArchived: boolean;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const isVisible = showArchived || (!sub.isArchived && !isParentArchived);
  if (!isVisible && !showArchived) return null;

  return (
    <div
      className={`group flex items-center justify-between rounded py-1 ${
        sub.isArchived || isParentArchived ? "opacity-60" : ""
      }`}
    >
      <span className="min-w-0 truncate text-sm">{sub.name}</span>
      {(sub.isArchived || isParentArchived) && (
        <span className="mr-2 shrink-0 text-xs text-muted-foreground">
          Archived
        </span>
      )}
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0 md:opacity-0 md:group-hover:opacity-100"
          >
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setIsDropdownOpen(false);
              onEdit();
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {sub.isArchived ? (
            <DropdownMenuItem
              onClick={() => {
                setIsDropdownOpen(false);
                onUnarchive();
              }}
            >
              <ArchiveRestore className="mr-2 h-4 w-4" />
              Unarchive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => {
                setIsDropdownOpen(false);
                onArchive();
              }}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

'use client';

/**
 * Workspace Setup Form Component.
 *
 * Step 2 of the onboarding flow. Collects workspace name and template
 * selection, shows a preview of the categories that will be seeded,
 * and creates the first workspace via the existing POST /api/v1/workspaces
 * endpoint.
 *
 * The currency is pre-filled from the user's profile (set during step 1)
 * and cannot be changed — per PRD §3.2, workspace currency is locked
 * after creation.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Briefcase,
  Users,
  Shield,
  ChevronDown,
  ChevronRight,
  Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/client';
import {
  WORKSPACE_TEMPLATES,
  type WorkspaceTemplateName,
} from '@/features/workspaces/constants/workspace-templates';
import { cn } from '@/lib/utils';

type TemplateKey = WorkspaceTemplateName;

interface TemplateOption {
  key: TemplateKey;
  label: string;
  description: string;
  icon: typeof Briefcase;
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    key: 'PERSONAL',
    label: 'Personal Finance',
    description: 'Track income, expenses, and budgets for yourself.',
    icon: Briefcase,
  },
  {
    key: 'FAMILY',
    label: 'Family Finance',
    description: 'Collaborative household and family expense management.',
    icon: Users,
  },
  {
    key: 'SMALL_BUSINESS',
    label: 'Small Business',
    description: 'Business operations, revenue, and expense tracking.',
    icon: Shield,
  },
];

const TYPE_COLORS: Record<string, string> = {
  INCOME: 'text-emerald-600 dark:text-emerald-400',
  EXPENSE: 'text-red-600 dark:text-red-400',
  TRANSFER: 'text-blue-600 dark:text-blue-400',
};

export function WorkspaceSetupForm() {
  const [name, setName] = useState('');
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateKey>('PERSONAL');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [isCreating, setIsCreating] = useState(false);

  const template = WORKSPACE_TEMPLATES[selectedTemplate];

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await apiFetch('/api/v1/workspaces', {
        method: 'POST',
        body: {
          name: name.trim(),
          templateName: selectedTemplate,
        },
      });

      toast.success('Workspace created! Redirecting to dashboard...');

      // Redirect to dashboard after successful creation
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to create workspace.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="text-center md:text-left">
        <CardTitle className="text-xl md:text-2xl">
          Create your first workspace
        </CardTitle>
        <CardDescription>
          A workspace is where you track your finances. Choose a template to
          get started with pre-configured categories.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Workspace Name */}
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name <span className="text-red-500">*</span></Label>
            <Input
              id="workspace-name"
              placeholder="e.g. Personal Budget, Family Expenses"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Template Selector */}
          <div className="space-y-3">
            <Label>Choose a Template <span className="text-red-500">*</span></Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {TEMPLATE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedTemplate === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedTemplate(option.key)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-lg border-2 p-4 text-left transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50 hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          isSelected
                            ? 'text-primary'
                            : 'text-muted-foreground',
                        )}
                      />
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Preview */}
          <div className="space-y-3">
            <Label>
              Categories Preview — {template.name}
            </Label>
            <p className="text-xs text-muted-foreground">
              {template.description} These categories will be created
              automatically.
            </p>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2 max-h-80 overflow-y-auto">
              {template.categories.map((category) => {
                const isExpanded = expandedCategories.has(category.name);
                return (
                  <div key={category.name}>
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.name)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="flex-1 text-left">{category.name}</span>
                      <span
                        className={cn(
                          'text-xs font-medium',
                          TYPE_COLORS[category.type],
                        )}
                      >
                        {category.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {category.subCategories.length} sub
                        {category.subCategories.length !== 1 ? 's' : ''}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="ml-6 mt-1 space-y-0.5">
                        {category.subCategories.map((sub) => (
                          <p
                            key={sub.name}
                            className="text-xs text-muted-foreground py-0.5"
                          >
                            {sub.name}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Workspace'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

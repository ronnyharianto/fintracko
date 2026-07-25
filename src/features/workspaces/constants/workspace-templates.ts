/**
 * Static workspace configuration templates.
 *
 * Per ARCHITECTURE.md §4 ("Workspace Templates Storage"):
 * Workspace Templates are explicitly stored as static TypeScript constants
 * inside the application codebase instead of being stored in the database.
 * When a user initiates workspace creation, the backend reads this structural
 * object and bulk-inserts Category (Level 1) and SubCategory (Level 2) rows.
 */

import type { CategoryType } from '../../../../generated/prisma/client';

export interface SubCategoryTemplate {
  name: string;
}

export interface CategoryTemplate {
  name: string;
  type: CategoryType;
  subCategories: SubCategoryTemplate[];
}

export interface WorkspaceTemplate {
  name: string;
  description: string;
  categories: CategoryTemplate[];
}

export type WorkspaceTemplateName = 'PERSONAL' | 'FAMILY' | 'SMALL_BUSINESS';

export const WORKSPACE_TEMPLATES: Record<
  WorkspaceTemplateName,
  WorkspaceTemplate
> = {
  PERSONAL: {
    name: 'Personal Finance',
    description: 'Standard personal finance tracking for individuals.',
    categories: [
      {
        name: 'Salary & Income',
        type: 'INCOME',
        subCategories: [
          { name: 'Salary' },
          { name: 'Freelance' },
          { name: 'Investments' },
        ],
      },
      {
        name: 'Food & Dining',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Groceries' },
          { name: 'Restaurants & Cafes' },
          { name: 'Fast Food' },
        ],
      },
      {
        name: 'Housing & Utilities',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Rent & Mortgage' },
          { name: 'Electricity & Water' },
          { name: 'Internet & Phone' },
        ],
      },
      {
        name: 'Entertainment',
        type: 'EXPENSE',
        subCategories: [{ name: 'Subscriptions' }, { name: 'Movies & Games' }],
      },
      {
        name: 'Transfers',
        type: 'TRANSFER',
        subCategories: [{ name: 'Savings Deposit' }],
      },
    ],
  },
  FAMILY: {
    name: 'Family Finance',
    description: 'Collaborative household and family expense management.',
    categories: [
      {
        name: 'Household Income',
        type: 'INCOME',
        subCategories: [
          { name: 'Primary Salary' },
          { name: 'Secondary Salary' },
          { name: 'Family Support' },
        ],
      },
      {
        name: 'Groceries & Household',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Supermarket' },
          { name: 'Household Supplies' },
          { name: 'Utilities' },
        ],
      },
      {
        name: 'Children & Education',
        type: 'EXPENSE',
        subCategories: [
          { name: 'School Fees' },
          { name: 'Books & Supplies' },
          { name: 'Activities' },
        ],
      },
      {
        name: 'Healthcare',
        type: 'EXPENSE',
        subCategories: [{ name: 'Insurance' }, { name: 'Pharmacy & Doctor' }],
      },
      {
        name: 'Transfers',
        type: 'TRANSFER',
        subCategories: [{ name: 'Family Emergency Fund' }],
      },
    ],
  },
  SMALL_BUSINESS: {
    name: 'Small Business',
    description: 'Business operations, revenue, and expense tracking for SMEs.',
    categories: [
      {
        name: 'Business Revenue',
        type: 'INCOME',
        subCategories: [
          { name: 'Client Sales' },
          { name: 'Product Revenue' },
          { name: 'Services' },
        ],
      },
      {
        name: 'Operations & Software',
        type: 'EXPENSE',
        subCategories: [
          { name: 'SaaS & Subscriptions' },
          { name: 'Hosting & Infrastructure' },
          { name: 'Office Supplies' },
        ],
      },
      {
        name: 'Team & Payroll',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Salaries & Wages' },
          { name: 'Contractor Fees' },
        ],
      },
      {
        name: 'Marketing & Sales',
        type: 'EXPENSE',
        subCategories: [{ name: 'Advertising' }, { name: 'Promotions' }],
      },
      {
        name: 'Transfers',
        type: 'TRANSFER',
        subCategories: [{ name: 'Tax Reserve Transfer' }],
      },
    ],
  },
};

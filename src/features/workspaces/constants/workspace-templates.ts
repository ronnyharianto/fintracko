/**
 * Static workspace configuration templates.
 *
 * Workspace Templates are explicitly stored as static TypeScript constants
 * inside the application codebase instead of being stored in the database.
 * When a user initiates workspace creation, the backend reads this structural
 * object and bulk-inserts Category (Level 1) and SubCategory (Level 2) rows.
 */

import type { TransactionType } from '../../../../generated/prisma/client';

export interface SubCategoryTemplate {
  name: string;
}

export interface CategoryTemplate {
  name: string;
  type: TransactionType;
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
        name: 'Income',
        type: 'INCOME',
        subCategories: [
          { name: 'Salary' },
          { name: 'Freelance' },
          { name: 'Side Hustle' },
        ],
      },
      {
        name: 'Investment',
        type: 'INCOME',
        subCategories: [
          { name: 'Interest' },
          { name: 'Dividends' },
          { name: 'Capital Gains' },
        ],
      },
      {
        name: 'Food',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Proteins' },
          { name: 'Fruits & Vegetables' },
          { name: 'Dairy & Beverages' },
          { name: 'Grains & Bakery' },
          { name: 'Spices & Condiments' },
          { name: 'Snacks' },
        ],
      },
      {
        name: 'Housing & Utilities',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Rent/Mortgage' },
          { name: 'Electricity & Water' },
          { name: 'Internet & Phone' },
        ],
      },
      {
        name: 'Transportation',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Fuel' },
          { name: 'Public Transport' },
          { name: 'Parking & Tolls' },
        ],
      },
      {
        name: 'Entertainment',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Subscriptions' },
          { name: 'Hangout' },
          { name: 'Vacation' },
          { name: 'Movies & Games' },
          { name: 'Hobbies' },
          { name: 'Events & Concerts' },
        ],
      },
      {
        name: 'Personal Care',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Healthcare' },
          { name: 'Fitness' },
          { name: 'Toiletries & Grooming' },
        ],
      },
      {
        name: 'Transfers',
        type: 'TRANSFER',
        subCategories: [{ name: 'General' }],
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
          { name: 'Side Hustle' },
        ],
      },
      {
        name: 'Investment',
        type: 'INCOME',
        subCategories: [
          { name: 'Interest' },
          { name: 'Dividends' },
          { name: 'Capital Gains' },
        ],
      },
      {
        name: 'Food',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Proteins' },
          { name: 'Fruits & Vegetables' },
          { name: 'Dairy & Beverages' },
          { name: 'Grains & Bakery' },
          { name: 'Spices & Condiments' },
          { name: 'Snacks' },
        ],
      },
      {
        name: 'Housing & Utilities',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Rent/Mortgage' },
          { name: 'Electricity & Water' },
          { name: 'Internet & Phone' },
        ],
      },
      {
        name: 'Transportation',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Fuel' },
          { name: 'Public Transport' },
          { name: 'Parking & Tolls' },
        ],
      },
      {
        name: 'Children & Education',
        type: 'EXPENSE',
        subCategories: [
          { name: 'School Fees' },
          { name: 'Books & Supplies' },
          { name: 'Activities' },
          { name: 'Childcare' },
        ],
      },
      {
        name: 'Entertainment',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Subscriptions' },
          { name: 'Family Outings' },
          { name: 'Vacation' },
          { name: 'Toys & Games' },
        ],
      },
      {
        name: 'Personal Care',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Healthcare' },
          { name: 'Fitness' },
          { name: 'Toiletries & Grooming' },
        ],
      },
      {
        name: 'Pets',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Pet Food' },
          { name: 'Vet & Medicine' },
        ],
      },
      {
        name: 'Transfers',
        type: 'TRANSFER',
        subCategories: [{ name: 'General' }],
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
          { name: 'Product Sales' },
          { name: 'Services' },
        ],
      },
      {
        name: 'Other Income',
        type: 'INCOME',
        subCategories: [
          { name: 'Interest' },
          { name: 'Miscellaneous' },
        ],
      },
      {
        name: 'Cost of Goods Sold',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Materials' },
          { name: 'Shipping & Logistics' },
          { name: 'Packaging' },
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
        name: 'Payroll & Team',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Salaries' },
          { name: 'Contractors' },
          { name: 'Bonuses & Benefits' },
        ],
      },
      {
        name: 'Marketing & Sales',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Advertising' },
          { name: 'Promotions' },
          { name: 'Events & Sponsorships' },
        ],
      },
      {
        name: 'Office & Workspace',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Rent' },
          { name: 'Electricity' },
          { name: 'Water' },
          { name: 'Internet' },
          { name: 'Phone' },
        ],
      },
      {
        name: 'Professional Services',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Legal' },
          { name: 'Accounting & Audit' },
          { name: 'Consulting' },
        ],
      },
      {
        name: 'Travel',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Business Travel' },
          { name: 'Fuel' },
          { name: 'Parking & Tolls' },
        ],
      },
      {
        name: 'Meals & Entertainment',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Client Meals' },
          { name: 'Team Outings' },
        ],
      },
      {
        name: 'Insurance',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Business Insurance' },
          { name: 'Liability Insurance' },
        ],
      },
      {
        name: 'Taxes',
        type: 'EXPENSE',
        subCategories: [
          { name: 'Licenses & Permits' },
          { name: 'Tax Payments' },
        ],
      },
      {
        name: 'Transfers',
        type: 'TRANSFER',
        subCategories: [{ name: 'General' }],
      },
    ],
  },
};

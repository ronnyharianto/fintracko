# Product Requirement Document (PRD) - Fintracko MVP 1

## 1. Overview & Objectives
Fintracko is a collaborative personal and business financial tracking SaaS application. The goal of MVP 1 is to provide users with a robust platform to manage multiple financial workspaces, collaborate with other users, track income/expenses/transfers, enforce budget constraints, and visualize financial health through an intuitive dashboard.

## 2. Target Audience & Scope
- **Target:** Individuals, family members, and small business needing shared or separate financial tracking.
- **Scope:** Web-based responsive application powered by Next.js App Router, secured via OAuth, and utilizing an ORM for data persistence.

## 3. Detailed Feature Requirements

### Phase 3.1: Authentication, Onboarding, & Static Pages
- **Landing Page:** Public marketing page optimized for SEO to drive user acquisition.
- **Legal Pages:** Dedicated, accessible routes for `/privacy-policy` and `/terms-of-service`.
- **Authentication:** 
  - Strictly **OAuth only** (e.g., Google, GitHub). Traditional username and password registration/login MUST be disabled.
  - Secure session tracking via HttpOnly cookies.
  - Email verification MUST be enforced for all OAuth providers.
  - Account linking must be disabled for security reasons. 
- **Mandatory Onboarding:**
  - Users accessing the app for the first time must be redirected to an onboarding flow.
  - **Requirements:** Collect profile setup data, force explicit acceptance of the Privacy Policy and Terms of Service, and prompt the creation of the first workspace.
- **Profile Management:**
  - Users can update their profile information (name, email, etc.).
  - Users can delete their account. (This action should be irreversible and require confirmation)

### Phase 3.2: Multi-Tenancy & Collaboration (Workspaces)
- **Workspace Management:** A user can create, update, and switch between multiple independent workspaces.
  - **Workspace Creation:** When the workspace is created, it needs to state the workspace name and currency used (default currency selected based on currencyPreference at their's profile).
  - **Currency Update:** User are not allowed to update the currency after workspace created.
- **Access Control:** Data must be strictly isolated by `workspace_id`.
- **Collaboration:** Users can invite other registered users via email to join a specific workspace. Invited users share real-time visibility and mutation capabilities within that workspace based on assignment.

### Phase 3.3: Accounts & Categories Configuration
- **Financial Accounts:** Each workspace can configure multiple financial accounts. Each account requires a unique name within the workspace, an account type, and tracks its own balance.
  - **Account Type:** Each account must have a type from a fixed set: `CHECKING`, `SAVINGS`, `CASH`, `CREDIT_CARD`, `DIGITAL_WALLET`, `INVESTMENT`. This field is set at creation and cannot be changed later. (MVP 2 will migrate this to a user-manageable account group table.)
  - **Initial Balance:** When creating an account, users can set an initial balance. And do not update this when Transaction created.
  - **Net Transaction Sum:** This field is used to track the net transaction sum of the account. It is updated when transaction is created, updated, or deleted. Use atomic update to ensure data consistency. **BEWARE OF RACE CONDITION**.
  - **Final Balance Calculation:** The final balance of an account is calculated as: `initialBalance + netTransactionSum`. The `netTransactionSum` starts at 0 when the account is created and is updated atomically when transactions are created, updated, or deleted (Phase 3.4). During Phase 3.3, the final balance equals the initial balance.
  - **Edit Rules:** When user edits account, they can only update it's name and initial balance. Other fields are not allowed to edit.
  - **Delete Rules:** User not allowed to delete account that already created, they can mark it as archived if it not used anymore.
  - **Archive Rules:** For account not used anymore, they can mark it as archived data. Archived accounts are displayed in a separate collapsed section on the accounts page (not hidden). They are excluded from the total balance summary. Archived accounts cannot be selected as source/destination when creating transactions.
  - **Unarchive Rules:** User can unarchive an archived account from the archived section.
- **Two-Level Categories:** Every transaction type must map to a sub-category system (e.g., Category: *Food* -> Sub-Category: *Restaurants*).
  - **Edit Rules:** When user edits category or sub category, they can only update it's name
  - **Delete Rules:** User not allowed to delete category or sub category that already created, they can mark it as archived if it not used anymore.
  - **Archive Rules:** For category or sub category not used anymore, they can mark it as archived data. If category is archive, automically it will make all sub category inside unaccesable too.
  - **Unarchive Rules:** User can unarchiving for archived category or sub category
- **Workspace Templates:** Upon workspace creation, provide pre-configured category and sub-category templates (e.g., Personal Finance, Family Finance, Small Business) that users can choose to auto-populate their setup.

### Phase 3.4: Transaction Management
- **Transaction Types:** Income, Expense, and Transfer.
- **Mandatory Fields:**
  - Transaction Date
  - Transaction Type
  - Category & Sub-category
    - Must be selected from the available categories and sub-categories in the workspace
    - Transactions reference categories and sub-categories via foreign key (`subCategoryId`). They do not store category/sub-category names. When a category or sub-category is renamed, all existing transactions automatically reflect the new name since they reference the record, not a stored string.
  - Account Association:
    - *Income:* Requires `Destination Account`.
    - *Expense:* Requires `Source Account`.
    - *Transfer:* Requires both `Source Account` and `Destination Account`.
  - Amount (Any non-zero numerical value, positive or negative — supports investment tracking and refunds)
- **Optional/Detailed Fields:**
  - Description/Notes (Text)
  - Payee/Payer (Text, third-party entity name)
  - Tags (Array of strings for flexible grouping)
  - Attachment URL: The application must provide a seamless file-picker UI. Behind the scenes, the image must be uploaded via the **Imgur API (Free Tier)** directly from the Next.js backend, and the resulting public image URL string will be persisted to the database. This ensures a native upload UX with $0 storage overhead.

### Phase 3.5: Budgeting System
- **Budget Scope:** Budgets are applied strictly to Level 2 (Sub-categories).
- **Constraints:** Each sub-category can have exactly **one** active budget at a time.
- **Intervals:** Budgets can be configured as either Monthly or Yearly. It must be defined when creating the budget and cannot be changed later.
- **Budget Period:** Each budget has a start and end date, defining its active period. Must be stored without time component (date only).
  - **Monthly:** Start date and end date must be the first day of the month.
  - **Yearly:** Start date and end date must be the first day of the year.
- **Monitoring:** Real-time tracking of budget utilization percentages against actual expenses in the corresponding category.

### Phase 3.6: Dashboard & Analytics
The workspace dashboard must compile and present the following financial insights:
1. **Top 5 Monthly Budgets:** List of 5 monthly budgets closest to exhaustion (highest percentage used) within the current calendar month.
2. **Top 5 Yearly Budgets:** List of 5 yearly budgets closest to exhaustion within the current calendar year.
3. **Expense Breakdown Chart:** A Pie/Donut chart displaying the distribution of Level 1 (Parent) categories for all *Expense* types in the current calendar month.
4. **Balance Trend Chart:** A line chart displaying the historical movement of the aggregated net balance (sum of all account balances) at the end of each month, tracking a rolling **6 months** backward from the current month.
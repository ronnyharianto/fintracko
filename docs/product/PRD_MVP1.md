# Product Requirement Document (PRD) - Fintracko MVP 1

## 1. Overview & Objectives
Fintracko is a collaborative personal and business financial tracking SaaS application. The goal of MVP 1 is to provide users with a robust platform to manage multiple financial workspaces, collaborate with other users, track income/expenses/transfers, enforce budget constraints, and visualize financial health through an intuitive dashboard.

## 2. Target Audience & Scope
- **Target:** Individuals, freelancers, and small teams needing shared or separate financial tracking.
- **Scope:** Web-based responsive application powered by Next.js App Router, secured via OAuth, and utilizing an ORM for data persistence.

## 3. Detailed Feature Requirements

### Phase 3.1: Authentication, Onboarding, & Static Pages
- **Landing Page:** Public marketing page optimized for SEO to drive user acquisition.
- **Legal Pages:** Dedicated, accessible routes for `/privacy-policy` and `/terms-of-service`.
- **Authentication:** 
  - Strictly **OAuth only** (e.g., Google, GitHub). Traditional username and password registration/login MUST be disabled.
  - Secure session tracking via HttpOnly cookies.
- **Mandatory Onboarding:**
  - Users accessing the app for the first time must be redirected to an onboarding flow.
  - **Requirements:** Collect profile setup data, force explicit acceptance of the Privacy Policy and Terms of Service, and prompt the creation of the first workspace.
- **Profile Management:**
  - Users can update their profile information (name, email, etc.).
  - Users can delete their account. (This action should be irreversible and require confirmation)

### Phase 3.2: Multi-Tenancy & Collaboration (Workspaces)
- **Workspace Management:** A user can create, update, and switch between multiple independent workspaces.
- **Access Control:** Data must be strictly isolated by `workspace_id`.
- **Collaboration:** Users can invite other registered users via email to join a specific workspace. Invited users share real-time visibility and mutation capabilities within that workspace based on assignment.

### Phase 3.3: Accounts & Categories Configuration
- **Accounts:** Each workspace can configure multiple financial accounts (e.g., Cash, Bank, Digital Wallet). Each account requires a unique name and tracks its own balance.
- **Two-Level Categories:** Every transaction type must map to a sub-category system (e.g., Category: *Food* -> Sub-Category: *Restaurants*).
- **Workspace Templates:** Upon workspace creation, provide pre-configured category and sub-category templates (e.g., Personal Finance, Family Finance, Small Business) that users can choose to auto-populate their setup.

### Phase 3.4: Transaction Management
- **Transaction Types:** Income, Expense, and Transfer.
- **Mandatory Fields:**
  - Transaction Date
  - Transaction Type
  - Sub-category
  - Account Association:
    - *Income:* Requires `Destination Account`.
    - *Expense:* Requires `Source Account`.
    - *Transfer:* Requires both `Source Account` and `Destination Account`.
  - Amount (Positive numerical value)
- **Optional/Detailed Fields:**
  - Description/Notes (Text)
  - Payee/Payer (Text, third-party entity name)
  - Tags (Array of strings for flexible grouping)
  - Attachment URL: The application must provide a seamless file-picker UI. Behind the scenes, the image must be uploaded via the **Imgur API (Free Tier)** directly from the Next.js backend, and the resulting public image URL string will be persisted to the database. This ensures a native upload UX with $0 storage overhead.

### Phase 3.5: Budgeting System
- **Budget Scope:** Budgets are applied strictly to Level 2 (Sub-categories).
- **Constraints:** Each sub-category can have exactly **one** active budget at a time.
- **Intervals:** Budgets can be configured as either Monthly or Yearly.
- **Monitoring:** Real-time tracking of budget utilization percentages against actual expenses in the corresponding category.

### Phase 3.6: Dashboard & Analytics
The workspace dashboard must compile and present the following financial insights:
1. **Top 5 Monthly Budgets:** List of 5 monthly budgets closest to exhaustion (highest percentage used) within the current calendar month.
2. **Top 5 Yearly Budgets:** List of 5 yearly budgets closest to exhaustion within the current calendar year.
3. **Expense Breakdown Chart:** A Pie/Donut chart displaying the distribution of Level 1 (Parent) categories for all *Expense* types in the current calendar month.
4. **Balance Trend Chart:** A line chart displaying the historical movement of the aggregated net balance (sum of all account balances) at the end of each month, tracking a rolling **6 months** backward from the current month.
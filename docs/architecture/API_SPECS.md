# API Specifications & Data Contracts - Fintracko

## 1. Global Response Standards

To maintain total consistency across the Next.js App Router ecosystem and future mobile application integrations, all Route Handlers (`app/api/...`) must return a unified envelope structure. Every financial calculation is represented accurately as string-serialized numeric values to preserve high-precision decimal formatting without floating-point degradation.

### Success Response Envelope

{
"success": true,
"data": {},
"timestamp": "2026-07-11T11:56:55Z"
}

### Failure Response Envelope

{
"success": false,
"error": {
"code": "BAD_REQUEST",
"message": "Detailed action-specific error message providing transparent failures.",
"validationErrors": []
},
"timestamp": "2026-07-11T11:56:55Z"
}

---

## 2. Global Security & Gateway Pipeline

Every API Route Handler endpoint must process incoming payloads through a hardened security and authorization pipeline before triggering core business or ORM logic:

- **Session & Identity Extraction:** Validate the HTTP session cookie or `Bearer` authorization headers strictly using Better Auth. Retrieve the validated `userId`.
- **Onboarding Verification Guard:** Perform a fast query to check for the existence of a `Profile` record linked to the `userId`. If no `Profile` record exists, the user is structurally unauthorized to interact with non-public modules and must be blocked immediately with a `403 Forbidden` response (`ONBOARDING_REQUIRED`).
- **Workspace Multi-Tenancy Isolation (Anti-IDOR):** Extract `workspaceId` from the payload body, headers, or query parameters. Query the `WorkspaceMember` table using a compound look-up containing _both_ the active `workspaceId` and the authenticated `userId`. If no member row exists, the request immediately terminates with a `403 Forbidden` (`UNAUTHORIZED_WORKSPACE_ACCESS`).
- **Rate Limiting & Input Validation:** Track consumption using client headers. Every incoming request must be parsed and strictly validated at runtime against explicit Zod schemas. Input fields susceptible to rich text or custom entries must be rigorously sanitized using trusted libraries (e.g., `isomorphic-dompurify`) to completely neutralize Cross-Site Scripting (XSS) vectors before passing into Prisma queries.

---

## 3. Core Feature Contracts (API Route Handlers)

### 3.1 Workspace Module

#### `POST /api/v1/workspaces`

- **Description:** Creates a new independent workspace, assigns the creator as owner, and populates the default categories structure out of a local codebase configuration constant file.
- **Zod Payload Schema:**
  ```typescript
  const CreateWorkspaceSchema = zod.object({
    name: zod.string().min(1).max(100),
    templateName: zod.enum(["PERSONAL", "FAMILY", "SMALL_BUSINESS"]),
  });
  ```
- **Database Operation Flow:**
  1. Runs within a Prisma `$transaction` block.
  2. Creates a record in the `Workspace` table.
  3. Injects a matching entry into `WorkspaceMember` with `role: "OWNER"`.
  4. Evaluates the `templateName` static constant to parse default Category (Level 1) and SubCategory (Level 2) configurations. Batches insertions into the database pre-bound to the newly created `workspaceId`.

#### `POST /api/v1/workspaces/[workspaceId]/invite`

- **Description:** Invites a collaborator by email to participate in the active workspace identified by the `[workspaceId]` path segment.
- **Zod Payload Schema:**
  ```typescript
  const InviteMemberSchema = zod.object({
    email: zod.string().email(),
  });
  ```
- **Path Parameter Note:** The `workspaceId` is extracted from the dynamic route segment (`params.workspaceId`) and validated against the authenticated user's `WorkspaceMember` membership prior to any database mutation, in accordance with the Anti-IDOR guard. It is intentionally omitted from the request body.
- **Behavior:** 1. Looks up the recipient user via `User` table indexes using the `email` key. 2. If the user does not exist, returns a `404 Not Found` response containing the code `NOT_FOUND` and message `"Email not registered"`. 3. If found, inserts a new `WorkspaceMember` record with `role: "COLLABORATOR"`.

### 3.2 FinancialAccount Module

#### `POST /api/v1/accounts`

- **Description:** Provisions a new financial asset ledger node inside a specific workspace.
- **Zod Payload Schema:**
  ```typescript
  const CreateAccountSchema = zod.object({
    workspaceId: zod.string().uuid(),
    name: zod.string().min(1).max(50),
    initialBalance: zod
      .string()
      .refine((val) => !isNaN(Number(val)), {
        message: "Must be a valid numeric decimal string",
      }),
  });
  ```
- **Behavior:** Inserts a `FinancialAccount` record. Sets the `initialBalance` field exactly to the requested payload value while ensuring the `netTransactionSum` field defaults to `0.0000` (meaning current calculated balance is perfectly equivalent to `initialBalance + netTransactionSum`).

---

### 3.3 Transaction Module (Critical Ledger)

#### `POST /api/v1/transactions`

- **Description:** Records a financial mutation event (Income, Expense, or Transfer) and executes isolated atomic updates onto the respective target ledger balance sums.
- **Zod Payload Schema:**
  ```typescript
  const CreateTransactionSchema = zod.object({
    workspaceId: zod.string().uuid(),
    type: zod.enum(["INCOME", "EXPENSE", "TRANSFER"]),
    amount: zod
      .string()
      .refine((val) => Number(val) > 0, {
        message: "Amount must be a strictly positive decimal value",
      }),
    subCategoryId: zod.string().uuid(),
    date: zod.string().datetime(),
    sourceAccountId: zod.string().uuid().optional(),
    destinationAccountId: zod.string().uuid().optional(),
    description: zod.string().max(500).nullable().optional(),
    payeePayer: zod.string().max(100).nullable().optional(),
    tags: zod.array(zod.string()).optional(),
    attachmentUrl: zod.string().url().nullable().optional(),
  });
  ```
- **Database Operation & Invariant Execution Lifecycle:**
  Must run securely inside a Prisma `$transaction` isolation block:
  1. **Structural Verification:** Checks that the provided `subCategoryId` belongs to the `SubCategory` table (Level 2) and maps back to a valid Level 1 parent `Category` row within that same workspace.
  2. **Account Direction Safeguards:**
     - If `type === "INCOME"`, `destinationAccountId` is mandatory.
     - If `type === "EXPENSE"`, `sourceAccountId` is mandatory.
     - If `type === "TRANSFER"`, both `sourceAccountId` and `destinationAccountId` are mandatory.
  3. **Ledger Record Insertion:** Inserts the `FinancialTransaction` ledger record.
  4. **Safe Atomic Arithmetic Adjustments:**
     - For `INCOME`: Increments the `netTransactionSum` of the `destinationAccountId` (linked `FinancialAccount`) by the transaction value.
     - For `EXPENSE`: Decrements the `netTransactionSum` of the `sourceAccountId` (linked `FinancialAccount`) by the transaction value.
     - For `TRANSFER`: Concurrently decrements the `sourceAccountId` and increments the `destinationAccountId` matching `FinancialAccount` balance records.

---

### 3.4 Budgeting Module

#### `POST /api/v1/budgets`

- **Description:** Binds a financial threshold boundary limit over a specific Level 2 SubCategory.
- **Zod Payload Schema:**
  ```typescript
  const SetBudgetSchema = zod.object({
    workspaceId: zod.string().uuid(),
    subCategoryId: zod.string().uuid(),
    amount: zod.string().refine((val) => Number(val) >= 0),
    interval: zod.enum(["MONTHLY", "YEARLY"]),
  });
  ```
- **Behavior:**
  1. Verifies that the targeted `subCategoryId` is explicitly a Level 2 entity.
  2. Utilizes PostgreSQL upsert logic via the compound unique key constraint `[subCategoryId, interval]`. Updates the threshold target value if an operational row matches, or inserts a new row if it is a fresh target assignment.

---

## 4. Dashboard Analytics Contracts

### `GET /api/v1/analytics/dashboard?workspaceId=[id]`

- **Authorization:** Session cookie / Bearer token validation matching active user context membership.
- **Output Payload Design (`data` contract):**
  ```json
  {
    "success": true,
    "data": {
      "topMonthlyBudgets": [
        {
          "budgetId": "b7c25a74-2ef1-424d-bd16-f363c8be819c",
          "subCategoryName": "Restaurants",
          "limitAmount": "500.0000",
          "spentAmount": "450.5000",
          "utilizationPercentage": 90.1
        }
      ],
      "topYearlyBudgets": [
        {
          "budgetId": "e305d21a-9694-4d8b-a7e3-0cfa0b83e401",
          "subCategoryName": "Software SaaS Licenses",
          "limitAmount": "2400.0000",
          "spentAmount": "2100.0000",
          "utilizationPercentage": 87.5
        }
      ],
      "expenseBreakdown": [
        {
          "parentCategoryName": "Food & Dining",
          "totalSpent": "850.2500",
          "percentageContribution": 45.2
        },
        {
          "parentCategoryName": "Business Operations",
          "totalSpent": "1030.0000",
          "percentageContribution": 54.8
        }
      ],
      "balanceTrend": [
        {
          "month": "2026-02",
          "aggregatedNetBalance": "15450.0000"
        },
        {
          "month": "2026-03",
          "aggregatedNetBalance": "17200.5000"
        },
        {
          "month": "2026-04",
          "aggregatedNetBalance": "16900.2000"
        },
        {
          "month": "2026-05",
          "aggregatedNetBalance": "19400.0000"
        },
        {
          "month": "2026-06",
          "aggregatedNetBalance": "22150.7500"
        },
        {
          "month": "2026-07",
          "aggregatedNetBalance": "24800.0000"
        }
      ]
    },
    "timestamp": "2026-07-11T11:56:55Z"
  }
  ```

# Implementation Plan: Phase 3.6 — Dashboard & Analytics

**Date:** 2026-09-19
**Status:** ✅ Implemented (static gates pass; manual flows pending)
**Depends on:** Phase 3.3 (Categories), Phase 3.4 (Transactions), Phase 3.5 (Budgets incl.
recurring ranges) — all implemented. This is the final PRD phase for MVP 1.

---

## Overview

Replace the placeholder `/dashboard` page with the workspace dashboard that compiles the
four insights required by PRD §Phase 3.6:

1. **Top 5 Monthly Budgets** — monthly budgets closest to exhaustion within the current
   calendar month.
2. **Top 5 Yearly Budgets** — yearly budgets closest to exhaustion within the current
   calendar year.
3. **Expense Breakdown Chart** — pie/donut of expense distribution by **Level 1 (parent)
   category** for the current calendar month.
4. **Balance Trend Chart** — line chart of the aggregated net balance (sum of all account
   final balances) at the end of each month, rolling **6 months** backward from the
   current month.

All four sections come from one new analytics feature module and one summary endpoint;
the page is a thin client that renders them with the existing UI primitives.

### Codebase Anchors (verified before writing this plan)

| Anchor | Relevance |
|---|---|
| `getBudgets(userId, workspaceId, { from, to, interval })` in `src/features/budgets/services.ts` | Already resolves each budget to the periods intersecting a window with per-period `limit` and `spent` — the Top 5 lists reuse it directly |
| `computeUtilization` + `BudgetView.utilization` | Ranking metric for the Top 5 lists |
| `useWorkspaceCollection({ query })` in `src/lib/hooks/` | Fetch hook already supports windowed query strings and returns the raw `response` |
| `withPipeline` + `success()`/`failure()` envelope | Route adapter pattern for the new endpoint |
| Prisma `Decimal(18,4)` aggregates, serialized as strings | Money math convention for all new aggregations |
| `formatCurrency`, `cn`, Badge/Card primitives | Presentation consistency |
| `package.json` has **no chart library** | Chart rendering approach must be chosen (see Decision below) |
| `src/app/(workspace)/dashboard/page.tsx` is a placeholder stub | The page this plan replaces |
| `@@index([workspaceId, date, type])` on `FinancialTransaction` | Supports the expense-month and balance-window aggregates |

---

## Locked Decisions

- **One endpoint.** `GET /api/v1/workspaces/[id]/dashboard/summary` returns all four
  sections in a single payload (`{ topMonthly, topYearly, expenseBreakdown, balanceTrend }`).
  The dashboard renders every section together; one round trip keeps the page coherent
  (one loading state, one error state) and avoids four pipeline invocations per view.
- **Top 5 ranking.** Sort by utilization descending, take 5. Utilization comes from the
  same per-period resolution the budgets page uses, so a monthly range budget contributes
  only the current month's period (its own limit), and a yearly budget contributes the
  current year. Ties break by higher `spent`, then subcategory name.
- **Top 5 scoping.** Monthly list: `getBudgets(..., { from: monthStart, to: monthEnd,
  interval: "MONTHLY" })`. Yearly list: `getBudgets(..., { from: yearStart, to: yearEnd,
  interval: "YEARLY" })`. This matches the PRD's "within the current calendar
  month/year" and, because `resolvePeriods` clips to the window, a recurring monthly
  budget is measured only on the month in view.
- **Expense breakdown grouping.** Prisma cannot `groupBy` a relation field, so the
  service aggregates expense sums per `subCategoryId` (`groupBy` + `_sum`), then maps
  subcategories to their parent category and rolls the sums up by category in JS with
  Decimal. Only `EXPENSE` transactions in the current month, non-archived categories
  included; archived subcategories still count if they carry transactions (they exist in
  history).- **Balance trend reconstruction.** Month-end historical balances are not stored, so each point is derived:
  `balanceAt(monthEnd) = currentTotalBalance - Σ (net transaction effects after monthEnd)`.
  The service loads the workspace's transactions once for the 6-month window
  (`type, amount, date, sourceAccountId, destinationAccountId`) and walks the months
  backward in JS, applying per-transaction deltas (`-amount` when source, `+amount` when
  destination — the same direction rule as `balanceEffect` in the transactions service).
  Deltas are applied **only for accounts still counted in the total**, so a transaction
  touching a since-archived account is not subtracted from a total that never included
  it. The current-month point uses the live total (today's running balance, labeled as
  the current month).
- **Archived accounts are excluded** from the aggregated balance trend, matching the
  accounts page rule that archived accounts are excluded from total-balance summaries.
- **Currency.** All amounts are displayed in the workspace currency (presentation label
  only). No conversion — consistent with the rest of the app.
- **Date handling.** Month/year bounds are ISO `YYYY-MM-DD` strings via the existing
  `src/lib/date-period.ts` helpers; transaction `date` is `@db.Date`, so string
  comparisons stay timezone-safe (same pattern the budgets service uses).

### Assumptions (not explicitly stated in the PRD)

- "Highest percentage used" ranks on utilization even when over 100 (an over budget is
  the most exhausted, so it ranks first).
- A budget with zero spend ranks below any budget with usage; lists may be shorter than 5
  when the workspace has fewer eligible budgets, and the section shows an empty state.
- The expense breakdown includes negative expenses (refunds), which reduce a category's
  share; a category whose net is zero or negative is omitted from the chart.
- The balance trend includes the workspace's `FinancialAccount`s regardless of type
  (credit cards carry negative-capable balances by design).

### Documented Deviation Risks (PRD vs. implementation)

- The PRD says the balance trend tracks "the end of each month". The current month
  cannot have an end-of-month value yet; the plan renders the running balance as the
  final point (labeled with the current month). Alternative (omit the current month)
  loses the most useful data point, so this is taken deliberately and noted in the UI
  tooltip/label.

---

## Chart Rendering — Decision

**Chosen: dependency-free SVG chart primitives** built in-house
(`src/components/ui/` or dashboard-local `_components/`):

- Donut chart: SVG circles with `stroke-dasharray` segments — no animation library
  needed; legend as an adjacent list with percentage + amount.
- Line chart: SVG `polyline` over a computed min/max scale, month labels beneath, dot
  markers and value labels on hover (title/tooltip), axis baseline for zero when the
  range includes it.

Rationale: AGENTS.md §3/§6 says to avoid adding a client dependency when existing
helpers solve the problem; both charts are simple, bounded (max ~12 segments/6 points),
and must match the design tokens exactly. **Fallback:** if richer interaction
(tooltips on touch, animations, responsive axes) proves necessary during the manual
pass, adopt `recharts` in a follow-up rather than growing the in-house implementation
indefinitely.

---

## AGENTS.md Compliance

| Rule | How It Is Addressed |
|---|---|
| §1 Operating Standard | Anchored on existing services (`getBudgets`, transaction schema); every task ends in a validation step |
| §2 Conventions | English, `@/*` imports, existing formatting preserved, ASCII |
| §3 Architecture | New feature module `src/features/analytics/`; route handler is a thin adapter over the pipeline; functional modules; no new classes beyond the existing error-contract pattern |
| §4 Data & Security | Membership enforced via `requireMembership` in every service call; query params validated with Zod (empty/optional today, but the schema guards future filters); Decimal-only money math; no raw SQL |
| §5 Error Design | Typed analytics error module mirroring budgets/transactions; unexpected errors fall through to the generic 500 |
| §6 Frontend | Client page uses `apiFetch` via `useWorkspaceCollection`; skeleton loading, empty states per section, error + retry; no `dangerouslySetInnerHTML`; stable dimensions so labels never shift layout |
| §7 Validation Gates | `tsc --noEmit`, `lint`, `build`, plus manual flows; no automated tests exist (documented limitation) |
| §10 Definition of Done | Checklist at the end of this document |

---

## Sub Tasks

- [x] 1. Phase development document (`docs/development/2026-09-19-phase-3-6-dashboard-analytics.md`)
  - [x] Scope, decisions, assumptions, deviation notes, chart decision
  - [x] Keep checkboxes current as tasks land
  - **Validate:** document matches the implemented contract

- [x] 2. Feature types (`src/features/analytics/types.ts`)
  - [x] `DashboardSummary` = `{ topMonthly: BudgetView[]; topYearly: BudgetView[]; expenseBreakdown: ExpenseBreakdownSlice[]; balanceTrend: BalanceTrendPoint[] }`
  - [x] `ExpenseBreakdownSlice` = `{ categoryId, categoryName, amount (decimal string), share (0–100 number, presentation only) }`
  - [x] `BalanceTrendPoint` = `{ month (YYYY-MM), label (e.g. "Apr 2026"), balance (decimal string), isCurrent (boolean) }`
  - [x] Reuse `BudgetView` from `@/features/budgets/types` for the Top 5 lists
  - **Validate:** `npx tsc --noEmit`

- [x] 3. Feature errors (`src/features/analytics/errors.ts`)
  - [x] `AnalyticsServiceError` + `handleAnalyticsErrors()` mirroring the budgets module (codes: `FORBIDDEN` to start)
  - **Validate:** `npx tsc --noEmit`

- [x] 4. Analytics service (`src/features/analytics/services.ts`)
  - [x] `requireMembership()` reusing `findWorkspaceMembership`
  - [x] `getTopBudgets(userId, workspaceId, interval, { from, to })` — calls `getBudgets`, sorts by utilization desc (tie: spent desc, then name), slices 5
  - [x] `getExpenseBreakdown(userId, workspaceId, { from, to })` — `groupBy` expense sums per `subCategoryId` in the window; join subcategory → parent category; roll up by category with Decimal; compute share; sort desc
  - [x] `getBalanceTrend(userId, workspaceId, { months })` — load non-archived accounts (id + initialBalance + netTransactionSum) and window transactions once; walk 6 month-ends backward applying signed deltas (restricted to accounts still counted in the total); emit oldest → newest with the current month's live total as the last point
  - [x] `getDashboardSummary(userId, workspaceId)` — compose the three helpers with the current month/year bounds from `date-period`
  - **Validate:** `npx tsc --noEmit`

- [x] 5. API route (`src/app/api/v1/workspaces/[id]/dashboard/summary/route.ts`)
  - [x] `GET` with `withPipeline` + `requireOnboarding`; no body to validate; call `getDashboardSummary`; return `success(summary)`
  - [x] Consume the `id` path param in the authorization predicate via the service (§4)
  - **Validate:** `npx tsc --noEmit`; route flow needs a running app (documented limitation)

- [x] 6. Donut chart primitive (`src/components/ui/donut-chart.tsx`)
  - [x] Props: `{ slices: { label, value }[]; centerLabel?; centerValue?; valueFormatter?; emptyMessage? }`; renders SVG donut + legend. Colors come from the `--chart-*` token palette owned by the component (literal `stroke-chart-N`/`bg-chart-N` classes), not a caller-supplied `colorClass`.
  - [x] Stable sizing (fixed viewBox, responsive width); accessible: `role="img"` + `aria-label` summarizing the data
  - [x] Empty variant when there are no slices
  - **Validate:** `npx tsc --noEmit`

- [x] 7. Line chart primitive (`src/components/ui/line-chart.tsx`)
  - [x] Props: `{ points: { label, value }[]; valueFormatter?; emptyMessage? }`; SVG polyline with scaled min/max, month labels, end-point emphasis
  - [x] `tabular-nums` value labels; honest zero baseline when range crosses it
  - **Validate:** `npx tsc --noEmit`

- [x] 8. Dashboard page (`src/app/(workspace)/dashboard/page.tsx`)
  - [x] Replace the stub with a `"use client"` page using `useWorkspace()` + `useWorkspaceCollection` (path → `/dashboard/summary`)
  - [x] Greeting/period header consistent with the transactions page
  - [x] Sections: Top 5 Monthly, Top 5 Yearly (compact ranked rows reusing budget progress-bar styling), Expense Breakdown (donut), Balance Trend (line)
  - [x] Skeleton loading; per-section empty states (no budgets / no expenses this month / no accounts yet); error + Retry via `refetch`
  - [x] Keep the page thin — all ranking/aggregation lives in the feature service
  - **Validate:** `npx tsc --noEmit`

- [x] 9. Sidebar verification (`src/components/shared/workspace/sidebar.tsx`)
  - [x] Confirm the Dashboard nav item resolves to `/dashboard` — no change needed
  - **Validate:** `npx tsc --noEmit`

- [ ] 10. Final validation (§7 + §10)
  - [x] `npx tsc --noEmit`
  - [x] `npm run lint`
  - [x] `npm run build`
  - [ ] Manual: dashboard loads with all four sections for a populated workspace
  - [ ] Manual: Top 5 ordering matches budgets-page utilization; recurring budgets count only the period in view
  - [ ] Manual: breakdown shares sum to ~100% and match a manual expense tally; refunds reduce a category
  - [ ] Manual: balance trend endpoint balances reconcile with the accounts page totals; a new transaction moves the current point
  - [ ] Manual: empty workspace shows every section's empty state; error state retries
  - [ ] Manual: cross-workspace isolation (switch workspace, numbers change)
  - [ ] Report validated items and remaining limitations

---

## Files to Create

| File | Purpose |
|---|---|
| `docs/development/2026-09-19-phase-3-6-dashboard-analytics.md` | This plan |
| `src/features/analytics/types.ts` | `DashboardSummary`, slice/point types |
| `src/features/analytics/errors.ts` | Typed errors + envelope mapping |
| `src/features/analytics/services.ts` | Summary composition: Top 5 lists, breakdown aggregation, balance reconstruction |
| `src/app/api/v1/workspaces/[id]/dashboard/summary/route.ts` | `GET` summary endpoint |
| `src/components/ui/donut-chart.tsx` | Dependency-free SVG donut + legend |
| `src/components/ui/line-chart.tsx` | Dependency-free SVG line chart |

## Files to Modify

| File | Change |
|---|---|
| `src/app/(workspace)/dashboard/page.tsx` | Replace placeholder stub with the real dashboard |
| `src/components/shared/workspace/sidebar.tsx` | Verify only — expected no change |

---

## Carry-over: Pending Manual Validations from Phase 3.5

The Phase 3.5 and Recurring Budgets plans still have unchecked manual-flow items. Fold
them into this phase's manual pass since the dashboard exercises the same data:

- [ ] Manual: create monthly + yearly (recurring) budget; edit amount with the impact prompt; split; delete
- [ ] Manual: overlapping budget rejected with `CONFLICT`; archived / non-EXPENSE subcategory rejected
- [ ] Manual: utilization reflects a refund (negative expense) — also visible in the dashboard Top 5

---

## Out of Scope

- Automated tests (no harness exists; deferred by prior product decisions).
- Custom date-range selection for the dashboard (PRD fixes the windows to "current
  month/year" and a 6-month lookback).
- Budget rollover/carry-over (explicitly out of scope since the recurring-budgets plan).
- Currency conversion for multi-currency accounts.
- Real-time refresh (data is fetched on mount and via manual Retry, matching the other pages).

## Risks and Limitations

1. **Historical balances are reconstructed, not stored.** Correct as long as transaction
   mutations keep account direction rules; an audit/reporting feature later may prefer a
   persisted month-end snapshot table.
2. **Aggregation cost.** The breakdown uses one `groupBy` and the trend one windowed
   select + one accounts select — three queries total plus the two budget lists. Fine at
   MVP scale; the trend's in-memory walk is the first candidate to move into SQL if
   transaction volume grows.
3. **No automated tests** — validation relies on static gates and manual flows, as
   documented in every prior phase.
4. **In-house charts** trade interaction richness for zero dependencies; the fallback
   path (adopt `recharts`) is pre-agreed if the manual pass shows gaps.
5. **Trend uses today's archive state.** A historical point excludes an account that
   is archived now, even if it was active at that month end (and vice versa). Acceptable
   for MVP where archiving is rare; a persisted month-end snapshot would remove it.
6. **Future-dated transactions are not reconstructed.** The window ends at today, but
   `netTransactionSum` includes transactions entered with a future date. Such entries
   would make earlier reconstructed points slightly off until the date passes.

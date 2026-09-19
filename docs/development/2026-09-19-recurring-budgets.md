# Implementation Plan: Recurring Budgets

**Date:** 2026-09-19
**Status:** 🚧 Implemented (static validation green; manual flows pending)
**Depends on:** Phase 3.5 (Budgeting System) — implemented.

---

## Model

A budget row is a **range**: `[startDate, endDate]` + `interval` + a **per-period** amount.
It applies to every interval-aligned period inside the range, each with its own limit.

- Recurring = the range spans many periods.
- "No end" = `endDate` `9999-12-31` (already the schema default).
- No cron, no per-period rows, no materialization.

Example: `MONTHLY, 2026-01-01 → 2026-06-30, 500` = six separate 500 limits.

## Rules

- Amount is per period.
- Boundaries aligned: start = first day of a month/year, end = last day.
- One row per contiguous range per subcategory; ranges must not overlap.
- Edits apply to the whole range, behind the impact prompt.
- Budgets still target non-archived EXPENSE subcategories only.

## Impact Prompt

Fires when an edit changes the limit of at least one **already-ended** period.

- Names the impact: "Changing the limit from 500.00 to 600.00 affects 4 months that have
  already passed (Sep - Dec 2026)."
- Actions: **Apply to all periods** / **Keep past periods unchanged** (split at the current
  period) / **Cancel**.
- Overlap violations are not part of this prompt — the service rejects them with `CONFLICT`.

## Changes

| Area | Change |
|---|---|
| Schema | None. `9999-12-31` already means "no end". |
| `schemas.ts` | Allow aligned ranges; drop the same-period restriction. |
| `utilization.ts` | `isRangeAligned`, `resolvePeriods`, `elapsedRun`, `describeHistoricalImpact`. |
| `services.ts` | Resolve the effective periods per view; sum spend there; keep the overlap check. |
| API | List accepts the viewed window (`from`/`to`). |
| UI | Start/end period fields + "No end date"; future navigation unlocked; period token as a range. |

## Implementation Notes

- **`resolvePeriods` replaced the planned `periodContaining`.** Clipping the window to the
  range and then rounding both ends to period bounds answers the whole question at once: it
  reports how many periods the view covers and the exact date span to sum spend over. The
  window is the intersection, so the yearly-budget-in-a-month and
  monthly-budget-rolled-up-in-a-year cases both fall out of the same call.
- **`spent` is summed per resolved window**, not per row range. A row range that spans many
  periods would otherwise sum everything since the budget began.
- **The view carries `periodStart`/`periodEnd`**, the row range clipped to the view. The card
  token renders those rather than the raw range, so an open-ended budget shows only the
  periods the current view measures: `Sep 2026` in month view, `Sep - Dec 2026` in the year
  that starts it, `Jan - Dec 2027` in the next year.
- **The client sends the window**, so `useWorkspaceCollection` gained an optional `query`
  (appended to the path, and part of the fetch effect's dependencies) and now also returns
  the raw `response` — the page needs `totalInWorkspace` to tell "no budgets at all" from
  "nothing in this month".
- **"Affected" means the limit actually changes**, not the periods that still exist. A period
  counts when the edit starts or stops covering it, or when it stays covered while the amount
  moves; periods covered both before and after at the same amount are untouched. So shortening
  a range from Jan to Jul reports the 6 dropped months (Jan - Jun), not the 2 that remain.
  Dropping or adding periods at both ends yields two runs in one prompt
  ("Jan - Feb 2026 and Jul - Aug 2026").
- **Split point** for "Keep past periods unchanged" depends on what moved. When the start
  moves forward the boundary is the new start, so the new range begins exactly where the user
  put it and earlier periods keep the old limit (Jan -> Jul writes Jan - Jun at the old amount
  plus Jul onward at the new one). When the start is unchanged — an amount-only edit — the
  boundary is the current period, so every elapsed period keeps the old limit. Extending the
  start backwards cannot be split at all, because the added periods would fall inside the
  range being preserved; there the only action is "Apply to all periods". The dialog states
  the exact split it will write, so the outcome is visible before saving.
- **Create defaults to "Repeats, no end date"** — recurrence is the point of the feature — and
  the start period defaults to the month or year being reviewed.
- **Interval filter and search stay client-side**; only period scoping moved to the server.

## Tasks

- [x] 1. Range-aware validation in `schemas.ts` and `utilization.ts`
- [x] 2. Effective-period resolution + per-period spend in `services.ts`
- [x] 3. List endpoint accepts `from`/`to`
- [x] 4. Create dialog: start period, end period or "No end", amount
- [x] 5. Edit dialog: same fields + impact prompt with keep-history split
- [x] 6. Page: unlock future navigation; card period token as a range
- [ ] 7. Final validation: `tsc --noEmit`, `lint`, `build`, manual flows
  - [x] `npx tsc --noEmit`
  - [x] `npm run lint`
  - [x] `npm run build`
  - [ ] Manual: create recurring budget, edit amount with impact prompt, split, delete
  - [ ] Manual: month/year window roll-up and future-month navigation

## Resolved: Year View Roll-Up

A monthly range covering part of a year rolls its periods up across the year
(`periods` and `limit` = amount x periods), so the yearly total is the allocation for the
year rather than a single month.

## Out of Scope

Envelope carry / rollover of unused amounts. Nothing here blocks it: periods are derived, so
carry can be added later as a backward walk over them.

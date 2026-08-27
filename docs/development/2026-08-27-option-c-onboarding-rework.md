# Implementation Plan: Option C — Simplified Onboarding + Guided Workspace Creation

**Date:** 2026-08-27
**Status:** In Progress

---

## Overview

Split the current single-step onboarding into two focused steps:

```
Step 1: Profile Setup (/onboarding)
  → Name, Currency Preference, Accept Terms & Privacy

Step 2: Create First Workspace (/onboarding/workspace)
  → Workspace Name, Choose Template, Preview Categories

Step 3: Dashboard (/dashboard)
```

---

## Sub Tasks

- [ ] 1. Simplify Onboarding Schema
  - **File:** `src/features/onboarding/schemas.ts`
  - Add `name` field (required, 1–100 chars) — user's display name
  - Keep `currencyPreference` (USD/IDR — will expand later)
  - Remove `bio` and `dateOfBirth` — not needed for MVP, can collect later in profile settings
  - Remove `gender` — not needed for MVP
  - Update `CompleteOnboardingSchema` to: `{ name, currencyPreference }`

- [ ] 2. Update Onboarding Service
  - **File:** `src/features/onboarding/services.ts`
  - Remove Workspace and WorkspaceMember creation from `completeOnboarding()`
  - Only create Profile record
  - Update User.name from the provided name via `tx.user.update()`
  - Return only profile data (no workspace)

- [ ] 3. Update Onboarding API Route
  - **File:** `src/app/api/v1/onboarding/complete/route.ts`
  - Update to match new schema (name, currencyPreference)
  - Return only profile data (no workspace)
  - Keep `rejectIfOnboarded: true` guard

- [ ] 4. Simplify Onboarding Form
  - **File:** `src/components/shared/onboarding/onboarding-form.tsx`
  - Replace current fields with:
    - Name input (required)
    - Currency Preference dropdown (required, USD/IDR)
    - Terms of Service checkbox (required, must click link first)
    - Privacy Policy checkbox (required, must click link first)
  - Remove: Bio, Date of Birth, Gender
  - On success → redirect to `/onboarding/workspace`

- [ ] 5. Create Workspace Setup Page
  - **New file:** `src/app/(onboarding)/onboarding/workspace/page.tsx`
  - Full-page workspace creation form (not a dialog)
  - Fields:
    - Workspace Name (required)
    - Template selector (Personal / Family / Small Business) with category preview
    - Currency (pre-filled from profile, read-only)
  - Template preview shows categories before confirming
  - On success → redirect to `/dashboard`

- [ ] 6. Create Workspace Setup Component
  - **New file:** `src/components/shared/onboarding/workspace-setup-form.tsx`
  - Client component with form logic
  - Template cards with expandable category preview
  - Calls existing `POST /api/v1/workspaces` endpoint
  - Shows loading state during creation
  - Displays template categories so user knows what they're getting

- [ ] 7. Update Onboarding Layout Guard
  - **File:** `src/app/(onboarding)/layout.tsx`
  - Current logic:
    - No session → `/account`
    - Profile exists → `/dashboard`
    - No profile → show onboarding
  - New logic:
    - No session → `/account`
    - Profile exists + has workspace → `/dashboard`
    - Profile exists + no workspace → show workspace setup (`/onboarding/workspace`)
    - No profile → show profile onboarding (`/onboarding`)
  - Need to query WorkspaceMember to check for workspace existence

- [ ] 8. Update Dashboard Layout Guard
  - **File:** `src/components/guards/onboarding-guard-wrapper.tsx`
  - Current logic:
    - No session → `/account`
    - No profile → `/onboarding`
    - Profile exists → render
  - New logic:
    - No session → `/account`
    - No profile → `/onboarding`
    - Profile exists + no workspace → `/onboarding/workspace`
    - Profile exists + has workspace → render
  - Need to query WorkspaceMember to check for workspace existence

- [ ] 9. Test Complete Flow
  - New user sign-up → profile → workspace setup → dashboard
  - Returning user with profile + workspace → direct to dashboard
  - Returning user with profile but no workspace → redirect to workspace setup
  - User without session → redirect to account page
  - User with profile trying to access onboarding → redirect to workspace setup or dashboard
  - Workspace creation with each template (Personal, Family, Small Business)

---

## Guard Logic Summary

| Route | Session? | Profile? | Workspace? | Action |
|-------|----------|----------|------------|--------|
| `/account` | No | - | - | Show account page |
| `/account` | Yes | - | - | Redirect to `/onboarding` or `/dashboard` |
| `/onboarding` | No | - | - | Redirect to `/account` |
| `/onboarding` | Yes | No | - | Show profile form |
| `/onboarding` | Yes | Yes | - | Redirect to `/onboarding/workspace` |
| `/onboarding/workspace` | No | - | - | Redirect to `/account` |
| `/onboarding/workspace` | Yes | No | - | Redirect to `/onboarding` |
| `/onboarding/workspace` | Yes | Yes | - | Show workspace setup |
| `/dashboard` | No | - | - | Redirect to `/account` |
| `/dashboard` | Yes | No | - | Redirect to `/onboarding` |
| `/dashboard` | Yes | Yes | No | Redirect to `/onboarding/workspace` |
| `/dashboard` | Yes | Yes | Yes | Render dashboard |

---

## File Change Summary

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/features/onboarding/schemas.ts` | Modify | Add `name`, remove `bio`/`dateOfBirth`/`gender` |
| 2 | `src/features/onboarding/services.ts` | Modify | Remove workspace creation, only create profile + update user name |
| 3 | `src/app/api/v1/onboarding/complete/route.ts` | Modify | Update schema, return only profile |
| 4 | `src/components/shared/onboarding/onboarding-form.tsx` | Modify | Simplify to name + currency + legal |
| 5 | `src/app/(onboarding)/onboarding/workspace/page.tsx` | Create | Workspace setup page |
| 6 | `src/components/shared/onboarding/workspace-setup-form.tsx` | Create | Workspace setup form component |
| 7 | `src/app/(onboarding)/layout.tsx` | Modify | Add workspace check to guard |
| 8 | `src/components/guards/onboarding-guard-wrapper.tsx` | Modify | Add workspace check to guard |

---

## User Flow After Changes

```
1. User clicks "Start Now" on landing page
   ↓
2. /account — clicks "Continue with Google/GitHub"
   ↓
3. OAuth redirect → callback → session created
   ↓
4. /onboarding — Profile Setup form
   - Name
   - Currency Preference
   - Accept Terms & Privacy
   ↓
5. POST /api/v1/onboarding/complete
   - Creates Profile only
   ↓
6. /onboarding/workspace — Create First Workspace
   - Workspace Name
   - Choose Template (with category preview)
   - Currency (pre-filled, read-only)
   ↓
7. POST /api/v1/workspaces (existing endpoint)
   - Creates Workspace + seeds categories from template
   ↓
8. /dashboard — User sees real workspace with categories
```

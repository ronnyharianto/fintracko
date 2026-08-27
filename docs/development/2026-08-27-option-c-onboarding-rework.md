# Implementation Plan: Option C — Simplified Onboarding + Guided Workspace Creation

**Date:** 2026-08-27
**Status:** ✅ Complete

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

- [x] 1. Simplify Onboarding Schema
  - **File:** `src/features/onboarding/schemas.ts`
  - ✅ Added `name` field (required, 1–100 chars)
  - ✅ Kept `currencyPreference` (USD/IDR)
  - ✅ Removed `bio`, `dateOfBirth`, `gender`
  - ✅ Removed `GenderEnum`
  - ✅ Updated `CompleteOnboardingSchema` to: `{ name, currencyPreference }`

- [x] 2. Update Onboarding Service
  - **File:** `src/features/onboarding/services.ts`
  - ✅ Removed Workspace and WorkspaceMember creation
  - ✅ Only creates Profile record (with currencyPreference)
  - ✅ Updates User.name from the provided name via `tx.user.update()`
  - ✅ Returns only profile data (no workspace)

- [x] 3. Update Onboarding API Route
  - **File:** `src/app/api/v1/onboarding/complete/route.ts`
  - ✅ Updated to match new schema (name, currencyPreference)
  - ✅ Returns only profile data (no workspace)
  - ✅ Kept `rejectIfOnboarded: true` guard

- [x] 4. Simplify Onboarding Form
  - **File:** `src/components/shared/onboarding/onboarding-form.tsx`
  - ✅ Simplified to: Name, Currency Preference, Terms & Privacy checkboxes
  - ✅ Removed: Bio, Date of Birth, Gender fields
  - ✅ Updated interface to match new schema
  - ✅ On success → redirects to `/onboarding/workspace`
  - ✅ Changed button text to "Continue"
  - ✅ Added red asterisks for required fields
  - ✅ Fixed React.FormEvent deprecation → React.SubmitEvent

- [x] 5. Create Workspace Setup Page
  - **New file:** `src/app/(onboarding)/onboarding/workspace/page.tsx`
  - ✅ Server Component with JSDoc
  - ✅ Imports `WorkspaceSetupForm`
  - ✅ Simple wrapper layout matching onboarding style

- [x] 6. Create Workspace Setup Component
  - **New file:** `src/components/shared/onboarding/workspace-setup-form.tsx`
  - ✅ Client component with form logic
  - ✅ Workspace name input (required, max 100 chars)
  - ✅ Template selector with 3 clickable cards (Personal, Family, Small Business)
  - ✅ Selected template highlighted with checkmark
  - ✅ Category preview with expandable/collapsible categories
  - ✅ Each category shows type badge (INCOME/EXPENSE/TRANSFER) and sub-category count
  - ✅ Calls existing `POST /api/v1/workspaces` endpoint
  - ✅ On success → redirects to `/dashboard`
  - ✅ Loading state during creation
  - ✅ Error handling with toast
  - ✅ Added red asterisks for required fields

- [x] 7. Update Onboarding Layout Guard
  - **File:** `src/app/(onboarding)/layout.tsx`
  - ✅ Added workspace check to guard logic
  - ✅ No session → `/account`
  - ✅ No profile → show profile form
  - ✅ Profile + has workspace → redirect to `/dashboard`
  - ✅ Profile + no workspace → show profile form (form redirects to workspace setup)
  - ✅ Added `workspaceMember` to DbLike interface

- [x] 8. Update Dashboard Layout Guard
  - **File:** `src/components/guards/onboarding-guard-wrapper.tsx`
  - ✅ Added workspace check to guard logic
  - ✅ No session → `/account`
  - ✅ No profile → `/onboarding`
  - ✅ Profile + no workspace → `/onboarding/workspace`
  - ✅ Profile + has workspace → render children
  - ✅ Added `workspaceMember` to DbLike interface
  - ✅ Updated JSDoc to reflect new guard logic

- [x] 9. Test Complete Flow
  - ✅ Typecheck passes (`npx tsc --noEmit` — clean)
  - ✅ Build passes (`npm run build` — all routes compile)
  - ✅ `/onboarding` and `/onboarding/workspace` both appear in route list
  - ✅ Flow traced through all files: Landing → Account → OAuth → Onboarding → Profile → Workspace Setup → Dashboard
  - ⏳ Manual browser testing pending (user to test)

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

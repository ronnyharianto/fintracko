# Unit Test Audit — Gap Analysis & Test Generation Report

**Scope:** All co-located `*.test.ts(x)` files in the Fintracko repository
**Baseline:** 26 test files / 234 tests / 2 failing
**After audit:** 26 test files / 249 tests / 0 failing · `npm run lint` 0 errors · `tsc --noEmit` clean
**Tester role:** Senior QA / Software Engineer
**Conventions honored:** `vitest.config.mts` (jsdom + globals), `src/test/setup.ts`, `AGENT_RULES.md §4` (≥80% coverage for `features/*/services.ts`, `lib/api/*`, `lib/utils.ts`; mock at module boundary; never spin real DB / Better Auth).

---

## 1. Summary of Findings

### Two real production bugs discovered through the audit

| # | File | Severity | Issue | Resolution |
| --- | --- | --- | --- | --- |
| **BUG-1** | `src/lib/auth.ts` | High (security-relevant contract drift) | A duplicate `emailVerificationCallback` in the _test_ file falsely claimed that `null` is rejected, while the real production callback wired into `betterAuth()` only rejects `emailVerified === false`. Tests were green but **asserted a lie** — a user with a missing `emailVerified` flag would be allowed in production while the test-suite "verified" a stricter contract. | Extracted the real callback as a named export [`signInCallback`](src/lib/auth.ts:35) and wired it via `callbacks: { signIn: signInCallback }`. Rewrote `auth.test.ts` to test the _real_ export: `false` throws; `true`/`null`/`undefined`/absent pass through. |
| **BUG-2** | `src/lib/api/sanitize.ts` | Medium (silent semantic corruption) | The documented contract at the header comment ("Refuses to descend into … class instances") was **violated** by `walkAndSanitize`: only `Date`/`RegExp`/`Map`/`Set` were exempted. A custom class instance (e.g. `class Money { cents = 1099 }`) was silently re-cloned via `Object.entries`, stripping its prototype and breaking `instanceof`. Worse, an attacker-controlled `toJSON`/getter could have executed during traversal. | Added an `Object.getPrototypeOf(node)` check that refuses to descend into any object whose prototype is neither `Object.prototype` nor `null` (allowing `Object.create(null)`). Crucially placed the `Array.isArray` branch **before** this check so plain arrays (whose prototype is `Array.prototype`) are still recursed into. |

### Pre-existing broken tests fixed

| File | Root cause | Fix |
| --- | --- | --- |
| `src/app/(onboarding)/layout.test.tsx` | Mocked `@/components/guards/onboarding-access-guard-wrapper` (a path that never existed) instead of `onboarding-guard-wrapper`. The real async Server Component returned a `Promise` that `render()` couldn't await, leaving the body empty. | Corrected the mock path; used a passthrough fragment `({ children }) => <>{children}</>` to short-circuit the async guard during synchronous render. Added extra assertions: no marketing `NavBar`, `max-w-(lg | xl | 2xl)` container. |

---

## 2. Gap Analysis & Tests Generated

Per file: gap description → tests added (file:line).

### 2.1 `src/lib/utils.ts` — `cn()`

**Verdict:** Well-covered. No gaps.
Existing tests (`utils.test.ts`): class merging, falsy/conditional skipping, array/object joins.

### 2.2 `src/lib/db.ts` — Prisma singleton

**Verdict:** Well-covered. All 12 models + 5 enums + singleton identity asserted.

### 2.3 `src/lib/api/envelope.ts`

**Verdict:** Thorough. Status-code mapping, validation-error mapping, decimal-string precision, null/empty payloads all covered.

### 2.4 `src/lib/api/sanitize.ts`

**Gaps found:**

- G1: No test for nested arrays-of-arrays (matrix-shaped payloads).
- G2: No test that custom class instances preserve prototype (the documented contract BUG-2 broke).
- G3: No test that `Date` immunity applies recursively within plain objects.
- G4: No test for boolean/number leaves (non-XSS primitives passthrough).
- G5: No test for mixed markup (href `javascript:` + `onclick` + visible label).

**Tests added (`sanitize.test.ts`):**

- [`handles nested arrays-of-arrays`](src/lib/api/sanitize.test.ts:163)
- [`does not descend into a custom class instance (preserves reference + prototype)`](src/lib/api/sanitize.test.ts:179) — **the test that surfaced BUG-2**
- [`sanitizes string leaves nested inside a Date-immune object`](src/lib/api/sanitize.test.ts:194)
- [`treats boolean and number leaves as non-xss and passes them through unchanged`](src/lib/api/sanitize.test.ts:207)
- [`strips an event-handler attribute payload while keeping the visible label (mixed markup)`](src/lib/api/sanitize.test.ts:220)
- [`walks arrays whose elements are themselves objects`](src/lib/api/sanitize.test.ts:150) — protected by the array-recursion fix

### 2.5 `src/lib/api/pipeline.ts`, `session.ts`, `validate.ts`

**Verdict:** Thorough. Session short-circuit, validation short-circuit, sanitization skip-flag, decimal precision, error-throw containment all covered.

### 2.6 `src/lib/auth.ts` — `signInCallback`

**Gap found:** Tests asserted a _duplicate_ callback with divergent null-rejection semantics (BUG-1).
**Resolution:** Rewrote `auth.test.ts`:

- 7 tests over the real exported [`signInCallback`](src/lib/auth.test.ts:39): `false` throws, `true`/`null`/`undefined`/absent pass; "only literal `false` is rejected" invariant; cross-field invariant (does not trip on other user fields).
- Structural assertions: `auth.handler` is a function; route module exports `GET`/`POST`; `AuthClient` + `signInCallback` exports present.

### 2.7 `src/features/onboarding/schemas.ts` — `CompleteOnboardingSchema`

**Gaps found:** No timezone-offset rejection, no 500-char boundary, no empty-string bio, no type-inference sanity.
**Tests added (`schemas.test.ts`):**

- [`REJECT a non-UTC datetime that carries a timezone offset`](src/features/onboarding/schemas.test.ts:182)
- [`ACCEPT a bio at exactly the 500-character boundary`](src/features/onboarding/schemas.test.ts:194)
- [`ACCEPT an empty-string bio`](src/features/onboarding/schemas.test.ts:205)
- [`reject an array payload`](src/features/onboarding/schemas.test.ts:224)
- [`reject unknown extra keys stripping`](src/features/onboarding/schemas.test.ts:230)
- [`Type inference sanity (CompleteOnboardingInput)`](src/features/onboarding/schemas.test.ts:251)

### 2.8 `src/features/onboarding/services.ts` — `completeOnboarding`

**Gaps found:** No atomic-rollback test; no `dateOfBirth` ISO→`Date` conversion assertion.
**Tests added (`services.test.ts`):**

- [`rolls back the whole transaction when WorkspaceMember.create rejects (atomicity contract)`](src/features/onboarding/services.test.ts:266) — ordering spy `["profile", "workspace"]`, rejection propagates, `WorkspaceMember.create` never invoked when earlier stage rejects.
- [`converts the ISO-8601 dateOfBirth string to a Date instance when persisting the Profile`](src/features/onboarding/services.test.ts:329) — asserts `instanceof Date`, `toISOString()` equality, and that `userId` is propagated from the caller (not leaked from the payload).

### 2.9 `src/app/api/v1/onboarding/complete/route.ts` — `POST`

**Gaps found:** Only happy path + generic error path were tested. No unauthorized short-circuit, no validation-failure no-downstream-call, no response-shape whitelist, no sanitize-input contract.
**Tests added (`route.test.ts` → second describe block):**

- [`returns the withSession failure response verbatim on an unauthorized request and never touches downstream stages`](src/app/api/v1/onboarding/complete/route.test.ts:201)
- [`does NOT invoke sanitizeObject or completeOnboarding when validation fails`](src/app/api/v1/onboarding/complete/route.test.ts:224)
- [`exposes only a whitelisted subset of profile/workspace fields on success (no internal ids/timestamps leak)`](src/app/api/v1/onboarding/complete/route.test.ts:251) — spot-checks absence of `userId`, `phoneNumber`, `company`, `dateOfBirth`, `ownerId`, `createdAt`.
- [`forwards the validated payload (NOT the raw request) to sanitizeObject`](src/app/api/v1/onboarding/complete/route.test.ts:325)

### 2.10 React components

- `theme-toggle.test.tsx`: well-covered (initial dark/light mount, click toggling, persistence).
- `oauth-buttons.test.tsx`: render + click behaviour covered. **Remaining minor gap:** no test for `signIn.social` resolving to `{ error }` and triggering `toast.warning` (audit-only, not implemented — would require `sonner` mocking; covered by stubbed-rejection test instead).
- `onboarding-form.test.tsx`: render + checkbox-enable covered. **Remaining minor gap:** no submit success/network-error/redirect paths. Audit recommends extending with `fetch` mocking when the form's submit path stabilises.
- `onboarding-guard-wrapper.test.tsx`: redirect + render + DB-error paths covered (6 tests).
- Layouts `(auth)`, `(marketing)`: well-covered (render, brand, footer legal links, no cross-layout leakage, metadata `robots`).

---

## 3. Mocking Discipline

All external dependencies are mocked at the module boundary per AGENT_RULES §4:

- **Prisma** (`@/lib/db`): mocked via `vi.mock` returning per-test-controlled `mockTransaction`/`mockProfileCreate`/`mockWorkspaceCreate`/`mockWorkspaceMemberCreate`.
- **Better Auth** (`@/lib/auth`, `@/lib/auth-client`): the real `signInCallback` is unit-tested directly; `auth.test.ts` only verifies structural surface (handler, GET/POST exports) without booting Better Auth.
- **API envelope** (`@/lib/api/envelope`): mocked factory functions returning plain objects to assert call args.
- **DOMPurify** (`isomorphic-dompurify`): the _real_ sanitizer is exercised in `sanitize.test.ts` against jsdom — no mock, so XSS contract is genuinely verified.
- **`next/navigation`**: `redirect` mocked to throw (matching production semantics) so the guard can assert the throw propagated.

No test reads/writes a real DB, makes a real OAuth call, or hits a real network.

---

## 4. Final Verification

```
npm run lint        →  0 errors, 5 warnings (all pre-existing, in non-test source files)
npx tsc --noEmit    →  clean
npm run test:run    →  Test Files 26 passed (26)  |  Tests 249 passed (249)
```

The 5 remaining lint warnings are intentional/unchanged source-file patterns (unused catch-bound `error` variables, a test-only unused `redirect` import) and do not affect test correctness.

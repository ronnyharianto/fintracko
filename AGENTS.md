# Fintracko Agent Rules

These rules apply to every AI agent that reads, reviews, modifies, or validates
this repository. The goal is predictable, production-quality work in a
financial application: clear ownership, narrow changes, explicit contracts,
and evidence from validation.

## 1. Operating Standard

- Read the relevant code before proposing or editing anything.
- Start from the most concrete anchor available: a failing command, bug,
  route, component, service, schema, or symbol.
- Before the first edit, identify one local hypothesis about the behavior and
  one cheap check that could disprove it.
- Follow the existing ownership boundary. If a file only wires or forwards,
  step to the nearest function that actually decides or mutates behavior.
- Prefer the smallest reversible change that fixes the root cause. Do not
  combine unrelated cleanup, formatting, dependency upgrades, or redesigns.
- After the first substantive edit, run the narrowest available executable
  validation before reading broadly or starting another edit.
- If validation fails, repair the same slice and rerun the same check before
  expanding scope.
- Do not claim a change is complete without stating what was validated and
  what could not be validated.

## 2. Repository Conventions

- Source code, names, comments, documentation, API contracts, and user-facing
  text must be written in English.
- Use TypeScript strict mode and the `@/*` alias for imports within `src`.
  Avoid deep relative imports across feature boundaries.
- Preserve the repository's existing formatting and quote style in the file
  being changed. Do not reformat unrelated code.
- Use ASCII by default in source and documentation. Use Unicode only when the
  surrounding file already uses it or the product text clearly requires it.
- Do not add comments that merely narrate obvious code. Add a short comment
  only when it explains a non-obvious constraint, security decision, or
  control-flow tradeoff.

## 3. Technology and Architecture

- Use Next.js 16 App Router and React 19. Server Components are the default.
  Use Client Components only for interaction, browser APIs, client state, or
  event handlers.
- Keep layouts and route pages thin. Put reusable business rules, schemas,
  services, domain errors, and domain types under `src/features/<domain>/`.
- Route Handlers under `src/app/api/v1/` are transport adapters. They should
  authenticate, validate, invoke a feature service, map expected errors, and
  return the standard envelope. They must not own domain rules.
- Use the shared API pipeline in `src/lib/api/pipeline.ts` for API handlers:
  session, optional onboarding guard, validation, and sanitization.
- Use the response builders in `src/lib/api/envelope.ts`. Never invent a
  second response-envelope format.
- Use Prisma through the singleton in `src/lib/db.ts`. Do not edit generated
  Prisma output by hand. Avoid raw SQL; if it is explicitly necessary, use
  parameterized Prisma raw queries.
- Use functional modules and plain functions by default. Use a class when it
  represents a real domain concept or stable error contract, as with
  `WorkspaceServiceError`; do not introduce classes merely to make code look
  object-oriented.
- Reuse an existing helper or abstraction when it owns the same behavior.
  Create a new abstraction only when it removes meaningful duplication,
  clarifies a boundary, or provides a required test seam.

## 4. Data and Security Rules

- The Prisma schema at `prisma/schema.prisma` is the source of truth for the
  data model. Check it before adding or renaming fields.
- Validate all untrusted input with Zod v4. Domain schemas belong in the
  feature schema module, not inside route handlers or UI components.
- API request bodies must pass through the shared `validateBody()` and
  `sanitizeObject()` pipeline before business logic or database writes.
- Never use `dangerouslySetInnerHTML`, unsanitized dynamic URLs, or ad hoc
  HTML injection. React text rendering is the safe default.
- Every workspace-scoped read or mutation must enforce membership using both
  `workspaceId` and authenticated `userId`. Owner-only operations must also
  enforce `role: "OWNER"`. Treat every resource identifier as attacker-
  controlled; prevent IDOR by construction.
- Mutations affecting multiple rows or models must use a Prisma transaction.
  Keep related writes atomic, especially onboarding, workspace creation, and
  financial balance updates.
- Never hardcode secrets, credentials, tokens, or production origins. Read
  required configuration through the existing environment helpers and keep
  real values out of `.env.example` and source control.
- Never log session tokens, passwords, credentials, financial secrets, or raw
  provider/database errors. Return safe generic API errors to clients.
- Preserve OAuth-only authentication. Do not add password or credential flows
  unless the product requirements and authentication configuration explicitly
  change.

## 5. Error and Contract Design

- Use discriminated results or typed domain errors instead of matching error
  message strings. Catch `unknown`, not `any`.
- Expected domain failures must map to explicit API error codes and standard
  HTTP statuses through the envelope helpers.
- Unexpected exceptions must fall through to a safe generic server error;
  never expose stack traces, ORM messages, or provider internals.
- Keep public contracts stable. When changing a schema, API response, or
  database field, inspect all callers and update documentation or migrations
  when required.
- Do not silently fake persistence or success. A control that is unavailable
  in the current MVP must be disabled, clearly marked as unavailable, or
  removed rather than pretending to work.

## 6. Frontend Rules

- Match the existing Fintracko design tokens and component patterns in
  `src/components/ui/`. Prefer shared UI primitives over duplicate markup.
- Keep user-facing workflows complete: loading, empty, success, failure, and
  disabled states must behave honestly.
- Use `apiFetch()` for browser calls to Fintracko API routes so envelope
  parsing and client errors remain consistent.
- Keep browser-only auth in `src/lib/auth-client.ts` and shared client session
  state in the existing session provider. Never import server Prisma/auth
  modules into Client Components.
- Use stable dimensions and responsive layouts. Do not let dynamic labels,
  errors, or loading states cause controls to jump or overlap.
- Use icons from the existing icon library inside icon-capable controls and
  provide accessible labels for unfamiliar icon-only controls.
- Avoid adding a new client dependency when an existing local helper or
  installed package solves the problem.
- Use `withToast()` from `@/lib/toast` for async actions that show success/
  error toast notifications. It eliminates the repeated try/catch +
  toast.success/toast.error pattern. Do not use it when the action also
  manages loading state or has side effects beyond the toast (e.g. closing
  a dialog, resetting a form) — in those cases the explicit try/catch is
  clearer.

## 7. Validation Gates

Run the narrowest relevant check first, then broaden when the change warrants
it. For normal TypeScript or application changes, use:

```bash
npx tsc --noEmit
npm run lint
```

For route, database, build, or cross-module changes, also run:

```bash
npm run build
```

Additional requirements:

- Run a focused lint command for a narrow change when possible.
- Check the actual route flow for redirects, authentication, loading, and
  error behavior when the change affects a user-facing workflow.
- Do not weaken lint rules, TypeScript settings, validation, or security
  checks just to make a change pass.
- If a command cannot run because of missing environment variables, services,
  or tools, report the exact blocker and run every independent check that is
  still available.
- This repository may not contain automated tests for every feature. Static
  typechecking, linting, build output, and focused manual flow checks are still
  required evidence; do not imply tests exist when they do not.

## 8. Git and Worktree Discipline

- Inspect `git status` before editing or committing.
- Never discard, revert, or overwrite changes you did not make. Work with them
  unless they make the requested change impossible.
- Do not use destructive commands such as `git reset --hard` or
  `git checkout --` unless the user explicitly requests that exact operation.
- Do not commit, create branches, amend history, or force-push unless the user
  explicitly asks.
- Keep commits focused and describe the behavior or capability changed.
- Before committing, review the staged scope and ensure unrelated files are
  not included. After committing, verify the worktree and report the commit.

## 9. Communication and Completion

- Keep progress updates short and concrete: what was learned, what changed,
  and what validation is next.
- Ask a clarifying question only when an ambiguity changes the implementation
  or could cause data loss. Otherwise make the safest local assumption and
  state it.
- In reviews, list bugs, regressions, risks, and missing tests first, ordered
  by severity. Put summaries and positive observations after findings.
- Final responses must include the files or behavior changed, validation
  results, and any remaining risk or blocker. Do not hide failed checks.

## 10. Definition of Done

A change is complete only when:

1. The owning code path and relevant callers were checked.
2. The implementation is scoped to the request and follows existing
   architecture.
3. Input, authorization, tenant isolation, and error behavior are covered.
4. Relevant loading, empty, success, and failure states are honest.
5. The narrowest executable validation passes, followed by broader checks when
   appropriate.
6. Documentation or migrations are updated when the contract changed.
7. The final response clearly reports the outcome and remaining limitations.

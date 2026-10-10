# Feature Proposal - Frictionless Transaction Input (Voice-First + Alternatives)

- **Status:** Proposal (not implemented, not approved)
- **Date:** 2026-10-10
- **Author:** Product (drafted with AI assistance)
- **Related docs:** [PRD_MVP1.md](./PRD_MVP1.md) (Phase 3.4 Transaction Management)
- **Scope of this document:** Reduce the effort required to record a transaction.
  It proposes a voice/speech capture path as the flagship feature and lists
  lower-cost alternatives that share the same foundations.

---

## 1. Problem

Recording a transaction currently means opening a dialog and setting every field
by hand: type, amount, date, category, sub-category, account, and optional
payee/notes/tags/receipt. The form lives in
[create-transaction-dialog.tsx](../../src/components/shared/transactions/create-transaction-dialog.tsx),
and the underlying form contract is `TransactionFormData` in
[types.ts](../../src/features/transactions/types.ts).

For the people who track spending daily, this is the highest-frequency,
highest-friction action in the product. The core hypothesis:

> If a user can record a transaction in a single spoken sentence (or a single
> tap on a smart shortcut), they will record more transactions, more
> consistently, and the ledger becomes trustworthy enough to drive budgets and
> analytics.

Because a financial ledger is only as useful as it is complete, input friction
is not a convenience problem - it is a data-quality problem. This proposal is
therefore about capture speed first, and clever UI second.

### Success criteria (proposed)

| Metric                                   | Baseline        | Target                                   |
| ---------------------------------------- | --------------- | ---------------------------------------- |
| Median time to record one transaction    | Manual form     | Voice path meaningfully faster than form |
| Successful voice capture -> saved rate   | n/a             | >= 70% of confirmed drafts saved         |
| Transactions with a category/subcategory | Current product | Not lower than the manual form           |
| Correction/abandon rate on voice draft   | n/a             | < 30% of drafts edited or discarded      |

Exact numbers are placeholders; they must be set against real usage analytics
(see Section 7) before the feature is scoped into a release.

---

## 2. Goals and non-goals

**Goals**

- Capture a complete or near-complete transaction from a single spoken phrase.
- Never write to the database from a raw, unconfirmed interpretation. Voice
  produces a **draft**, which the user reviews and confirms - the same mental
  model as autocorrect, not autopilot.
- Reuse the existing transaction service, schemas, and authorization path so the
  feature adds a capture front door, not a second source of truth.
- Degrade honestly: if the browser, microphone, or network cannot support
  capture, the manual form remains available and unchanged.

**Non-goals (this proposal)**

- Fully autonomous, no-confirmation ledger writes.
- Multi-utterance conversational bookkeeping ("and last month I also...").
- Natural-language queries ("how much did I spend on coffee?") - a separate
  feature that shares the parser but not the capture UX.
- Replacing the manual form. The form stays the source of truth and the fallback.
- Storing raw audio server-side by default (see Section 6).

---

## 3. Proposed feature - Voice transaction capture

### 3.1 User flow (primary)

1. On the transactions screen, the user taps a **microphone** action (near the
   existing "new transaction" control).
2. A recording sheet opens. The user speaks one sentence, for example:
   _"Spent 25 dollars on lunch at Subway yesterday from my checking account."_
3. Live transcription appears as text while speaking (when the engine supports
   interim results). The user stops, or the engine auto-stops on silence.
4. The app parses the transcript into a **draft** and shows a review card:
   - Type: Expense
   - Amount: 25.00 USD
   - Date: yesterday (resolved to a concrete date)
   - Category / Sub-category: Food / Restaurants (with alternatives if unsure)
   - Account: Checking
   - Payee: Subway
   - Note: lunch
     Matching values are highlighted; anything the parser could not resolve is
     shown as an **empty, required field** rather than a guess.
5. The user can edit any field inline (reusing the existing field components),
   then taps **Save** to call the existing create-transaction endpoint, or
   **Discard** to throw the draft away.
6. On success, the same list refresh / toast behavior as the manual form applies.

### 3.2 Why a draft-and-confirm step is mandatory

Financial writes must be exact (AGENTS.md Section 4). Speech recognition and
slot-filling are probabilistic; silently committing a misheard amount or the
wrong account would corrupt balances and budgets. The confirmation step is the
control that keeps the feature honest. It also doubles as the correction UI,
which is how the system improves without a training loop.

### 3.3 Parsing contract

The transcript maps to the existing `TransactionFormData` shape. The parser is a
new pure function in the transactions feature, e.g.
`parseTransactionUtterance(text, context) -> ParsedTransactionDraft`, where
`context` supplies workspace currency, categories, sub-categories, accounts, and
a reference "today" in the user's timezone.

| Utterance fragment             | Target field               | Notes                                                 |
| ------------------------------ | -------------------------- | ----------------------------------------------------- |
| "spent / paid / bought"        | `type = EXPENSE`           | Verb drives type                                      |
| "got paid / received / salary" | `type = INCOME`            |                                                       |
| "transferred / moved to"       | `type = TRANSFER`          | Requires two accounts                                 |
| "25 dollars", "IDR 50k"        | `amount`                   | Currency words; must respect workspace currency       |
| "yesterday", "last Friday"     | `date`                     | Relative dates resolved against user-timezone "today" |
| "on lunch", "for groceries"    | category/subcategory hints | Fuzzy match against the workspace's active categories |
| "from my checking account"     | `sourceAccountId`          | Account for expense/transfer                          |
| "to savings"                   | `destinationAccountId`     | Account for income/transfer                           |
| "at Subway"                    | `payeePayer`               | Third-party entity                                    |
| leftover text                  | `description`              | Free notes                                            |

**Parsing rules (proposed):**

- Only ever select from records that exist and are not archived in the active
  workspace. Never invent a category, account, or sub-category.
- Amount parsing must produce an exact decimal **string** (matching the existing
  transaction amount convention), never a binary float.
- Ambiguity is surfaced, not resolved silently. If two accounts match "checking",
  the review card shows a required choice.
- Every field the parser sets is user-editable before save. Nothing is persisted
  until Save.
- The parser must be deterministic and unit-testable, independent of the speech
  engine, so that typed natural-language input (Section 5.7) can reuse it.

### 3.4 Speech recognition approach

**Recommended for the MVP: the browser-native Web Speech API
(`SpeechRecognition` / `webkitSpeechRecognition`).**

Rationale:

- Zero cost, no audio leaves the browser for the default implementation, and no
  third-party account or key is required to ship a first version.
- Fast to prototype behind a feature flag; the parser and review UI - the real
  work - are engine-agnostic.
- No new client dependency is required, consistent with the repository guidance
  in AGENTS.md Section 6.

Known limitations to accept for the MVP and communicate honestly in the UI:

- Browser support is uneven (historically Chromium-strong, weaker in Firefox).
  Unsupported browsers must show the manual form, not a broken button.
- Accuracy varies with accent, background noise, and domain vocabulary. This is
  expected; the confirmation step absorbs it.
- Some implementations send audio to the browser vendor's servers. This must be
  stated in the recording sheet copy so consent is informed.

No speech-to-text provider is currently offered in the Freebuff service index
(checked 2026-10-10), so no external STT vendor should be wired in without a
separate evaluation. If the MVP proves valuable and browser accuracy is the
bottleneck, a **server-side transcription path** becomes the follow-up: record a
short clip, send it to a cloud STT provider selected and vetted at that time, and
return only the transcript. That path is explicitly out of scope here because it
adds cost, a new provider, audio-handling privacy obligations, and a new failure
mode.

### 3.5 Where the code would live

Following the existing architecture (AGENTS.md Section 3):

- `src/features/transactions/` - utterance parser, draft type, and any
  voice-specific schemas (pure, client-safe, unit-testable).
- A capture component under `src/components/shared/transactions/` - the
  recording sheet and review card; a Client Component because it uses browser
  microphone APIs and event handlers.
- The existing `POST /api/v1/workspaces/[workspaceId]/transactions` route is
  reused unchanged. Voice must not introduce a parallel write path. If the parser
  later needs a server round-trip, it goes through the shared pipeline
  (`withSession`, `validateBody`, `sanitizeObject`) like every other handler.

No Prisma schema change is required for the MVP: a captured transaction is an
ordinary transaction once confirmed. If we later want to store the original
transcript for debugging or quality measurement, that is an additive,
opt-in field and a separate migration.

### 3.6 States that must behave honestly

- **Unsupported browser / no microphone permission:** the mic control is hidden
  or disabled with an explanation; the manual form is one tap away.
- **Permission denied:** clear message, link to how to re-enable, no dead loop.
- **Nothing heard / low confidence:** show the raw transcript as editable text
  and let the user type or retry, rather than failing silently.
- **Offline:** voice capture is unavailable; manual form still works.
- **Partial parse:** unmatched required fields are empty and flagged, never
  defaulted to a plausible-but-wrong value.
- **Save failure:** the draft is preserved in the sheet so the user does not lose
  the input.

### 3.7 Privacy and security

- Do not persist raw audio by default. If a server transcription path is added
  later, it must be authenticated, workspace-scoped, size- and duration-limited,
  and must never log audio or transcripts to shared logs.
- Transcripts are untrusted input. They are parsed, then the resulting values
  pass through the same validation and sanitization as any other write
  (Zod v4 + `sanitizeObject`), and workspace membership is enforced exactly as
  the manual path does.
- The active workspace and currency always come from server-side session context,
  never from the transcript.

### 3.8 Accessibility and internationalization

- Provide a keyboard-accessible alternative: a "type it instead" natural-language
  field that runs the same parser (Section 5.7). Voice is an accelerator, never
  the only path.
- Provide clear live-region announcements for recording state, transcript
  updates, and parse results.
- Currency and date parsing are locale-sensitive; the parser must use the
  workspace currency and the user's timezone rather than assuming USD/en-US.

---

## 4. Suggested build order for the voice feature

1. **Parser + typed NL field first.** Ship the natural-language parser behind a
   text input. It is the hard part, it is fully testable without a microphone,
   and it delivers value on its own.
2. **Voice capture on top.** Wrap the proven parser with the Web Speech API and
   the review card. Gate it behind a flag while browser support is uneven.
3. **Measure.** Only after real usage should the team decide whether cloud STT
   accuracy is worth the cost and privacy trade-off.

This ordering de-risks the work: if voice recognition proves unreliable, the
parser still improves the form and unlocks other features.

---

## 5. Alternative and complementary ways to speed up input

Voice is the headline idea, but it is the most expensive and least predictable
path. The following are ranked roughly by value-per-effort and each shares
foundations with the others.

### 5.1 Smart defaults from context (cheap, high value)

Prefill what can be inferred: today's date (already done), the account the user is
viewing (already done via `defaultAccountId`), and the category/sub-category most
recently used for the current type/account. Most transactions are repeats; the
form should start closer to the answer.

### 5.2 Quick-add templates / favorites

Let users pin a handful of common transactions ("Coffee 4.50 - Food/Restaurants",
"Salary - Income") as one-tap chips. This is the highest-value/lowest-effort
capture speedup and needs no AI. It also gives the voice feature a template-like
fallback when speech is noisy.

### 5.3 Keyboard-first quick entry

A single-line composer and keyboard shortcuts (type amount, Tab through fields,
Enter to save) turn recurring entry into muscle memory for power users. This also
makes the typed natural-language field from 5.7 a natural extension.

### 5.4 Receipt photo capture (reuses the existing upload path)

The product already uploads receipt images via the Imgur-backed upload route.
A later phase could run OCR/extraction over the image to propose amount, date,
and merchant as a draft - the same draft-and-confirm model as voice. This pairs
naturally with a mobile-first capture flow.

### 5.5 Recurring transactions

Rent, subscriptions, and salary do not need to be re-entered at all. Scheduled
recurring transactions remove the highest-frequency, lowest-variance entries from
manual input entirely, reducing the volume the input features must handle.

### 5.6 Bulk import (CSV / bank export)

For onboarding and for users migrating from spreadsheets or bank exports, a CSV
importer with a mapping review step populates history in one action. This is a
different problem (backfill, not daily capture) but materially improves ledger
completeness, which is the ultimate goal of this proposal.

### 5.7 Typed natural language (the parser without the microphone)

A single text field - "25 lunch yesterday checking" - parsed into the same draft.
This delivers most of the speed benefit of voice, works on every browser and in
quiet environments, requires no microphone permission, and is the recommended
first deliverable because it shares the parser with voice.

### 5.8 Mobile share-target / OS quick capture

On mobile, accept shares from other apps (or a home-screen shortcut / widget) that
open the quick composer with sensible defaults. This meets users where the receipt
or notification already is, instead of making them navigate into the app.

---

## 6. Open questions

1. What is the real median time-to-record and abandon rate for the current manual
   form? The success criteria above cannot be finalized without it.
2. Does the product's audience skew mobile? Voice and share-target capture are
   disproportionately valuable on mobile.
3. Is there appetite for any server-side audio processing at all, given the
   privacy and cost implications? This gates the cloud-STT follow-up.
4. Should transcripts be stored (opt-in) to measure parser quality and drive
   improvements, or discarded immediately after confirmation?
5. Which parser is preferred - a deterministic rule/keyword parser (predictable,
   testable, no new dependency) or a hosted LLM call (more flexible, adds cost,
   latency, and a data-sharing surface)? The MVP recommendation is the
   deterministic parser; an LLM can be layered behind the same contract later.

---

## 7. Instrumentation needed before/at launch

- Time from opening the capture sheet to a saved transaction.
- Voice sessions started vs. drafts produced vs. drafts saved vs. drafts edited.
- Which parsed fields were most often corrected (drives parser improvements).
- Capture path mix: manual vs. typed NL vs. voice vs. template.

These events should be added behind the existing analytics surface and must never
include raw transcripts, amounts, account names, or other financial detail.

---

## 8. Summary recommendation

Start with the **typed natural-language parser and a fast composer**, because it
is low-risk and useful immediately. Add **voice capture** as a thin layer over the
same parser once the parser is proven, gated behind a feature flag and always with
explicit confirmation before saving. Add **quick-add templates** and **smart
defaults** in parallel as cheap wins. Treat **receipt OCR**, **recurring
transactions**, **bulk import**, and a **cloud STT provider** as clearly-scoped
follow-ups that each require their own proposal.

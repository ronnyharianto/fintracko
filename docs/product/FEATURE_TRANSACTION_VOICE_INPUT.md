# Feature Proposal - Frictionless Transaction Input (Voice-First + Alternatives)

- **Status:** Partially implemented: typed natural-language quick composer and the Indonesian/code-switched parser (build order step 1). Voice capture, review card, and instrumentation are not implemented.
- **Date:** 2026-10-10 (revised 2026-10-18: Indonesian id-ID requirements added, see Section 3.9)
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
| "beli / belanja / bayar / jajan" | `type = EXPENSE`           | Indonesian verb lexicon, matched alongside English (3.9.2) |
| "gajian / dapat / terima / jualan" | `type = INCOME`          | Indonesian verb lexicon (3.9.2)                       |
| "top up GoPay dari BCA"        | `type = TRANSFER`          | Top-up between own accounts is a move, not spend (3.9.6) |
| "15rb", "2,5jt", "lima belas ribu" | `amount`               | Magnitude suffixes, decimal commas, currency omitted (3.9.3) |
| "kemarin / minggu lalu / tanggal 5" | `date`                | Indonesian relative-date tokens (3.9.4)               |
| "pakai BCA 7625"               | `sourceAccountId`          | Alias match, then digit-run suffix in the name (3.9.5) |
| "kopi / bensin / listrik"      | category/subcategory hints | Alias dictionary, then user history (3.9.7)           |

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
  The Indonesian requirements in Section 3.9 are part of the MVP scope.

### 3.9 Indonesian locale requirements (id-ID, part of MVP scope)

The product targets Indonesian users. Everything in this section is treated as
MVP scope for the parser, not as a later localization pass.

#### 3.9.1 Speech recognition

- Modern Chrome supports `id-ID` recognition, including on-device recognition
  in recent versions. Firefox and Safari remain weak or absent; the fallback
  design in Section 3.6 is unchanged.
- The recording sheet exposes an explicit language toggle (`id-ID` default,
  `en-US` optional) instead of guessing. Chrome's recognizer degrades when
  Indonesian speakers drift toward English pronunciation, so the toggle is
  per-tap, not buried in settings.
- Consent and state copy must be presented in the product's UI language -- for
  example: "Audio dikirim ke server untuk dikonversi menjadi teks" -- so that
  consent for network-assisted recognition is informed.
- Recognition uploads audio on metered mobile connections. The typed
  natural-language path (5.7) avoids this entirely, which reinforces the
  build order for Indonesian users: typed input first, voice second.

#### 3.9.2 Bilingual verb and preposition lexicon

Real Indonesian utterances mix English and Indonesian mid-sentence ("spent
25k buat jajan di warkop kemarin pakai gopay"). The parser therefore matches
both lexicons simultaneously on every utterance; no language setting gates
parsing. Representative entries (non-exhaustive, maintained in the feature
module):

| Fragment                                                    | Field                  | Notes                                    |
| ----------------------------------------------------------- | ---------------------- | ---------------------------------------- |
| "beli", "belanja", "bayar", "jajan", "keluar", "spent"        | `type = EXPENSE`        |                                          |
| "gajian", "dapat", "terima", "masuk", "dibayar", "jualan", "penjualan", "bonus" | `type = INCOME`      |                                          |
| "pindah", "pindahkan", "transfer"                            | `type = TRANSFER`       | Requires two own accounts                |
| "pakai", "dari", "via", "make"                               | `sourceAccountId`       | Account for expense/transfer             |
| "ke"                                                         | `destinationAccountId`  | Account for income/transfer              |
| "di <merchant>", "gofood", "grabfood", "shopee", "tokopedia", "warung", "warkop" | `payeePayer`         | Replaces the English "at" pattern        |

#### 3.9.3 Amounts: magnitude suffixes, decimal commas, no currency word

- Magnitude suffixes are the workhorse: "ribu"/"rb"/"k" = x1000 and
  "juta"/"jt" = x1,000,000. Spoken multipliers and written suffixes
  ("15rb", "15k", "2,5jt", "dua belas ribu") normalize identically.
- The decimal point is a comma: "2,5jt" and spoken "dua koma lima juta" are
  2,500,000. Within a phrase, the multipliers scale the whole number, so
  "dua koma lima ribu" is 2,500. Rare ambiguous readings surface on the
  review card instead of being guessed.
- Currency words are usually omitted ("beli kopi 15rb") and must never be
  required. Workspace currency comes from session context (3.7).
- Number words and numerals normalize identically, because recognizer
  output varies ("lima belas ribu" / "15 ribu" / "15.000").
- The output is always an exact decimal string (e.g. "15000"), never a
  binary float, per the existing amount convention.

#### 3.9.4 Dates

Recognized tokens: "kemarin", "semalam", "tadi malam/pagi/siang", "minggu
lalu", "bulan lalu", "awal bulan", "akhir bulan", and day-of-month reference
"tanggal N". Month names are matched case-insensitively through the intl
locale ("id"), resolved against "today" in the user's timezone.

#### 3.9.5 Accounts and digit-suffix resolution

Account aliases, case-insensitive and tolerant of colloquial forms: e-wallets
"gopay", "ovo", "dana", "linkaja", "shopeepay", "jenius"; banks "bca",
"mandiri", "bri", "bni", "bsi"; cash "tunai", "cash", "dompet".

`FinancialAccount` currently stores only a name (no account-number field),
so a spoken card/wallet suffix can be matched only against digits embedded
in account names. Users who name accounts "BCA 7625" get exact resolution;
onboarding copy should recommend this naming convention.

Rules:

- The matched alias narrows the candidate set to accounts whose name
  contains it. The spoken digit cluster is only ever an additional filter on
  that candidate set; it must never become a new matching key on its own.
- Split candidate names into digit runs. A spoken digit cluster matches a
  run when it equals the run or is a trailing suffix of the run (card last-4
  against a full number). Raw substring matching across run boundaries is
  forbidden: "625" must not match "7625", and "0125" must not match "76250".
- Ordering rule: number clusters before the account preposition are amount
  candidates; after an account match, digit clusters with no magnitude word
  following are suffix candidates. This keeps "15rb" and "7625" from
  colliding even though both come from the same number-word vocabulary.
- Ambiguity resolution: one workspace account matches -> the suffix confirms
  it, or is safely ignored as noise; multiple accounts match the suffix ->
  auto-select and display why; the suffix matches none -> a required choice
  among that alias's accounts, with the fragment left visible in the sheet,
  never defaulted to the first match.

Worked example -- utterance: "Beli kopi lima belas ribu pakai bca tujuh
enam dua lima"

1. "Beli" -> `type = EXPENSE`.
2. "kopi" -> subcategory candidates via dictionary/history (3.9.7).
3. "lima belas ribu" -> amount "15000" (currency word omitted).
4. "pakai" -> account preposition; "bca" narrows candidates to BCA-named
   accounts.
5. "tujuh enam dua lima" -> digit cluster "7625"; it follows an account
   match with no magnitude word behind it, so it is a suffix, not an
   amount, and resolves the account whose name contains a "7625" run.

Resulting review card: Expense, 15000, today, resolved account, description
"kopi", subcategory as the ranked choice, payee empty.

#### 3.9.6 Top-up semantics

- "top up GoPay 100rb" (source implied to be another own account) and
  "isi gopay dari BCA" are moves between own accounts and map to
  `TRANSFER`, with the matched wallet as `destinationAccountId` and the
  bank as `sourceAccountId`.
- "beli pulsa", "paket data", and "token listrik" are third-party purchases
  (expense), because the counterpart is a telco/utility provider, not an
  own account.
- When intent cannot be determined -- e.g. "top up" with no resolvable
  destination account -- the review card surfaces a required choice. It
  must not default to either reading.

#### 3.9.7 Mapping unstructured tokens to categories

Every workspace is created with English-named template taxonomies (Food ->
Proteins, Dairy & Beverages, Grains & Bakery, Snacks; Housing & Utilities ->
Electricity & Water, Internet & Phone), so Indonesian tokens like "kopi"
match nothing textually: fuzzy matching against workspace names alone
cannot map them. Mapping therefore uses a three-layer fallback,
deterministic first:

1. **Bilingual alias dictionary (primary).** A static, client-safe keyword
   table in `src/features/transactions/` maps common Indonesian items to
   ranked template targets: "kopi / ngopi / warkop" -> Food / Dairy &
   Beverages, then Snacks and Hangout; "bensin / pertalite / pertamax / pom"
   -> Fuel; "listrik / token" -> Electricity & Water; "pulsa / paket data"
   -> Internet & Phone; "gofood / jajan" -> Food. An alias maps to a
   meaning, and the meaning is fuzzy-matched against the workspace's live
   category/SubCategory names, so it also works when users rename
   categories into Indonesian.
2. **History recency.** Before the dictionary, inspect the user's own
   recently saved transactions whose description contains the token and
   reuse their mapping. This is near-perfect for that user, adapts to any
   custom taxonomy automatically, and costs one indexed query.
3. **Never guess.** When the layers disagree or the token is unknown, the
   field is a required choice and the dictionary's ranked alternatives are
   shown as one-tap chips. Corrections are instrumented (Section 7) to grow
   the dictionary.

LLM mapping is not in the MVP: it adds latency, cost, non-determinism, and
a data-sharing surface for financial descriptions. If later needed, it
can be added behind the same `parseTransactionUtterance(text, context)`
signature as an opt-in fallback consulted only for tokens the deterministic
layers could not resolve, returning ranked candidates for confirmation.

Known product gap, flagged for a separate proposal: templates are
English-named while Indonesian users will organize in Indonesian
("Makanan", "Transportasi", "Jajan"). The dictionary bridges capture, but
localized workspace templates would make organization natively Indonesian
(see the follow-up list in Section 8).

---

## 4. Suggested build order for the voice feature

1. **Parser + typed NL field first.** Ship the natural-language parser behind a
   text input. It is the hard part, it is fully testable without a microphone,
   and it delivers value on its own. The parser ships Indonesian-first: the
   bilingual lexicon, magnitude-suffix amounts, decimal commas,
   digit-suffix account matching, and layered category mapping from Section
   3.9 are in scope from day one, because retrofitting a locale after the
   parser is stable is a known failure mode.
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
6. Should workspace templates be created with Indonesian-localized category
   names instead of the current English ones? The alias dictionary (3.9.7)
   bridges capture, but localized templates would make organization natively
   Indonesian. Separate proposal.
7. Should an optional `accountNumberSuffix` field be added to
   `FinancialAccount` for exact card/wallet suffix matching, or is the
   "put the digits in the account name" convention (3.9.5) enough for the
   MVP?

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

Start with the **Indonesian-first typed natural-language parser and a fast
composer** (the Section 3.9 requirements are MVP scope), because it is
low-risk and useful immediately. Add **voice capture** as a thin layer over
the same parser once the parser is proven, gated behind a feature flag and
always with explicit confirmation before saving. Add **quick-add templates**
and **smart defaults** in parallel as cheap wins. Treat **receipt OCR**,
**recurring transactions**, **bulk import**, a **cloud STT provider**,
**Indonesian-localized workspace templates**, and an optional
**`accountNumberSuffix` field on `FinancialAccount`** as clearly-scoped
follow-ups that each require their own proposal.

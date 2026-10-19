/**
 * Natural-language transaction utterance parser.
 *
 * Pure, client-safe, and deterministic: maps a typed (or, later,
 * speech-transcribed) phrase such as "Beli kopi lima belas ribu pakai bca
 * tujuh enam dua lima" onto transaction form fields. Implements the
 * Indonesian locale requirements from docs/product/
 * FEATURE_TRANSACTION_VOICE_INPUT.md Section 3.9:
 *
 * - Bilingual lexicon: English and Indonesian keywords are matched
 *   simultaneously on every utterance, which also covers mid-sentence
 *   code-switching ("spent 25k buat jajan di warkop kemarin pakai gopay").
 * - Amounts: magnitude suffixes (ribu/rb/k = x1000, juta/jt = x1e6), decimal
 *   commas ("2,5jt", spoken "dua koma lima"), thousand-dot grouping
 *   ("15.000"), spoken number words ("dua puluh lima ribu"), and omitted
 *   currency words. Output is an exact decimal string with a dot decimal
 *   separator, matching the CurrencyInput raw-value contract.
 * - Dates: Indonesian and English relative tokens resolved by the caller's
 *   "today".
 * - Accounts: alias matching narrows the candidate set; a spoken digit
 *   cluster after an account mention is a suffix filter matched against
 *   whole digit runs in the account name (equal or trailing-suffix run).
 *   The suffix never becomes a matching key on its own and never widens the
 *   candidate set.
 * - Categories: a bilingual keyword dictionary is matched against the
 *   workspace's live (active) records; personal history ranks first when
 *   supplied through the context. Unsure mappings expose ranked
 *   alternatives instead of guessing.
 *
 * The parser never invents ids: every resolved field references a record
 * supplied through the context, and ambiguous readings are surfaced rather
 * than defaulted (doc 3.9.6).
 */

import type { TransactionType } from "@/features/transactions/types";
import type { CategoryView } from "@/features/categories/types";
import type { AccountView } from "@/features/accounts/types";

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

/** Context the caller supplies from live workspace state. */
export interface UtteranceParserContext {
  /** "Today" in the user's timezone, ISO yyyy-mm-dd. */
  today: string;
  /** Active categories with nested subcategories. */
  categories: CategoryView[];
  /** Active financial accounts of the workspace. */
  accounts: AccountView[];
  /**
   * Optional recent transactions for the history-recency category layer
   * (doc 3.9.7 layer 2). Descriptions are matched as whole tokens.
   */
  recentTransactions?: {
    description: string | null;
    categoryId: string;
    subCategoryId: string;
  }[];
}

/** A ranked alternative subcategory for a field the parser is unsure about. */
export interface SubCategoryAlternative {
  categoryId: string;
  subCategoryId: string;
  /** Subcategory name, for chip rendering. */
  label: string;
  /** 0 = best candidate. */
  rank: number;
}

/**
 * A reading that needs the user to choose; never defaults silently
 * (doc 3.9.6).
 */
export interface ParserAmbiguity {
  kind: "TOP_UP_INTENT";
  explanation: string;
}

export interface ParsedTransactionDraft {
  type?: TransactionType;
  /** Exact decimal string with dot decimal separator, e.g. "15000". */
  amount?: string;
  /** ISO yyyy-mm-dd, absolute in the user's timezone. */
  date?: string;
  categoryId?: string;
  subCategoryId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  payeePayer?: string;
  description?: string;
  /** Ranked subcategory alternatives when the mapping is uncertain. */
  subCategoryAlternatives: SubCategoryAlternative[];
  /** Present when the user must choose between readings. */
  ambiguity?: ParserAmbiguity;
  /** Non-fatal explanation keys for the review UI. */
  notes: string[];
}

// ---------------------------------------------------------------------------
// Tokenization
// ---------------------------------------------------------------------------

interface Token {
  /** Original casing, echoed verbatim into descriptions/payee. */
  raw: string;
  /** Lowercased ASCII-only version used for matching. */
  low: string;
}

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^0-9a-z.,]/g, "")
    .replace(/^[.,]+/, "")
    .replace(/[.,]+$/, "");
}

function tokenize(text: string): Token[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => ({ raw, low: normalizeToken(raw) }))
    .filter((token) => token.low.length > 0);
}

function stem(word: string): string {
  return word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word;
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Hint keyword vs name-word overlap: stems equal, or one is a >=4 prefix. */
function hintMatches(word: string, hint: string): boolean {
  const w = stem(word);
  const h = stem(hint);
  return w === h || (w.length >= 4 && w.startsWith(h)) || (h.length >= 4 && h.startsWith(w));
}

// ---------------------------------------------------------------------------
// Numbers and amounts
// ---------------------------------------------------------------------------

interface NumberValue {
  /** Exact integer digits, no sign, no separators, possibly "0". */
  int: string;
  /** Fractional digits, possibly empty. */
  frac: string;
  /** Power-10 magnitude consumed after the fraction, one of 0/3/6. */
  scale: number;
}

const ID_UNITS: Record<string, number> = {
  nol: 0,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  seratus: 100,
  seribu: 1000,
};

const EN_UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

const HUNDRED_WORDS = new Set(["ratus", "hundred"]);

const ID_SCALES: Record<string, number> = { ribu: 3, juta: 6 };
const EN_SCALES: Record<string, number> = { thousand: 3, million: 6 };

const SCALE_SUFFIXES: Record<string, number> = {
  ribu: 3,
  rb: 3,
  k: 3,
  juta: 6,
  jt: 6,
};

function isScaleWord(low: string): number | null {
  if (low in ID_SCALES) return ID_SCALES[low];
  if (low in EN_SCALES) return EN_SCALES[low];
  return null;
}

interface WordNumberParse {
  value: NumberValue;
  end: number;
  /** True when a magnitude word closed the integer part. */
  hadScale: boolean;
}

/**
 * Parses a spoken number-word phrase starting at tokens[start]:
 * [group] [scale]? ["koma" digit-words] [scale]? where a group is like
 * "dua puluh lima" (25), "lima belas" (15), "dua ratus lima puluh" (250),
 * "seribu" (1000). Suffix multipliers attached to digits ("15rb") are not
 * handled here; see parseNumericLiteral.
 */
function parseWordNumber(tokens: Token[], start: number): WordNumberParse | null {
  const units: Record<string, number> = { ...ID_UNITS, ...EN_UNITS };

  const readTens = (i: number): { n: number; len: number } => {
    const lead = tokens[i];
    if (!lead || units[lead.low] === undefined || isScaleWord(lead.low) !== null) {
      return { n: 0, len: 0 };
    }
    const next = tokens[i + 1];
    if (next && next.low === "puluh") {
      const tailUnit = tokens[i + 2];
      const tailVal = tailUnit && units[tailUnit.low] !== undefined ? units[tailUnit.low] : 0;
      return { n: units[lead.low] * 10 + tailVal, len: tailVal ? 3 : 2 };
    }
    return { n: units[lead.low], len: 1 };
  };

  const readGroup = (i: number): { n: number; len: number } | null => {
    const lead = tokens[i];
    if (!lead) return null;
    // Compact forms standing for a full group.
    if (lead.low === "seratus") {
      const tens = readTens(i + 1);
      return { n: 100 + tens.n, len: 1 + tens.len };
    }
    if (lead.low === "seribu") return { n: 1000, len: 1 };
    if (units[lead.low] === undefined) return null;
    const leadVal = units[lead.low];
    const next = tokens[i + 1];
    if (next && HUNDRED_WORDS.has(next.low)) {
      const tens = readTens(i + 2);
      return { n: leadVal * 100 + tens.n, len: 2 + tens.len };
    }
    if (next && next.low === "puluh") {
      const tailUnit = tokens[i + 2];
      const tailVal = tailUnit && units[tailUnit.low] !== undefined ? units[tailUnit.low] : 0;
      return { n: leadVal * 10 + tailVal, len: tailVal ? 3 : 2 };
    }
    if (next && next.low === "belas" && leadVal >= 1 && leadVal <= 9) {
      return { n: 10 + leadVal, len: 2 };
    }
    return { n: leadVal, len: 1 };
  };

  const group = readGroup(start);
  if (!group || group.n === 0) return null;

  let value = group.n;
  let i = start + group.len;
  let hadScale = false;

  const closeIntScale = tokens[i] ? isScaleWord(tokens[i].low) : null;
  if (closeIntScale !== null) {
    value *= 10 ** closeIntScale;
    hadScale = true;
    i += 1;
  }

  const parsed: NumberValue = { int: String(value), frac: "", scale: 0 };

  // Optional fractional part: "koma lima" / "point five".
  const fracMarker = tokens[i];
  if (fracMarker && (fracMarker.low === "koma" || fracMarker.low === "point")) {
    const fracDigits: string[] = [];
    let f = i + 1;
    while (f < tokens.length && units[tokens[f].low] !== undefined && fracDigits.length < 6) {
      if (isScaleWord(tokens[f].low) !== null) break;
      fracDigits.push(String(units[tokens[f].low]));
      f += 1;
    }
    if (fracDigits.length > 0) {
      parsed.frac = fracDigits.join("");
      i = f;
    }
  }

  // Optional scale word after a decimal phrase: "dua koma lima ribu".
  if (!hadScale && parsed.frac !== "") {
    const tailScale = tokens[i] ? isScaleWord(tokens[i].low) : null;
    if (tailScale !== null) {
      parsed.scale = tailScale;
      hadScale = true;
      i += 1;
    }
  }

  return { value: parsed, end: i, hadScale };
}

/**
 * Parses a numeric literal token: "15", "15rb", "15k", "2,5jt", "15.000",
 * "1.500,75". Returns the exact value components.
 */
function parseNumericLiteral(raw: string): NumberValue | null {
  let rest = raw;
  let scale = 0;
  const suffix = rest.match(/(ribu|juta|rb|k|jt)$/);
  if (suffix) {
    scale = SCALE_SUFFIXES[suffix[0]];
    rest = rest.slice(0, rest.length - suffix[0].length);
  }
  if (!/^[0-9]+(?:[.,][0-9]+)*$/.test(rest)) return null;

  let intPart = rest;
  let fracPart = "";
  const commaIdx = rest.indexOf(",");
  const dotIdx = rest.indexOf(".");

  if (commaIdx !== -1 && dotIdx !== -1) {
    // Mixed form: dots before the comma are grouping ("1.500,75").
    intPart = rest.slice(0, commaIdx).replace(/\./g, "");
    fracPart = rest.slice(commaIdx + 1);
  } else if (commaIdx !== -1) {
    if (/^\d{1,3}(,\d{3})+$/.test(rest)) {
      // English-style grouping ("1,500"); Indonesian users rarely type it.
      intPart = rest.replace(/,/g, "");
    } else {
      // Comma as the decimal point ("2,5").
      intPart = rest.slice(0, commaIdx);
      fracPart = rest.slice(commaIdx + 1);
    }
  } else if (dotIdx !== -1) {
    if (/^\d{1,3}(\.\d{3})+$/.test(rest)) {
      // "15.000" -> thousand grouping, the dominant Indonesian form.
      intPart = rest.replace(/\./g, "");
    } else {
      // "2.5" -> dot decimal.
      intPart = rest.slice(0, dotIdx);
      fracPart = rest.slice(dotIdx + 1);
    }
  }

  if (intPart === "") intPart = "0";
  return { int: intPart, frac: fracPart, scale };
}

/**
 * Renders a NumberValue to the exact dot-decimal string contract. Scale
 * manipulations are string-appends of zeros, so the value stays exact for
 * inputs of any length (no float conversion, no BigInt dependency on the
 * compile target).
 */
function renderAmountValue(value: NumberValue): string | null {
  const digits = value.int + value.frac;
  if (!/^[0-9]+$/.test(digits)) return null;
  const shift = value.scale - value.frac.length;
  if (shift >= 0) {
    return digits.replace(/^0+(?=[0-9])/, "") + "0".repeat(shift);
  }
  const decimals = -shift;
  const padded = digits.padStart(decimals + 1, "0");
  return `${padded.slice(0, padded.length - decimals)}.${padded.slice(padded.length - decimals)}`;
}

interface AmountScan {
  value: NumberValue;
  end: number;
  tokens: Token[];
  /** True when a magnitude word or scale suffix closed the number. */
  scaled: boolean;
  /** True when the literal used dotted thousand grouping ("15.000"). */
  grouped: boolean;
}

/** Per-position amount parser; polices the lone-small-unit guard. */
function parseAmountAt(tokens: Token[], start: number): AmountScan | null {
  const first = tokens[start];
  if (!first) return null;

  if (/^[0-9]/.test(first.low)) {
    const parsed = parseNumericLiteral(first.low);
    if (!parsed) return null;
    const scaled = parsed.scale > 0;
    const grouped = /\d{3}/.test(first.low) && /\./.test(first.low);
    if (parsed.int.length < 3 && parsed.frac === "" && !scaled) {
      // A 1-2 digit bare literal ("17") is too weak an amount signal.
      return null;
    }
    return {
      value: parsed,
      end: start + 1,
      tokens: [first],
      scaled,
      grouped,
    };
  }

  const spoken = parseWordNumber(tokens, start);
  if (!spoken) return null;
  const value = Number(spoken.value.int);
  if (!spoken.hadScale && spoken.value.frac === "" && value < 10 && spoken.end - start === 1) {
    // A bare small unit word ("sembilan" inside "warung sembilan") is not
    // an amount signal; require magnitude context or a multi-word cluster.
    return null;
  }
  return {
    value: spoken.value,
    end: spoken.end,
    tokens: tokens.slice(start, spoken.end),
    scaled: spoken.hadScale,
    grouped: false,
  };
}

// ---------------------------------------------------------------------------
// Lexicons
// ---------------------------------------------------------------------------

const EXPENSE_VERBS = new Set([
  "beli",
  "belanja",
  "bayar",
  "jajan",
  "keluar",
  "spent",
  "bought",
  "paid",
  "buy",
]);

const INCOME_VERBS = new Set([
  "gajian",
  "dapat",
  "terima",
  "masuk",
  "dibayar",
  "jualan",
  "penjualan",
  "bonus",
  "received",
  "salary",
]);

const TRANSFER_VERBS = new Set(["pindah", "pindahkan", "transfer", "move"]);

const SOURCE_PREPOSITIONS = new Set(["pakai", "dari", "via", "from", "make"]);
const DESTINATION_PREPOSITIONS = new Set(["ke", "to"]);
const PAYEE_PREPOSITIONS = new Set(["di", "at", "oleh", "by", "dengan"]);

const ACCOUNT_ALIASES = [
  "gopay",
  "ovo",
  "dana",
  "shopeepay",
  "linkaja",
  "jenius",
  "bca",
  "mandiri",
  "bri",
  "bni",
  "bsi",
  "tunai",
  "cash",
  "dompet",
].sort((a, b) => b.length - a.length);

const MERCHANT_ALIASES: { key: string; payee: string }[] = [
  { key: "gofood", payee: "GoFood" },
  { key: "grabfood", payee: "GrabFood" },
  { key: "shopeefood", payee: "ShopeeFood" },
  { key: "gojek", payee: "Gojek" },
  { key: "grab", payee: "Grab" },
  { key: "shopee", payee: "Shopee" },
  { key: "tokopedia", payee: "Tokopedia" },
  { key: "lazada", payee: "Lazada" },
  { key: "netflix", payee: "Netflix" },
  { key: "spotify", payee: "Spotify" },
  { key: "warung", payee: "Warung" },
  { key: "warkop", payee: "Warkop" },
];

/** Tokens that flip "isi/top up" from transfer reading back to an expense. */
const TOP_UP_EXPENSE_OVERRIDES = new Set(["pulsa", "kuota"]);

// Date-adjacent tokens that must never be mistaken for payees.
const NON_PAYEE_NEXT = new Set([
  "tanggal",
  "tgl",
  "kemarin",
  "semalam",
  "yesterday",
  "minggu",
  "bulan",
  "awal",
  "akhir",
]);

/**
 * Function words that never carry meaning on their own; they are stripped
 * from leftovers instead of polluting the description ("kopi pakai" ->
 * "kopi").
 */
const FUNCTION_WORDS = new Set([
  "pakai",
  "dari",
  "ke",
  "via",
  "from",
  "make",
  "to",
  "di",
  "at",
  "oleh",
  "by",
  "with",
  "buat",
  "top",
  "up",
  "isi",
]);

// ---------------------------------------------------------------------------
// Category substitution dictionary (doc 3.9.7): bilingual token keys mapped
// to ranked hint keywords matched against the workspace's live record names.
// ---------------------------------------------------------------------------

interface CategoryAlias {
  key: string;
  categoryHints: string[];
  subHints: string[];
  /** Canonical merchant name when the alias also names a payee. */
  payee?: string;
}

const CATEGORY_ALIASES: CategoryAlias[] = [
  {
    key: "kopi",
    categoryHints: ["food", "makanan"],
    subHints: ["dairy", "beverage", "drink", "hangout"],
    payee: "kopi",
  },
  {
    key: "ngopi",
    categoryHints: ["food", "makanan"],
    subHints: ["dairy", "beverage", "drink", "hangout"],
    payee: "ngopi",
  },
  {
    key: "warkop",
    categoryHints: ["food", "makanan"],
    subHints: ["hangout", "dairy", "beverage"],
    payee: "Warkop",
  },
  {
    key: "makan",
    categoryHints: ["food", "makanan"],
    subHints: ["snack", "protein", "hangout"],
  },
  {
    key: "jajan",
    categoryHints: ["food", "makanan"],
    subHints: ["snack", "hangout"],
  },
  {
    key: "gofood",
    categoryHints: ["food", "makanan"],
    subHints: ["protein", "snack", "hangout"],
    payee: "GoFood",
  },
  {
    key: "grabfood",
    categoryHints: ["food", "makanan"],
    subHints: ["protein", "snack", "hangout"],
    payee: "GrabFood",
  },
  { key: "bensin", categoryHints: ["transport"], subHints: ["fuel"] },
  { key: "pertalite", categoryHints: ["transport"], subHints: ["fuel"] },
  { key: "pertamax", categoryHints: ["transport"], subHints: ["fuel"] },
  { key: "spbu", categoryHints: ["transport"], subHints: ["fuel"] },
  { key: "parkir", categoryHints: ["transport"], subHints: ["park"] },
  { key: "gojek", categoryHints: ["transport"], subHints: ["public"], payee: "Gojek" },
  {
    key: "listrik",
    categoryHints: ["housing", "utilit"],
    subHints: ["electric"],
  },
  {
    key: "token",
    categoryHints: ["housing", "utilit"],
    subHints: ["electric"],
  },
  {
    key: "pulsa",
    categoryHints: ["housing", "utilit"],
    subHints: ["internet", "phone"],
  },
  {
    key: "kuota",
    categoryHints: ["housing", "utilit"],
    subHints: ["internet", "phone"],
  },
  {
    key: "internet",
    categoryHints: ["housing", "utilit"],
    subHints: ["internet", "phone"],
  },
  {
    key: "sewa",
    categoryHints: ["housing", "utilit"],
    subHints: ["rent", "mortgage"],
  },
  {
    key: "kost",
    categoryHints: ["housing", "utilit"],
    subHints: ["rent", "mortgage"],
  },
  { key: "gajian", categoryHints: ["income"], subHints: ["salary"] },
  { key: "gaji", categoryHints: ["income"], subHints: ["salary"] },
  { key: "salary", categoryHints: ["income"], subHints: ["salary"] },
  {
    key: "jualan",
    categoryHints: ["income"],
    subHints: ["side", "hustle", "freelance"],
  },
  {
    key: "penjualan",
    categoryHints: ["income"],
    subHints: ["side", "hustle", "freelance"],
  },
  {
    key: "freelance",
    categoryHints: ["income"],
    subHints: ["freelance"],
  },
  { key: "bonus", categoryHints: ["income"], subHints: ["salary", "side"] },
  {
    key: "transfer",
    categoryHints: ["transfer"],
    subHints: ["general"],
  },
  {
    key: "pindah",
    categoryHints: ["transfer"],
    subHints: ["general"],
  },
  {
    key: "netflix",
    categoryHints: ["entertainment"],
    subHints: ["subscription"],
    payee: "Netflix",
  },
  {
    key: "spotify",
    categoryHints: ["entertainment"],
    subHints: ["subscription"],
    payee: "Spotify",
  },
  {
    key: "bioskop",
    categoryHints: ["entertainment"],
    subHints: ["movie", "game"],
  },
  {
    key: "konser",
    categoryHints: ["entertainment"],
    subHints: ["event", "concert"],
  },
  {
    key: "dokter",
    categoryHints: ["personal", "care"],
    subHints: ["health"],
  },
  {
    key: "obat",
    categoryHints: ["personal", "care"],
    subHints: ["health"],
  },
  {
    key: "gym",
    categoryHints: ["personal", "care"],
    subHints: ["fitness"],
  },
  {
    key: "skincare",
    categoryHints: ["personal", "care"],
    subHints: ["toiletr", "groom"],
  },
];

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

/** Whole digit runs in the name containing the spoken cluster. */
function nameMatchesDigitRun(name: string, cluster: string): boolean {
  if (cluster.length < 3) return false;
  const runs = name.match(/\d+/g) ?? [];
  return runs.some(
    (run) => run === cluster || run.endsWith(cluster),
  );
}

interface AccountMention {
  index: number;
  role: "source" | "destination" | null;
  candidates: AccountView[];
  /** Digit cluster spoken directly after this mention (doc 3.9.5). */
  suffix?: { digits: string; end: number };
}

interface AccountResolution {
  source?: string;
  destination?: string;
  /** Token index of the first account mention (ordering-rule boundary). */
  anchorIndex: number;
}

interface AccountsStep {
  resolution: AccountResolution;
  consumedIndices: Set<number>;
  /** Digit cluster captured as a suffix candidate, if any. */
  digitSuffix?: string;
  /** An alias matched several accounts without a narrowing digit suffix. */
  ambiguous: boolean;
}

/** Per-digit-word cluster -> digits ("tujuh enam dua lima" -> "7625"). */
function parseWordDigitCluster(
  tokens: Token[],
  start: number,
): { digits: string; end: number } | null {
  const units: Record<string, number> = { ...ID_UNITS, ...EN_UNITS };
  let digits = "";
  let end = start;
  while (end < tokens.length) {
    const unit = units[tokens[end].low];
    if (unit === undefined || isScaleWord(tokens[end].low) !== null) break;
    digits += String(unit);
    end += 1;
  }
  if (digits.length >= 3) {
    return { digits, end };
  }
  return null;
}

function parseDigitSuffix(tokens: Token[], start: number): { digits: string; end: number } | null {
  const first = tokens[start];
  if (!first) return null;
  if (/^[0-9]{3,}$/.test(first.low)) {
    return { digits: first.low, end: start + 1 };
  }
  const wordCluster = parseWordDigitCluster(tokens, start);
  if (wordCluster) return wordCluster;
  return null;
}

function resolveAccounts(
  tokens: Token[],
  context: UtteranceParserContext,
  typeHint: TransactionType | undefined,
  topUpDetected: boolean,
): AccountsStep {
  const consumedIndices = new Set<number>();

  // Mentions: alias token anywhere, with candidates from live accounts
  // whose name contains that alias as a whole word.
  const mentions: AccountMention[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const low = tokens[index].low;
    if (!ACCOUNT_ALIASES.includes(low)) continue;
    const candidates = context.accounts.filter((account) => {
      if (account.isArchived) return false;
      const words = nameTokens(account.name);
      return words.includes(low);
    });
    if (candidates.length === 0) continue;
    let role: AccountMention["role"] = null;
    for (let back = index - 1; back >= Math.max(0, index - 2); back--) {
      const prev = tokens[back].low;
      if (SOURCE_PREPOSITIONS.has(prev)) {
        role = "source";
        break;
      }
      if (DESTINATION_PREPOSITIONS.has(prev)) {
        role = "destination";
        break;
      }
    }
    // Each mention gets its own suffix cluster, so "dari bca 1234 ke bca
    // 5678" narrows both sides independently instead of reusing the first.
    const suffix = parseDigitSuffix(tokens, index + 1);
    if (suffix) {
      for (let i = index + 1; i < suffix.end; i++) {
        consumedIndices.add(i);
      }
    }
    mentions.push({ index, role, candidates, suffix: suffix ?? undefined });
    consumedIndices.add(index);
  }

  if (mentions.length === 0) {
    return {
      resolution: { anchorIndex: tokens.length },
      consumedIndices,
      ambiguous: false,
    };
  }

  const anchorIndex = mentions[0].index;

  // Resolve one mention: single candidate, or digit-run filter when the
  // alias alone is ambiguous. Never pick an unverified first match.
  const resolveMention = (mention: AccountMention): AccountView | undefined => {
    if (mention.candidates.length === 1) return mention.candidates[0];
    if (!mention.suffix) return undefined;
    const matched = mention.candidates.filter((account) =>
      nameMatchesDigitRun(account.name, mention.suffix!.digits),
    );
    return matched.length === 1 ? matched[0] : undefined;
  };

  const resolution: AccountResolution = { anchorIndex };
  let ambiguous = mentions.some(
    (mention) =>
      mention.candidates.length > 1 && resolveMention(mention) === undefined,
  );
  const ordered = mentions.slice(0, 2);
  for (const [ordinal, mention] of ordered.entries()) {
    const account = resolveMention(mention);
    if (!account) continue;
    const role =
      mention.role ??
      (typeHint === "INCOME" || (topUpDetected && ordinal === 0)
        ? "destination"
        : "source");
    if (role === "source") {
      resolution.source ??= account.id;
    } else {
      resolution.destination ??= account.id;
    }
  }

  // Two mentions of the same alias ("dari bca 1234 ke bca 5678") share one
  // suffix, so they can resolve to the same account. A self-transfer is
  // never a valid draft: drop the destination and force the user to choose.
  if (
    resolution.source !== undefined &&
    resolution.destination === resolution.source
  ) {
    resolution.destination = undefined;
    ambiguous = true;
  }

  return {
    resolution,
    consumedIndices,
    digitSuffix: mentions[0].suffix?.digits,
    ambiguous,
  };
}

// ---------------------------------------------------------------------------
// Category mapping (history recency first, then dictionary)
// ---------------------------------------------------------------------------

interface CategoryStep {
  categoryId?: string;
  subCategoryId?: string;
  alternatives: SubCategoryAlternative[];
  consumedIndices: Set<number>;
}

function buildAlternative(
  category: CategoryView,
  subId: string,
  rank: number,
): SubCategoryAlternative | null {
  const sub = category.subCategories.find((s) => s.id === subId && !s.isArchived);
  if (!sub) return null;
  return {
    categoryId: category.id,
    subCategoryId: sub.id,
    label: sub.name,
    rank,
  };
}

function resolveCategory(
  tokens: Token[],
  context: UtteranceParserContext,
  typeHint: TransactionType | undefined,
): CategoryStep {
  const candidates: {
    categoryId: string;
    subCategoryId: string;
    consumedIndex: number;
  }[] = [];

  for (let index = 0; index < tokens.length; index++) {
    const alias = CATEGORY_ALIASES.find((entry) => entry.key === tokens[index].low);
    if (!alias) continue;

    // Layer 2: history recency (doc 3.9.7). A token the user has already
    // saved under a live subcategory ranks first and adapts to any custom
    // taxonomy without a dictionary entry.
    for (const recent of context.recentTransactions ?? []) {
      if (!recent.description) continue;
      const words = nameTokens(recent.description);
      if (!words.includes(alias.key)) continue;
      const live = context.categories.find(
        (category) =>
          category.id === recent.categoryId &&
          category.subCategories.some(
            (sub) => sub.id === recent.subCategoryId && !sub.isArchived,
          ),
      );
      if (!live) continue;
      candidates.push({
        categoryId: recent.categoryId,
        subCategoryId: recent.subCategoryId,
        consumedIndex: index,
      });
    }

    // Layer 1: dictionary -> live record mapping.
    const category =
      findCategoryByHints(context.categories, typeHint, alias.categoryHints) ??
      findCategoryByHints(context.categories, undefined, alias.categoryHints);
    if (!category) continue;
    const matches = findSubCategoryMatches(category, alias.subHints);
    if (matches.best) {
      candidates.push({
        categoryId: category.id,
        subCategoryId: matches.best,
        consumedIndex: index,
      });
    }

    if (candidates.length > 0) {
      // Deduplicate by subcategory id, keep order (history first).
      const seen = new Set<string>();
      const deduped = candidates.filter((candidate) => {
        if (seen.has(candidate.subCategoryId)) return false;
        seen.add(candidate.subCategoryId);
        return true;
      });
      const best = deduped[0];
      const categoryOfBest = context.categories.find(
        (c) => c.id === best.categoryId,
      );
      if (!categoryOfBest) continue;

      // Ranked alternatives from the same category's remaining matches.
      let alternatives: SubCategoryAlternative[] = [];
      if (categoryOfBest.id === best.categoryId && categoryOfBest) {
        const { alternatives: altIds } = findSubCategoryMatches(
          categoryOfBest,
          alias.subHints,
        );
        alternatives = altIds
          .filter((subId) => subId !== best.subCategoryId)
          .map((subId, rank) => buildAlternative(categoryOfBest, subId, rank))
          .filter((value): value is SubCategoryAlternative => value !== null)
          .slice(0, 4);
      }

      // The keyword token itself stays unconsumed: it doubles as the
      // natural description ("kopi" remains "kopi" on the review form).
      return {
        categoryId: best.categoryId,
        subCategoryId: best.subCategoryId,
        alternatives,
        consumedIndices: new Set<number>(),
      };
    }
  }
  return { alternatives: [], consumedIndices: new Set() };
}

function findCategoryByHints(
  categories: CategoryView[],
  type: TransactionType | undefined,
  hints: string[],
): CategoryView | undefined {
  return categories.find(
    (category) =>
      (!type || category.type === type) &&
      nameTokenOverlap(category.name, hints),
  );
}

function nameTokenOverlap(name: string, hints: string[]): boolean {
  const words = nameTokens(name);
  return hints.some((hint) =>
    words.some((word) => hintMatches(word, hint) || stem(word) === hint),
  );
}

/** Ranked live subcategory ids whose names match the hints, best first. */
function findSubCategoryMatches(
  category: CategoryView,
  hints: string[],
): { best?: string; alternatives: string[] } {
  const ranked: { id: string; order: number }[] = [];
  for (const sub of category.subCategories) {
    if (sub.isArchived) continue;
    const order = hints.findIndex((hint) =>
      nameTokenOverlap(sub.name, [hint]),
    );
    if (order !== -1) ranked.push({ id: sub.id, order });
  }
  ranked.sort((a, b) => a.order - b.order);
  return {
    best: ranked[0]?.id,
    alternatives: ranked.map((entry) => entry.id),
  };
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const ID_WEEKDAYS: Record<string, number> = {
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
  minggu: 0,
};

const EN_WEEKDAYS: Record<string, number> = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

type IsoParts = { y: number; m: number; d: number };

function parseIsoDate(iso: string): IsoParts {
  const [y, m, d] = iso.split("-").map((part) => Number(part));
  return { y, m, d };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function isoFrom({ y, m, d }: IsoParts): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function addIsoDays(iso: string, delta: number): string {
  const { y, m, d } = parseIsoDate(iso);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + delta);
  return isoFrom({
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  });
}

/** Most recent occurrence of a weekday strictly before today. */
function lastWeekdayBefore(todayIso: string, targetDow: number): string {
  const { y, m, d } = parseIsoDate(todayIso);
  const date = new Date(Date.UTC(y, m - 1, d));
  let diff = (date.getUTCDay() - targetDow + 7) % 7;
  if (diff === 0) diff = 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return isoFrom({
    y: date.getUTCFullYear(),
    m: date.getUTCMonth() + 1,
    d: date.getUTCDate(),
  });
}

interface DateScan {
  date: string;
  end: number;
}

function parseDateAt(
  tokens: Token[],
  start: number,
  todayIso: string,
): DateScan | null {
  const first = tokens[start];
  if (!first) return null;
  const low = first.low;

  if (low === "kemarin" || low === "semalam" || low === "yesterday") {
    return { date: addIsoDays(todayIso, -1), end: start + 1 };
  }

  const two = [first.low, tokens[start + 1]?.low ?? ""].join(" ");
  if (two === "minggu lalu" || two === "last week") {
    return { date: addIsoDays(todayIso, -7), end: start + 2 };
  }
  if (two === "bulan lalu" || two === "last month") {
    const { y, m, d } = parseIsoDate(todayIso);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    return {
      date: isoFrom({
        y: prevY,
        m: prevM,
        d: Math.min(d, daysInMonth(prevY, prevM)),
      }),
      end: start + 2,
    };
  }
  if (two === "awal bulan" || two === "beginning of") {
    const { y, m } = parseIsoDate(todayIso);
    return { date: isoFrom({ y, m, d: 1 }), end: start + 2 };
  }
  if (two === "akhir bulan" || two === "end of") {
    const { y, m } = parseIsoDate(todayIso);
    return { date: isoFrom({ y, m, d: daysInMonth(y, m) }), end: start + 2 };
  }

  if (low === "tanggal" || low === "tgl") {
    const day = Number((tokens[start + 1]?.low ?? "").replace(/\D/g, ""));
    const { y, m } = parseIsoDate(todayIso);
    if (day >= 1 && day <= daysInMonth(y, m)) {
      return {
        date: isoFrom({ y, m, d: day }),
        end: start + 2,
      };
    }
  }

  if (low === "last" && tokens[start + 1]) {
    const next = tokens[start + 1].low;
    const dow = EN_WEEKDAYS[next] ?? ID_WEEKDAYS[next];
    if (dow !== undefined) {
      return { date: lastWeekdayBefore(todayIso, dow), end: start + 2 };
    }
  }
  if (tokens[start + 1]?.low === "lalu" && low in ID_WEEKDAYS) {
    return { date: lastWeekdayBefore(todayIso, ID_WEEKDAYS[low]), end: start + 2 };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Top-up detection and the main entry point
// ---------------------------------------------------------------------------

function topUpTokenIndex(tokens: Token[]): number {
  for (let i = 0; i < tokens.length; i++) {
    const low = tokens[i].low;
    if (low === "topup" || low === "top-up") return i;
    if (low === "top" && tokens[i + 1]?.low === "up") return i;
    if (low === "isi") return i;
  }
  return -1;
}

/**
 * Parses an utterance into a draft. Deterministic and side-effect-free.
 */
export function parseTransactionUtterance(
  text: string,
  context: UtteranceParserContext,
): ParsedTransactionDraft {
  const tokens = tokenize(text);
  const notes: string[] = [];

  // ---- Type signal: earliest verb token wins (explicit > implied).
  const typeSignal: { type: TransactionType; index: number } | undefined = (() => {
    let best: { type: TransactionType; index: number } | undefined;
    const consider = (type: TransactionType, index: number) => {
      if (best === undefined || index < best.index) best = { type, index };
    };
    for (let index = 0; index < tokens.length; index++) {
      const low = tokens[index].low;
      if (
        low === "transfer" &&
        (tokens[index + 1]?.low === "masuk" || tokens[index + 1]?.low === "diterima")
      ) {
        continue; // read as income via "masuk" below
      }
      if (INCOME_VERBS.has(low)) consider("INCOME", index);
      else if (TRANSFER_VERBS.has(low)) consider("TRANSFER", index);
      else if (EXPENSE_VERBS.has(low)) consider("EXPENSE", index);
    }
    return best;
  })();

  const topUpIdx = topUpTokenIndex(tokens);
  const topUpDetected =
    topUpIdx !== -1 &&
    !tokens.some((token) => TOP_UP_EXPENSE_OVERRIDES.has(token.low));

  // ---- Category mapping (history first, then dictionary).
  const categoryStep = resolveCategory(tokens, context, typeSignal?.type);

  const topUpConflict = topUpDetected && !typeSignal;
  let type = typeSignal?.type;
  if (!type && !topUpConflict && categoryStep.categoryId) {
    const category = context.categories.find((c) => c.id === categoryStep.categoryId);
    if (category) type = category.type;
  }

  // ---- Accounts: alias mentions + digit-suffix narrowing (doc 3.9.5).
  const accountsStep = resolveAccounts(tokens, context, type, topUpDetected);
  if (accountsStep.ambiguous) {
    notes.push("account-ambiguous");
  }

  const anchorIndex = Math.min(
    topUpIdx === -1 ? tokens.length : topUpIdx,
    accountsStep.resolution.anchorIndex,
  );
  const consumed = new Set<number>([
    ...accountsStep.consumedIndices,
    ...categoryStep.consumedIndices,
  ]);
  tokens.forEach((token, index) => {
    if (typeSignal?.index === index) consumed.add(index);
    if (topUpIdx === index) consumed.add(index);
    if (topUpIdx !== -1 && topUpIdx + 1 === index && tokens[topUpIdx].low === "top") {
      consumed.add(index); // the paired "up"
    }
  });

  // ---- Amount: first number expression; before the anchor any number
  // qualifies, after it only magnitude/grouping-backed numbers qualify
  // (bare clusters there are account digit suffixes instead).
  let amount: string | undefined;
  amountScan: for (let index = 0; index < tokens.length; index++) {
    if (consumed.has(index)) continue;
    const scan = parseAmountAt(tokens, index);
    if (!scan) continue;
    const afterAnchor = index >= anchorIndex;
    const acceptable = !afterAnchor || scan.scaled || scan.grouped || scan.value.frac !== "";
    if (!acceptable) continue;
    amount = renderAmountValue(scan.value) ?? undefined;
    if (amount !== undefined) {
      for (let j = index; j < scan.end; j++) consumed.add(j);
      break amountScan;
    }
  }

  // ---- Date: first relative token not already consumed.
  let date: string | undefined;
  dateScan: for (let index = 0; index < tokens.length; index++) {
    if (consumed.has(index)) continue;
    const scan = parseDateAt(tokens, index, context.today);
    if (!scan) continue;
    date = scan.date;
    for (let j = index; j < scan.end; j++) consumed.add(j);
    break dateScan;
  }

  // ---- Payee: "di <merchant>" pattern or direct merchant alias.
  let payeePayer: string | undefined;
  for (let index = 0; index < tokens.length; index++) {
    const low = tokens[index].low;
    const merchant = MERCHANT_ALIASES.find((entry) => entry.key === low);
    if (merchant && !payeePayer) {
      // Category aliases double as merchants; consuming again is a no-op.
      payeePayer = merchant.payee;
      consumed.add(index);
      continue;
    }
    if (
      !consumed.has(index) &&
      PAYEE_PREPOSITIONS.has(low) &&
      tokens[index + 1] &&
      !consumed.has(index + 1)
    ) {
      const next = tokens[index + 1];
      const merchantAfter = MERCHANT_ALIASES.find((entry) => entry.key === next.low);
      if (merchantAfter) {
        payeePayer = merchantAfter.payee;
        consumed.add(index);
        consumed.add(index + 1);
        continue;
      }
      const isAccountAlias = ACCOUNT_ALIASES.includes(next.low);
      const nextIsDateWord =
        NON_PAYEE_NEXT.has(next.low) || parseDateAt(tokens, index + 1, context.today) !== null;
      if (isAccountAlias) {
        // "pakai bca" was handled through accounts; drop only the preposition.
        consumed.add(index);
        continue;
      }
      if (!nextIsDateWord && !/^[0-9]/.test(next.low)) {
        payeePayer = next.raw;
        consumed.add(index);
        consumed.add(index + 1);
      }
    }
  }

  // ---- Top-up ambiguity (doc 3.9.6): never default between readings.
  let ambiguity: ParserAmbiguity | undefined;
  if (topUpConflict) {
    if (accountsStep.resolution.source && accountsStep.resolution.destination) {
      type = "TRANSFER";
      notes.push("top-up-transfer");
    } else {
      ambiguity = {
        kind: "TOP_UP_INTENT",
        explanation:
          "Top-up detected. Choose Transfer if this moved money between your own accounts, or Money Out if it was a payment.",
      };
      notes.push("top-up-intent-unresolved");
    }
  }

  // ---- Cross-type guard: a category from another type is dropped, not
  // silently kept. When the type is unresolved the dialog defaults to
  // Money Out, so a non-EXPENSE category would render against the wrong
  // type tiles.
  if (categoryStep.categoryId) {
    const category = context.categories.find((c) => c.id === categoryStep.categoryId);
    const effectiveType = type ?? "EXPENSE";
    if (category && category.type !== effectiveType) {
      notes.push("category-type-mismatch-dropped");
      categoryStep.categoryId = undefined;
      categoryStep.subCategoryId = undefined;
      categoryStep.alternatives = [];
    }
  }

  const draft: ParsedTransactionDraft = {
    subCategoryAlternatives: categoryStep.alternatives,
    notes,
  };
  if (type) draft.type = type;
  if (amount !== undefined) draft.amount = amount;
  if (date !== undefined) draft.date = date;
  if (categoryStep.categoryId) draft.categoryId = categoryStep.categoryId;
  if (categoryStep.subCategoryId) draft.subCategoryId = categoryStep.subCategoryId;
  if (accountsStep.resolution.source) draft.sourceAccountId = accountsStep.resolution.source;
  if (accountsStep.resolution.destination) {
    draft.destinationAccountId = accountsStep.resolution.destination;
  }
  if (payeePayer) draft.payeePayer = payeePayer;

  // ---- Description from leftovers, original casing preserved.
  const leftover = tokens
    .filter(
      (token, index) =>
        !consumed.has(index) && !FUNCTION_WORDS.has(token.low),
    )
    .map((token) => token.raw);
  if (leftover.length > 0) draft.description = leftover.join(" ");
  if (ambiguity) draft.ambiguity = ambiguity;

  return draft;
}

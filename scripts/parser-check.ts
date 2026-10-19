/**
 * Behavior checks for the transaction utterance parser.
 *
 * Run with `npm run test:parser`. Exercises the designed Indonesian and
 * code-switched utterances from docs/product/FEATURE_TRANSACTION_VOICE_INPUT.md
 * Section 3.9. Asserts on the parsed draft only; no database or network.
 */
import {
  parseTransactionUtterance,
  type UtteranceParserContext,
} from "../src/features/transactions/utterance-parser";
import type { CategoryView } from "../src/features/categories/types";
import type { AccountView } from "../src/features/accounts/types";

let id = 0;
const nextId = (prefix: string) => `${prefix}-${++id}`;

interface Fixture {
  context: UtteranceParserContext;
  want: Record<string, string>;
  acc: Record<string, string>;
}

function makeFixture(
  accountNames: string[],
  recents: { description: string; category: string; sub: string }[] = [],
): Fixture {
  const want: Record<string, string> = {};
  const category = (
    name: string,
    type: "EXPENSE" | "INCOME" | "TRANSFER",
    subNames: string[],
  ): CategoryView => {
    const categoryId = nextId("cat");
    const subs = subNames.map((subName) => {
      const id = nextId("sub");
      want[`${name}/${subName}`] = id;
      return { id, name: subName, isArchived: false, createdAt: "" };
    });
    want[name] = categoryId;
    return {
      id: categoryId,
      name,
      type,
      isArchived: false,
      subCategories: subs,
      createdAt: "",
    };
  };

  const acc: Record<string, string> = {};
  const accountTypeFor = (name: string): AccountView["type"] => {
    if (name === "Tunai") return "CASH";
    if (name === "GoPay" || name === "OVO") return "DIGITAL_WALLET";
    return "CHECKING";
  };
  const accounts: AccountView[] = accountNames.map((name) => {
    const accountId = nextId("acc");
    acc[name] = accountId;
    return {
      id: accountId,
      name,
      type: accountTypeFor(name),
      initialBalance: "0",
      netTransactionSum: "0",
      isArchived: false,
      createdAt: "",
    };
  });

  const context: UtteranceParserContext = {
    today: "2026-10-18",
    categories: [
      category("Food", "EXPENSE", [
        "Proteins",
        "Fruits & Vegetables",
        "Dairy & Beverages",
        "Grains & Bakery",
        "Spices & Condiments",
        "Snacks",
      ]),
      category("Housing & Utilities", "EXPENSE", [
        "Rent/Mortgage",
        "Electricity & Water",
        "Internet & Phone",
      ]),
      category("Transportation", "EXPENSE", [
        "Fuel",
        "Public Transport",
        "Parking & Tolls",
      ]),
      category("Entertainment", "EXPENSE", [
        "Subscriptions",
        "Hangout",
        "Vacation",
        "Movies & Games",
        "Hobbies",
        "Events & Concerts",
      ]),
      category("Personal Care", "EXPENSE", [
        "Healthcare",
        "Fitness",
        "Toiletries & Grooming",
      ]),
      category("Income", "INCOME", ["Salary", "Freelance", "Side Hustle"]),
      category("Transfers", "TRANSFER", ["General"]),
    ],
    accounts,
  };
  if (recents.length > 0) {
    context.recentTransactions = recents.map((recent) => ({
      description: recent.description,
      categoryId: want[recent.category],
      subCategoryId: want[recent.sub],
    }));
  }
  return { context, want, acc };
}

const SINGLE = makeFixture(["BCA 7625", "GoPay", "OVO", "Tunai"]);
const MULTI = makeFixture(["BCA 7625", "BCA 1234", "GoPay", "OVO", "Tunai"]);
const HISTORY = makeFixture(["BCA 7625", "GoPay"], [
  { description: "kopi bareh", category: "Entertainment", sub: "Entertainment/Hangout" },
]);

let failures = 0;

function check(
  label: string,
  text: string,
  fixture: Fixture,
  expected: Partial<Record<string, unknown>>,
) {
  const draft = parseTransactionUtterance(text, fixture.context);
  const problems: string[] = [];
  for (const [field, want] of Object.entries(expected)) {
    const got = (draft as unknown as Record<string, unknown>)[field];
    if (JSON.stringify(want) !== JSON.stringify(got)) {
      problems.push(`  ${field}: want ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    }
  }
  if (problems.length > 0) {
    failures += 1;
    console.log(`FAIL ${label} <- "${text}"`);
    for (const line of problems) console.log(line);
    console.log(`  draft: ${JSON.stringify(draft)}`);
  } else {
    console.log(`PASS ${label}`);
  }
}

// Case 1 - the full designed utterance (multi-account fixture). Today needs
// no explicit date token: the dialog already defaults to today.
check(
  "01 designed utterance suffix",
  "Beli kopi lima belas ribu pakai bca tujuh enam dua lima",
  MULTI,
  {
    type: "EXPENSE",
    amount: "15000",
    date: undefined,
    categoryId: MULTI.want["Food"],
    subCategoryId: MULTI.want["Food/Dairy & Beverages"],
    sourceAccountId: MULTI.acc["BCA 7625"],
    description: "kopi",
  },
);

// Case 2 - top-up with explicit source: transfer reading.
check("02 top up dari bca", "top up gopay 100rb dari bca", SINGLE, {
  type: "TRANSFER",
  amount: "100000",
  destinationAccountId: SINGLE.acc["GoPay"],
  sourceAccountId: SINGLE.acc["BCA 7625"],
});

// Case 3 - income with magnitude and relative date.
check("03 gajian", "Gajian 5jt kemarin", SINGLE, {
  type: "INCOME",
  amount: "5000000",
  date: "2026-10-17",
  categoryId: SINGLE.want["Income"],
  subCategoryId: SINGLE.want["Income/Salary"],
});

// Case 4 - explicit transfer orientation.
check("04 transfer ke/dari", "transfer 250k ke gopay dari bca", SINGLE, {
  type: "TRANSFER",
  amount: "250000",
  destinationAccountId: SINGLE.acc["GoPay"],
  sourceAccountId: SINGLE.acc["BCA 7625"],
  subCategoryId: SINGLE.want["Transfers/General"],
});

// Case 5 - alias category + cash account + date.
check("05 bensin tunai", "belanja bensin 20rb kemarin pakai tunai", SINGLE, {
  type: "EXPENSE",
  amount: "20000",
  date: "2026-10-17",
  categoryId: SINGLE.want["Transportation"],
  subCategoryId: SINGLE.want["Transportation/Fuel"],
  sourceAccountId: SINGLE.acc["Tunai"],
});

// Case 6 - code-switching, merchant payee, wallet role.
check(
  "06 code-switch",
  "spent 25k buat jajan di warkop kemarin pakai gopay",
  SINGLE,
  {
    type: "EXPENSE",
    amount: "25000",
    date: "2026-10-17",
    payeePayer: "Warkop",
    sourceAccountId: SINGLE.acc["GoPay"],
  },
);

// Case 7 - thousand-dot grouping and tanggal N.
check(
  "07 listrik tanggal",
  "bayar listrik 150.000 tanggal 5 pakai bca",
  SINGLE,
  {
    type: "EXPENSE",
    amount: "150000",
    date: "2026-10-05",
    categoryId: SINGLE.want["Housing & Utilities"],
    subCategoryId: SINGLE.want["Housing & Utilities/Electricity & Water"],
    sourceAccountId: SINGLE.acc["BCA 7625"],
  },
);

// Case 8 - "isi pulsa" is an expense, not a transfer.
check("08 isi pulsa", "isi pulsa 25rb pakai gopay", SINGLE, {
  type: "EXPENSE",
  amount: "25000",
  categoryId: SINGLE.want["Housing & Utilities"],
  subCategoryId: SINGLE.want["Housing & Utilities/Internet & Phone"],
  sourceAccountId: SINGLE.acc["GoPay"],
});

// Case 9 - top-up without a source: ambiguity, no default type.
check("09 top up ambiguous", "top up gopay 100rb", SINGLE, {
  type: undefined,
  amount: "100000",
  destinationAccountId: SINGLE.acc["GoPay"],
});

const draft9 = parseTransactionUtterance("top up gopay 100rb", SINGLE.context);
if (draft9.ambiguity?.kind !== "TOP_UP_INTENT") {
  failures += 1;
  console.log(`FAIL 09b ambiguity flag: ${JSON.stringify(draft9)}`);
} else {
  console.log("PASS 09b ambiguity flag");
}

// Case 10 - multi-place spoken number.
check("10 multi-place words", "belanja dua ratus lima puluh ribu", SINGLE, {
  type: "EXPENSE",
  amount: "250000",
});

// Case 11 - suffix disambiguation between two BCA accounts.
check(
  "11 suffix disambiguation",
  "beli kopi 15rb pakai bca tujuh enam dua lima",
  MULTI,
  {
    type: "EXPENSE",
    amount: "15000",
    sourceAccountId: MULTI.acc["BCA 7625"],
  },
);

// Case 11b - two mentions of the same alias must never resolve both sides
// to one account (shared suffix), even when a suffix is spoken.
const draft11b = parseTransactionUtterance(
  "transfer dari bca 7625 ke bca tujuh enam dua lima",
  MULTI.context,
);
if (
  draft11b.sourceAccountId === draft11b.destinationAccountId ||
  !draft11b.notes.includes("account-ambiguous")
) {
  failures += 1;
  console.log(`FAIL 11b self-transfer guard: ${JSON.stringify(draft11b)}`);
} else {
  console.log("PASS 11b self-transfer guard");
}

// Case 11c - each account mention uses its own spoken suffix.
check("11c per-mention suffix", "transfer dari bca 7625 ke bca 1234", MULTI, {
  type: "TRANSFER",
  sourceAccountId: MULTI.acc["BCA 7625"],
  destinationAccountId: MULTI.acc["BCA 1234"],
});

// Case 12 - decimal comma + million magnitude + tanggal.
check("12 decimal jt", "gajian 3,5jt tanggal 25", SINGLE, {
  type: "INCOME",
  amount: "3500000",
  date: "2026-10-25",
});

// Case 13 - di <payee> pattern with a non-merchant name.
check("13 di payee", "makan siang 30rb di padang", SINGLE, {
  type: "EXPENSE",
  amount: "30000",
  payeePayer: "padang",
});

// Case 14 - no half-guesses: nothing readable.
check("14 no signal", "hmm apa ya", SINGLE, {
  type: undefined,
  amount: undefined,
  date: undefined,
  categoryId: undefined,
  subCategoryId: undefined,
  sourceAccountId: undefined,
  destinationAccountId: undefined,
  payeePayer: undefined,
});

// Case 15 - history recency beats the dictionary.
check(
  "15 history recency",
  "kopi 15rb pakai gopay",
  HISTORY,
  {
    amount: "15000",
    subCategoryId: HISTORY.want["Entertainment/Hangout"],
    sourceAccountId: HISTORY.acc["GoPay"],
  },
);

if (failures > 0) {
  console.log(`\n${failures} failing case(s)`);
  process.exit(1);
}
console.log("\nAll parser checks passed");

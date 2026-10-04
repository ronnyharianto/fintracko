/**
 * Dev-only seed: random transactions for the current month.
 *
 * Inserts a configurable number of transactions (default 150) into a target
 * workspace, each dated on a random day of the current month, then recomputes
 * every account's `netTransactionSum` from the ledger so the balance invariant
 * (`initialBalance + netTransactionSum`) stays exact.
 *
 * Run:
 *   node --env-file=.env node_modules/jiti/lib/jiti-cli.mjs scripts/seed-transactions.ts
 *
 * Options (env vars):
 *   SEED_COUNT         transactions to insert (default 150)
 *   SEED_WORKSPACE_ID  target workspace id (default: the "Personal" workspace
 *                      owned by v.ronny.harianto@gmail.com; falls back to the
 *                      workspace with the most accounts)
 *   SEED_RESET=1       delete previously seeded rows (tag "seed") first
 *
 * This is a local testing utility, not application code. It intentionally
 * bypasses the HTTP layer so a large volume of rows can be produced quickly.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";
import { TransactionType } from "../generated/prisma/enums";

const SEED_TAG = "seed";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

/** Deterministic PRNG (mulberry32) so re-runs are reproducible. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20261004);

function randInt(min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function money(min: number, max: number) {
  const value = min + rng() * (max - min);
  return value.toFixed(2);
}

async function resolveWorkspace(): Promise<string> {
  const explicit = process.env.SEED_WORKSPACE_ID;
  if (explicit) return explicit;

  const personal = await db.workspace.findFirst({
    where: {
      name: "Personal",
      members: { some: { user: { email: "v.ronny.harianto@gmail.com" } } },
    },
    select: { id: true },
  });
  if (personal) return personal.id;

  const withAccounts = await db.workspace.findMany({
    select: { id: true, _count: { select: { accounts: true } } },
    orderBy: { accounts: { _count: "desc" } },
    take: 1,
  });
  if (!withAccounts.length) throw new Error("No workspace found to seed.");
  return withAccounts[0].id;
}

/**
 * Recompute `netTransactionSum` for every account in the workspace directly
 * from the ledger, mirroring the service `balanceEffect` rules.
 */
async function recomputeBalances(workspaceId: string) {
  const accounts = await db.financialAccount.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const txs = await db.financialTransaction.findMany({
    where: { workspaceId },
    select: {
      type: true,
      amount: true,
      sourceAccountId: true,
      destinationAccountId: true,
    },
  });

  const nets = new Map<string, Prisma.Decimal>();
  for (const a of accounts) nets.set(a.id, new Prisma.Decimal(0));
  const add = (id: string | null, delta: Prisma.Decimal) => {
    if (!id || !nets.has(id)) return;
    nets.set(id, nets.get(id)!.add(delta));
  };

  for (const t of txs) {
    if (t.type === TransactionType.INCOME) {
      add(t.destinationAccountId, t.amount);
    } else if (t.type === TransactionType.EXPENSE) {
      add(t.sourceAccountId, t.amount.negated());
    } else if (t.type === TransactionType.TRANSFER) {
      add(t.sourceAccountId, t.amount.negated());
      add(t.destinationAccountId, t.amount);
    }
  }

  for (const [id, net] of nets) {
    await db.financialAccount.update({
      where: { id },
      data: { netTransactionSum: net },
    });
  }
  return nets;
}

async function main() {
  const count = Number(process.env.SEED_COUNT ?? 150);
  const workspaceId = await resolveWorkspace();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, name: true },
  });
  if (!workspace) throw new Error(`Workspace ${workspaceId} not found.`);

  const owner = await db.workspaceMember.findFirst({
    where: { workspaceId, role: "OWNER" },
    select: { userId: true, user: { select: { email: true } } },
  });

  const accounts = await db.financialAccount.findMany({
    where: { workspaceId, isArchived: false },
    select: { id: true, name: true },
  });
  if (accounts.length === 0) {
    throw new Error(`Workspace "${workspace.name}" has no active accounts.`);
  }

  const subCategories = await db.subCategory.findMany({
    where: { workspaceId, isArchived: false, category: { isArchived: false } },
    select: { id: true, name: true, category: { select: { type: true } } },
  });
  if (subCategories.length === 0) {
    throw new Error(`Workspace "${workspace.name}" has no active subcategories.`);
  }

  const subByType: Record<string, typeof subCategories> = {
    INCOME: subCategories.filter((s) => s.category.type === TransactionType.INCOME),
    EXPENSE: subCategories.filter((s) => s.category.type === TransactionType.EXPENSE),
    TRANSFER: subCategories.filter((s) => s.category.type === TransactionType.TRANSFER),
  };

  // "This month" as the operator experiences it, stored as UTC midnight to
  // match the other writers (`new Date("YYYY-MM-DD")`).
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const dayCounts = new Map<number, number>();
  const typeCounts = new Map<TransactionType, number>();

  const shouldReset = process.env.SEED_RESET === "1";
  if (shouldReset) {
    const removed = await db.financialTransaction.deleteMany({
      where: { workspaceId, tags: { has: SEED_TAG } },
    });
    console.log(`Reset: removed ${removed.count} previously seeded transactions.`);
  }

  const otherTags = ["groceries", "rent", "online", "weekend", "family", "work"];

  const rows: Prisma.FinancialTransactionCreateManyInput[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng();
    let type: TransactionType;
    if (roll < 0.6) type = TransactionType.EXPENSE;
    else if (roll < 0.9) type = TransactionType.INCOME;
    else type = TransactionType.TRANSFER;

    let pool = subByType[type];
    if (!pool || pool.length === 0) {
      type = TransactionType.EXPENSE;
      pool = subByType.EXPENSE;
    }
    const sub = pick(pool);

    const day = randInt(1, daysInMonth);
    const date = new Date(Date.UTC(year, month, day));

    let sourceAccountId: string | null = null;
    let destinationAccountId: string | null = null;

    if (type === TransactionType.EXPENSE) {
      sourceAccountId = pick(accounts).id;
    } else if (type === TransactionType.INCOME) {
      destinationAccountId = pick(accounts).id;
    } else {
      const source = pick(accounts);
      let dest = pick(accounts);
      if (accounts.length > 1) {
        while (dest.id === source.id) dest = pick(accounts);
      }
      sourceAccountId = source.id;
      destinationAccountId = dest.id;
    }

    const amount =
      type === TransactionType.INCOME
        ? money(200, 3000)
        : type === TransactionType.TRANSFER
          ? money(50, 1500)
          : money(5, 400);

    rows.push({
      workspaceId,
      type,
      amount,
      subCategoryId: sub.id,
      date,
      sourceAccountId,
      destinationAccountId,
      description: `Seed ${month + 1}/${day} ${sub.name}`,
      payeePayer: pick(["ACME", "Local Store", "Employer", "Transfer", "Market"]),
      tags: [SEED_TAG, pick(otherTags)],
      createdById: owner?.userId ?? null,
    });

    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
  }

  await db.financialTransaction.createMany({ data: rows });
  const nets = await recomputeBalances(workspaceId);

  console.log(
    `Seeded ${rows.length} transactions into "${workspace.name}" (${workspaceId}) for ${year}-${String(month + 1).padStart(2, "0")}.`,
  );
  console.log("By type:", Object.fromEntries(typeCounts));
  const spread = [...dayCounts.entries()].sort((a, b) => a[0] - b[0]);
  console.log("By day:", spread.map(([d, c]) => `${d}:${c}`).join(" "));
  console.log("Account net sums:");
  for (const a of accounts) {
    console.log(`  ${a.name}: ${nets.get(a.id)?.toString() ?? "0"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("SEED ERROR", err);
    process.exit(1);
  });

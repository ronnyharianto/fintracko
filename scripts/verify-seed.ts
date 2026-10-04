/**
 * Dev-only verification for the seeded month window.
 * Mirrors the transactions endpoint query (from/to + paged fetchAll) and
 * checks the account balance invariant.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";
import { TransactionType } from "../generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const WORKSPACE_ID = "1d8c361c-a840-4340-871d-db32407d1e63";

async function main() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const from = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
  const where = {
    workspaceId: WORKSPACE_ID,
    date: { gte: new Date(from), lte: new Date(to) },
  };

  const total = await db.financialTransaction.count({ where });
  console.log(`Window ${from}..${to} total=${total}`);

  // Mirror useWorkspaceCollection.fetchAll (pageSize 100, MAX_PAGES 50).
  const pageSize = 100;
  const collected: { id: string; date: Date; type: string; amount: Prisma.Decimal }[] = [];
  for (let page = 1; page <= 50; page++) {
    const rows = await db.financialTransaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, date: true, type: true, amount: true },
    });
    collected.push(...rows);
    if (rows.length === 0 || collected.length >= total) break;
  }
  console.log(`fetchAll collected=${collected.length} (expected ${total})`);

  // Every seeded row must fall on a valid day of the month.
  let badDay = 0;
  const days = new Set<number>();
  for (const t of collected) {
    const d = t.date.getUTCDate();
    days.add(d);
    if (t.date.getUTCFullYear() !== year || t.date.getUTCMonth() !== month) badDay++;
  }
  console.log(`distinct days=${days.size} range=${Math.min(...days)}..${Math.max(...days)} outOfMonth=${badDay}`);

  // Balance invariant: initialBalance + netTransactionSum recomputed from ledger.
  const accounts = await db.financialAccount.findMany({
    where: { workspaceId: WORKSPACE_ID },
    select: { id: true, name: true, initialBalance: true, netTransactionSum: true },
  });
  const txs = await db.financialTransaction.findMany({
    where: { workspaceId: WORKSPACE_ID },
    select: { type: true, amount: true, sourceAccountId: true, destinationAccountId: true },
  });
  const expected = new Map<string, Prisma.Decimal>();
  for (const a of accounts) expected.set(a.id, new Prisma.Decimal(0));
  const add = (id: string | null, delta: Prisma.Decimal) => {
    if (id && expected.has(id)) expected.set(id, expected.get(id)!.add(delta));
  };
  for (const t of txs) {
    if (t.type === TransactionType.INCOME) add(t.destinationAccountId, t.amount);
    else if (t.type === TransactionType.EXPENSE) add(t.sourceAccountId, t.amount.negated());
    else if (t.type === TransactionType.TRANSFER) {
      add(t.sourceAccountId, t.amount.negated());
      add(t.destinationAccountId, t.amount);
    }
  }
  for (const a of accounts) {
    const exp = expected.get(a.id)!;
    const ok = exp.equals(a.netTransactionSum);
    console.log(`  ${ok ? "OK " : "BAD"} ${a.name}: balance=${a.initialBalance.add(a.netTransactionSum).toString()} net=${a.netTransactionSum.toString()} expectedNet=${exp.toString()}`);
  }
  console.log(`workspace total transactions=${await db.financialTransaction.count({ where: { workspaceId: WORKSPACE_ID } })}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });

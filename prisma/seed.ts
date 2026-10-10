/**
 * Development seed for Fintracko.
 *
 * Bootstraps a complete local fixture through the Prisma client so every
 * collaboration and financial flow has realistic data to render:
 *   - Two users with different currency preferences (Alice = IDR, Bob = USD).
 *   - Credential accounts so both users can sign in at /account in dev.
 *   - Two workspaces per user, including cross-workspace collaborations.
 *   - Accepted and pending invitations between the two users.
 *   - Financial accounts per workspace.
 *   - Monthly and yearly budgets over expense subcategories.
 *   - A batch of current-month transactions, re-runnable to append more.
 *
 * Run:
 *   npm run db:seed
 *
 * Options (env vars):
 *   SEED_COUNT     transactions appended per workspace (default 120)
 *   SEED_RESET=1   delete previously seeded (tag "seed") transactions first
 *   SEED_PASSWORD  password for the seeded credential accounts
 *                  (default "fintracko-dev")
 *
 * This is a development-only utility. It refuses to run when
 * NODE_ENV === "production" and writes to whichever database the connection
 * URL points at, so never point it at production.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";
import {
  AccountType,
  BudgetInterval,
  TransactionType,
} from "../generated/prisma/enums";
import {
  WORKSPACE_TEMPLATES,
  type WorkspaceTemplateName,
} from "../src/features/workspaces/constants/workspace-templates";
import { hashPassword } from "better-auth/crypto";

const SEED_TAG = "seed";

/**
 * Password for the seeded development accounts. Better Auth stores only a
 * scrypt hash, so this value is hashed on write and never persisted in plain
 * text. Override with SEED_PASSWORD. Sign-in is available only in development
 * because `emailAndPassword` is disabled outside `NODE_ENV=development`.
 */
const DEV_PASSWORD = process.env.SEED_PASSWORD ?? "fintracko-dev";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error(
    "SEED ERROR: DIRECT_URL or DATABASE_URL must be set. See .env.example.",
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production") {
  console.error(
    "SEED ERROR: refusing to run in production. This seed is development-only.",
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

/** Host + database of the connection URL, without credentials, for logging. */
function describeTarget(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return "(unparseable connection URL)";
  }
}

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

function randInt(rng: () => number, min: number, max: number) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[randInt(rng, 0, arr.length - 1)];
}

function money(rng: () => number, min: number, max: number, scale: number) {
  const value = (min + rng() * (max - min)) * scale;
  return value.toFixed(2);
}

/** IDR amounts are scaled up so figures read plausibly in rupiah. */
function currencyScale(currency: string) {
  return currency === "IDR" ? 1000 : 1;
}

interface SeedUser {
  email: string;
  name: string;
  currency: string;
}

const USERS: SeedUser[] = [
  { email: "alice@fintracko.local", name: "Alice Aurora", currency: "IDR" },
  { email: "bob@fintracko.local", name: "Bob Bramantyo", currency: "USD" },
];

const WORKSPACES: {
  owner: string;
  name: string;
  currency: string;
  template: WorkspaceTemplateName;
}[] = [
  {
    owner: "alice@fintracko.local",
    name: "Aurora Personal",
    currency: "IDR",
    template: "PERSONAL",
  },
  {
    owner: "alice@fintracko.local",
    name: "Aurora Studio",
    currency: "IDR",
    template: "SMALL_BUSINESS",
  },
  {
    owner: "bob@fintracko.local",
    name: "Bob Personal",
    currency: "USD",
    template: "PERSONAL",
  },
  {
    owner: "bob@fintracko.local",
    name: "Bob Family",
    currency: "USD",
    template: "FAMILY",
  },
];

/** Cross-workspace collaborations, covering both invitation states. */
const INVITATIONS: {
  workspace: string;
  inviter: string;
  invitee: string;
  status: "ACCEPTED" | "PENDING";
}[] = [
  {
    workspace: "Aurora Studio",
    inviter: "alice@fintracko.local",
    invitee: "bob@fintracko.local",
    status: "ACCEPTED",
  },
  {
    workspace: "Aurora Personal",
    inviter: "alice@fintracko.local",
    invitee: "bob@fintracko.local",
    status: "PENDING",
  },
  {
    workspace: "Bob Personal",
    inviter: "bob@fintracko.local",
    invitee: "alice@fintracko.local",
    status: "ACCEPTED",
  },
  {
    workspace: "Bob Family",
    inviter: "bob@fintracko.local",
    invitee: "alice@fintracko.local",
    status: "PENDING",
  },
];

const ACCOUNT_BLUEPRINTS: {
  name: string;
  type: AccountType;
  usd: number;
}[] = [
  { name: "Checking", type: "CHECKING", usd: 2500 },
  { name: "Savings", type: "SAVINGS", usd: 10000 },
  { name: "Cash", type: "CASH", usd: 300 },
  { name: "Credit Card", type: "CREDIT_CARD", usd: -750 },
  { name: "Digital Wallet", type: "DIGITAL_WALLET", usd: 200 },
  { name: "Investment", type: "INVESTMENT", usd: 5000 },
];

const OTHER_TAGS = ["groceries", "rent", "online", "weekend", "family", "work"];

async function ensureUser(user: SeedUser) {
  const record = await db.user.upsert({
    where: { email: user.email },
    update: { name: user.name, emailVerified: true },
    create: { email: user.email, name: user.name, emailVerified: true },
    select: { id: true },
  });

  await db.profile.upsert({
    where: { userId: record.id },
    update: { currencyPreference: user.currency },
    create: { userId: record.id, currencyPreference: user.currency },
  });

  return record.id;
}

/**
 * Give a seeded user a Better Auth credential account so they can sign in via
 * the development-only email/password form at `/account`.
 */
async function ensureCredentialAccount(userId: string) {
  const password = await hashPassword(DEV_PASSWORD);
  await db.authAccount.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: userId } },
    update: { password },
    create: { providerId: "credential", accountId: userId, userId, password },
  });
}

async function ensureWorkspace(
  ownerId: string,
  name: string,
  currency: string,
  templateName: WorkspaceTemplateName,
): Promise<string> {
  const existing = await db.workspace.findFirst({
    where: { name, members: { some: { userId: ownerId, role: "OWNER" } } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const template = WORKSPACE_TEMPLATES[templateName];

  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name, currency },
    });

    await tx.workspaceMember.create({
      data: { workspaceId: workspace.id, userId: ownerId, role: "OWNER" },
    });

    const categories = await tx.category.createManyAndReturn({
      data: template.categories.map((category) => ({
        workspaceId: workspace.id,
        name: category.name,
        type: category.type,
      })),
    });

    const subCategories: {
      workspaceId: string;
      categoryId: string;
      name: string;
    }[] = [];
    template.categories.forEach((category, index) => {
      for (const sub of category.subCategories) {
        subCategories.push({
          workspaceId: workspace.id,
          categoryId: categories[index].id,
          name: sub.name,
        });
      }
    });
    if (subCategories.length > 0) {
      await tx.subCategory.createMany({ data: subCategories });
    }

    return workspace.id;
  });
}

async function ensureInvitation(
  workspaceId: string,
  inviterId: string,
  inviteeId: string,
  status: "ACCEPTED" | "PENDING",
) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.workspaceInvitation.upsert({
    where: { workspaceId_inviteeId: { workspaceId, inviteeId } },
    update: { inviterId, status, expiresAt },
    create: { workspaceId, inviterId, inviteeId, status, expiresAt },
  });

  if (status === "ACCEPTED") {
    await db.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId, userId: inviteeId } },
      update: { role: "COLLABORATOR" },
      create: { workspaceId, userId: inviteeId, role: "COLLABORATOR" },
    });
  }
}

async function ensureAccounts(workspaceId: string, currency: string) {
  const scale = currencyScale(currency);
  for (const blueprint of ACCOUNT_BLUEPRINTS) {
    await db.financialAccount.upsert({
      where: { workspaceId_name: { workspaceId, name: blueprint.name } },
      update: {},
      create: {
        workspaceId,
        name: blueprint.name,
        type: blueprint.type,
        initialBalance: (blueprint.usd * scale).toFixed(4),
      },
    });
  }
}

async function ensureBudgets(workspaceId: string, currency: string) {
  const existing = await db.budget.count({ where: { workspaceId } });
  if (existing > 0) return;

  const subCategories = await db.subCategory.findMany({
    where: { workspaceId, isArchived: false, category: { type: "EXPENSE" } },
    select: { id: true },
    take: 4,
    orderBy: { name: "asc" },
  });
  if (subCategories.length === 0) return;

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const scale = currencyScale(currency);

  const plans: {
    workspaceId: string;
    subCategoryId: string;
    amount: string;
    interval: BudgetInterval;
    startDate: Date;
    endDate: Date;
  }[] = [];
  subCategories.forEach((sub, index) => {
    const yearly = index % 2 === 1;
    plans.push({
      workspaceId,
      subCategoryId: sub.id,
      amount: (yearly ? 4800 : 400) * scale + "",
      interval: yearly ? "YEARLY" : "MONTHLY",
      startDate: yearly ? yearStart : monthStart,
      endDate: yearly ? yearEnd : monthEnd,
    });
  });

  await db.budget.createMany({ data: plans });
}

async function seedTransactions(workspaceId: string, currency: string) {
  const count = Number(process.env.SEED_COUNT ?? 120);
  const scale = currencyScale(currency);

  const accounts = await db.financialAccount.findMany({
    where: { workspaceId, isArchived: false },
    select: { id: true },
  });
  if (accounts.length === 0) return 0;

  const subCategories = await db.subCategory.findMany({
    where: { workspaceId, isArchived: false, category: { isArchived: false } },
    select: { id: true, category: { select: { type: true } } },
  });
  if (subCategories.length === 0) return 0;

  const byType: Record<string, typeof subCategories> = {
    INCOME: subCategories.filter((s) => s.category.type === "INCOME"),
    EXPENSE: subCategories.filter((s) => s.category.type === "EXPENSE"),
    TRANSFER: subCategories.filter((s) => s.category.type === "TRANSFER"),
  };

  const owner = await db.workspaceMember.findFirst({
    where: { workspaceId, role: "OWNER" },
    select: { userId: true },
  });

  if (process.env.SEED_RESET === "1") {
    const removed = await db.financialTransaction.deleteMany({
      where: { workspaceId, tags: { has: SEED_TAG } },
    });
    console.log(`  reset: removed ${removed.count} seeded transactions`);
  }

  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const rng = makeRng(20261010 + workspaceId.length);

  const rows: Prisma.FinancialTransactionCreateManyInput[] = [];
  for (let i = 0; i < count; i++) {
    const roll = rng();
    let type: TransactionType;
    if (roll < 0.6) type = TransactionType.EXPENSE;
    else if (roll < 0.9) type = TransactionType.INCOME;
    else type = TransactionType.TRANSFER;

    let pool = byType[type];
    if (!pool || pool.length === 0) {
      type = TransactionType.EXPENSE;
      pool = byType.EXPENSE;
    }
    const sub = pick(rng, pool);

    const day = randInt(rng, 1, daysInMonth);
    const date = new Date(Date.UTC(year, month, day));

    let sourceAccountId: string | null = null;
    let destinationAccountId: string | null = null;

    if (type === TransactionType.EXPENSE) {
      sourceAccountId = pick(rng, accounts).id;
    } else if (type === TransactionType.INCOME) {
      destinationAccountId = pick(rng, accounts).id;
    } else {
      const source = pick(rng, accounts);
      let destination = pick(rng, accounts);
      if (accounts.length > 1) {
        while (destination.id === source.id) destination = pick(rng, accounts);
      }
      sourceAccountId = source.id;
      destinationAccountId = destination.id;
    }

    const amount =
      type === TransactionType.INCOME
        ? money(rng, 200, 3000, scale)
        : type === TransactionType.TRANSFER
          ? money(rng, 50, 1500, scale)
          : money(rng, 5, 400, scale);

    rows.push({
      workspaceId,
      type,
      amount,
      subCategoryId: sub.id,
      date,
      sourceAccountId,
      destinationAccountId,
      description: `Seed ${month + 1}/${day}`,
      payeePayer: pick(rng, [
        "ACME",
        "Local Store",
        "Employer",
        "Transfer",
        "Market",
      ]),
      tags: [SEED_TAG, pick(rng, OTHER_TAGS)],
      createdById: owner?.userId ?? null,
    });
  }

  await db.financialTransaction.createMany({ data: rows });
  await recomputeBalances(workspaceId);
  return rows.length;
}

/**
 * Recompute `netTransactionSum` for every account in the workspace from the
 * ledger, mirroring the service `balanceEffect` rules, so the
 * `initialBalance + netTransactionSum` invariant stays exact.
 */
async function recomputeBalances(workspaceId: string) {
  const accounts = await db.financialAccount.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const transactions = await db.financialTransaction.findMany({
    where: { workspaceId },
    select: {
      type: true,
      amount: true,
      sourceAccountId: true,
      destinationAccountId: true,
    },
  });

  const nets = new Map<string, Prisma.Decimal>();
  for (const account of accounts) nets.set(account.id, new Prisma.Decimal(0));

  const add = (id: string | null, delta: Prisma.Decimal) => {
    if (!id || !nets.has(id)) return;
    nets.set(id, nets.get(id)!.add(delta));
  };

  for (const t of transactions) {
    if (t.type === TransactionType.INCOME) {
      add(t.destinationAccountId, t.amount);
    } else if (t.type === TransactionType.EXPENSE) {
      add(t.sourceAccountId, t.amount.negated());
    } else if (t.type === TransactionType.TRANSFER) {
      add(t.sourceAccountId, t.amount.negated());
      add(t.destinationAccountId, t.amount);
    }
  }

  await db.$transaction(
    [...nets.entries()].map(([id, net]) =>
      db.financialAccount.update({
        where: { id },
        data: { netTransactionSum: net },
      }),
    ),
  );
}

async function main() {
  console.log(`Seeding development data into ${describeTarget(connectionString!)}`);

  const userIds = new Map<string, string>();
  for (const user of USERS) {
    const id = await ensureUser(user);
    userIds.set(user.email, id);
    await ensureCredentialAccount(id);
    console.log(`  user ${user.email} (${user.currency})`);
  }

  const workspaceIds = new Map<string, string>();
  for (const ws of WORKSPACES) {
    const ownerId = userIds.get(ws.owner)!;
    const id = await ensureWorkspace(ownerId, ws.name, ws.currency, ws.template);
    workspaceIds.set(ws.name, id);
    await ensureAccounts(id, ws.currency);
    await ensureBudgets(id, ws.currency);
    console.log(`  workspace "${ws.name}" [${ws.currency}]`);
  }

  for (const invitation of INVITATIONS) {
    await ensureInvitation(
      workspaceIds.get(invitation.workspace)!,
      userIds.get(invitation.inviter)!,
      userIds.get(invitation.invitee)!,
      invitation.status,
    );
    console.log(
      `  invitation ${invitation.inviter} -> ${invitation.invitee} on "${invitation.workspace}" (${invitation.status})`,
    );
  }

  let seededTransactions = 0;
  for (const ws of WORKSPACES) {
    const id = workspaceIds.get(ws.name)!;
    seededTransactions += await seedTransactions(id, ws.currency);
  }

  // Kept sequential on purpose: firing these concurrently over Neon's pooler
  // can exhaust the connection pool and surfaces as an opaque driver error.
  const users = await db.user.count();
  const workspaces = await db.workspace.count();
  const members = await db.workspaceMember.count();
  const invitations = await db.workspaceInvitation.count();
  const accounts = await db.financialAccount.count();
  const budgets = await db.budget.count();
  const transactions = await db.financialTransaction.count({
    where: { tags: { has: SEED_TAG } },
  });

  console.log("Seed complete:");
  console.log(`  users=${users} workspaces=${workspaces} members=${members}`);
  console.log(
    `  invitations=${invitations} accounts=${accounts} budgets=${budgets}`,
  );
  console.log(
    `  added ${seededTransactions} transactions this run (seeded total=${transactions})`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("SEED ERROR", error);
    process.exit(1);
  });

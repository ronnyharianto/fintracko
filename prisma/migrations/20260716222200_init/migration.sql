-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ft_auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ft_core";

-- CreateEnum
CREATE TYPE "ft_core"."WorkspaceRole" AS ENUM ('OWNER', 'COLLABORATOR');

-- CreateEnum
CREATE TYPE "ft_core"."CategoryType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ft_core"."TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ft_core"."BudgetInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "ft_core"."Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateTable
CREATE TABLE "ft_auth"."User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_auth"."AuthAccount" (
    "id" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_auth"."Session" (
    "id" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" UUID NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_auth"."Verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_core"."Profile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phoneNumber" TEXT,
    "company" TEXT,
    "bio" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" "ft_core"."Gender",
    "currencyPreference" TEXT NOT NULL DEFAULT 'USD',
    "languagePreference" TEXT NOT NULL DEFAULT 'en',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_core"."Workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_core"."WorkspaceMember" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ft_core"."WorkspaceRole" NOT NULL DEFAULT 'COLLABORATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_core"."FinancialAccount" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "initialBalance" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "netTransactionSum" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_core"."Category" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ft_core"."CategoryType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_core"."SubCategory" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_core"."Budget" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "subCategoryId" UUID NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "interval" "ft_core"."BudgetInterval" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ft_core"."FinancialTransaction" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "type" "ft_core"."TransactionType" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "subCategoryId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sourceAccountId" UUID,
    "destinationAccountId" UUID,
    "description" TEXT,
    "payeePayer" TEXT,
    "tags" TEXT[],
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "ft_auth"."User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "ft_auth"."User"("createdAt");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "ft_auth"."AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_providerId_accountId_key" ON "ft_auth"."AuthAccount"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "ft_auth"."Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "ft_auth"."Session"("userId");

-- CreateIndex
CREATE INDEX "Verification_identifier_idx" ON "ft_auth"."Verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "ft_core"."Profile"("userId");

-- CreateIndex
CREATE INDEX "Workspace_ownerId_idx" ON "ft_core"."Workspace"("ownerId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "ft_core"."WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "ft_core"."WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "ft_core"."WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "FinancialAccount_workspaceId_idx" ON "ft_core"."FinancialAccount"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialAccount_workspaceId_name_key" ON "ft_core"."FinancialAccount"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "Category_workspaceId_type_idx" ON "ft_core"."Category"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "SubCategory_workspaceId_idx" ON "ft_core"."SubCategory"("workspaceId");

-- CreateIndex
CREATE INDEX "SubCategory_categoryId_idx" ON "ft_core"."SubCategory"("categoryId");

-- CreateIndex
CREATE INDEX "Budget_subCategoryId_idx" ON "ft_core"."Budget"("subCategoryId");

-- CreateIndex
CREATE INDEX "Budget_workspaceId_idx" ON "ft_core"."Budget"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_subCategoryId_interval_key" ON "ft_core"."Budget"("subCategoryId", "interval");

-- CreateIndex
CREATE INDEX "FinancialTransaction_workspaceId_type_idx" ON "ft_core"."FinancialTransaction"("workspaceId", "type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_workspaceId_date_idx" ON "ft_core"."FinancialTransaction"("workspaceId", "date");

-- CreateIndex
CREATE INDEX "FinancialTransaction_subCategoryId_idx" ON "ft_core"."FinancialTransaction"("subCategoryId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_sourceAccountId_idx" ON "ft_core"."FinancialTransaction"("sourceAccountId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_destinationAccountId_idx" ON "ft_core"."FinancialTransaction"("destinationAccountId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_payeePayer_idx" ON "ft_core"."FinancialTransaction"("payeePayer");

-- AddForeignKey
ALTER TABLE "ft_auth"."AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ft_auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_auth"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ft_auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ft_auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."Workspace" ADD CONSTRAINT "Workspace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ft_auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ft_core"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "ft_auth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."FinancialAccount" ADD CONSTRAINT "FinancialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ft_core"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."Category" ADD CONSTRAINT "Category_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ft_core"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."SubCategory" ADD CONSTRAINT "SubCategory_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ft_core"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ft_core"."Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."Budget" ADD CONSTRAINT "Budget_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ft_core"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."Budget" ADD CONSTRAINT "Budget_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ft_core"."SubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "ft_core"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ft_core"."SubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_sourceAccountId_fkey" FOREIGN KEY ("sourceAccountId") REFERENCES "ft_core"."FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ft_core"."FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_destinationAccountId_fkey" FOREIGN KEY ("destinationAccountId") REFERENCES "ft_core"."FinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

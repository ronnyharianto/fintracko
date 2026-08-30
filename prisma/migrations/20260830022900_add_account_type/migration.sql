-- CreateEnum
CREATE TYPE "ft_core"."AccountType" AS ENUM ('CHECKING', 'SAVINGS', 'CASH', 'CREDIT_CARD', 'DIGITAL_WALLET', 'INVESTMENT');

-- AlterTable
ALTER TABLE "ft_core"."FinancialAccount" ADD COLUMN     "type" "ft_core"."AccountType" NOT NULL DEFAULT 'CHECKING';

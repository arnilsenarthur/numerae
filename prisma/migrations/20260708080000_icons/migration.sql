-- AlterTable
ALTER TABLE "FinancialGoal" ADD COLUMN IF NOT EXISTS "icon" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "icon" TEXT;

-- AlterTable
ALTER TABLE "RecurringTransaction" ADD COLUMN IF NOT EXISTS "icon" TEXT;

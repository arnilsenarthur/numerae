-- Financial goals + plan view mode
ALTER TABLE "MoneyMap" ADD COLUMN IF NOT EXISTS "viewMode" TEXT NOT NULL DEFAULT 'simple';

CREATE TABLE IF NOT EXISTS "FinancialGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moneyMapId" TEXT,
    "title" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "deadline" TIMESTAMP(3),
    "category" TEXT NOT NULL DEFAULT 'other',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FinancialGoal_userId_active_idx" ON "FinancialGoal"("userId", "active");
CREATE INDEX IF NOT EXISTS "FinancialGoal_moneyMapId_idx" ON "FinancialGoal"("moneyMapId");

ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_moneyMapId_fkey" FOREIGN KEY ("moneyMapId") REFERENCES "MoneyMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

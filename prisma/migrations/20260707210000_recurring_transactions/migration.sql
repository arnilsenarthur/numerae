-- CreateEnum
CREATE TYPE "RecurrenceType" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY', 'YEARLY');

-- AlterTable Transaction: add recurringId
ALTER TABLE "Transaction" ADD COLUMN "recurringId" TEXT;

-- CreateTable RecurringTransaction
CREATE TABLE "RecurringTransaction" (
    "id"               TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "accountId"        TEXT NOT NULL,
    "kind"             "TransactionKind" NOT NULL,
    "amount"           DECIMAL(18,2) NOT NULL,
    "currencyCode"     VARCHAR(8) NOT NULL,
    "category"         TEXT NOT NULL DEFAULT 'other',
    "description"      TEXT NOT NULL,
    "recurrence"       "RecurrenceType" NOT NULL,
    "dayOfPeriod"      INTEGER NOT NULL DEFAULT 1,
    "nextDueAt"        TIMESTAMP(3) NOT NULL,
    "endAt"            TIMESTAMP(3),
    "active"           BOOLEAN NOT NULL DEFAULT true,
    "counterAccountId" TEXT,
    "counterAmount"    DECIMAL(18,2),
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringTransaction_userId_active_idx" ON "RecurringTransaction"("userId", "active");
CREATE INDEX "RecurringTransaction_nextDueAt_idx" ON "RecurringTransaction"("nextDueAt");
CREATE INDEX "Transaction_recurringId_idx" ON "Transaction"("recurringId");

-- AddForeignKey RecurringTransaction
ALTER TABLE "RecurringTransaction"
    ADD CONSTRAINT "RecurringTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringTransaction"
    ADD CONSTRAINT "RecurringTransaction_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringTransaction"
    ADD CONSTRAINT "RecurringTransaction_counterAccountId_fkey"
    FOREIGN KEY ("counterAccountId") REFERENCES "FinancialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey Transaction.recurringId
ALTER TABLE "Transaction"
    ADD CONSTRAINT "Transaction_recurringId_fkey"
    FOREIGN KEY ("recurringId") REFERENCES "RecurringTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

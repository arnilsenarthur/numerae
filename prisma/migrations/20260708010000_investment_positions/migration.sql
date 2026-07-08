-- CreateEnum
CREATE TYPE "InvestmentEntryKind" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BALANCE_UPDATE');

-- CreateTable
CREATE TABLE "InvestmentPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetSymbol" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "currencyCode" VARCHAR(8) NOT NULL DEFAULT 'BRL',
    "institution" TEXT,
    "color" TEXT,
    "currentBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentEntry" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "kind" "InvestmentEntryKind" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balance" DECIMAL(18,2),
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvestmentEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentPosition_userId_archived_idx" ON "InvestmentPosition"("userId", "archived");

-- CreateIndex
CREATE INDEX "InvestmentEntry_positionId_date_idx" ON "InvestmentEntry"("positionId", "date");

-- AddForeignKey
ALTER TABLE "InvestmentPosition" ADD CONSTRAINT "InvestmentPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentEntry" ADD CONSTRAINT "InvestmentEntry_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "InvestmentPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

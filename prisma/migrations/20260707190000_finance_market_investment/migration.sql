-- Controle financeiro, mercado e planos de investimento

CREATE TYPE "FinancialAccountKind" AS ENUM ('CHECKING', 'SAVINGS', 'INVESTMENT', 'CREDIT_CARD', 'CASH', 'OTHER');
CREATE TYPE "TransactionKind" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE "MarketAssetKind" AS ENUM ('STOCK', 'ETF', 'FII', 'CRYPTO', 'INDEX', 'COMMODITY');

ALTER TABLE "InstitutionProduct"
  ADD COLUMN "annualRatePercent" DECIMAL(8,4),
  ADD COLUMN "riskLevel" TEXT;

CREATE TABLE "FinancialAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "institutionId" TEXT,
  "name" TEXT NOT NULL,
  "kind" "FinancialAccountKind" NOT NULL DEFAULT 'CHECKING',
  "currencyCode" VARCHAR(8) NOT NULL,
  "countryCode" CHAR(2) NOT NULL DEFAULT 'BR',
  "initialBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "color" TEXT,
  "icon" TEXT,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "FinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialAccount_userId_archived_idx" ON "FinancialAccount"("userId", "archived");

ALTER TABLE "FinancialAccount"
  ADD CONSTRAINT "FinancialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FinancialAccount"
  ADD CONSTRAINT "FinancialAccount_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Transaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "kind" "TransactionKind" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL,
  "currencyCode" VARCHAR(8) NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'other',
  "description" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "counterAccountId" TEXT,
  "counterAmount" DECIMAL(18,2),
  "planEntryId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");
CREATE INDEX "Transaction_userId_category_idx" ON "Transaction"("userId", "category");

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MarketAsset" (
  "id" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "MarketAssetKind" NOT NULL DEFAULT 'STOCK',
  "exchange" TEXT,
  "currencyCode" VARCHAR(8) NOT NULL DEFAULT 'USD',
  "countryCode" CHAR(2),
  "logoUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "price" DECIMAL(18,6),
  "priceUpdatedAt" TIMESTAMP(3),
  "priceTtlSeconds" INTEGER NOT NULL DEFAULT 3600,
  "changePercent" DECIMAL(10,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MarketAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketAsset_symbol_key" ON "MarketAsset"("symbol");
CREATE INDEX "MarketAsset_kind_active_idx" ON "MarketAsset"("kind", "active");

CREATE TABLE "MarketQuote" (
  "id" TEXT NOT NULL,
  "assetId" TEXT NOT NULL,
  "price" DECIMAL(18,6) NOT NULL,
  "quotedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MarketQuote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketQuote_assetId_quotedAt_key" ON "MarketQuote"("assetId", "quotedAt");
CREATE INDEX "MarketQuote_assetId_quotedAt_idx" ON "MarketQuote"("assetId", "quotedAt");

ALTER TABLE "MarketQuote"
  ADD CONSTRAINT "MarketQuote_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "MarketAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "InvestmentPlan" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "currencyCode" VARCHAR(8) NOT NULL DEFAULT 'BRL',
  "initialAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "monthlyDeposit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "horizonMonths" INTEGER NOT NULL DEFAULT 60,
  "riskProfile" TEXT NOT NULL DEFAULT 'moderate',
  "targetAmount" DECIMAL(18,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InvestmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvestmentPlan_userId_active_idx" ON "InvestmentPlan"("userId", "active");

ALTER TABLE "InvestmentPlan"
  ADD CONSTRAINT "InvestmentPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

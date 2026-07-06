-- CreateEnum
CREATE TYPE "InstitutionType" AS ENUM ('BANK', 'FINTECH', 'BROKER', 'REMITTANCE', 'EXCHANGE', 'OTHER');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InstitutionType" NOT NULL DEFAULT 'OTHER',
    "countryCode" TEXT NOT NULL,
    "website" TEXT,
    "logoUrl" TEXT,
    "brandColor" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionExchangeRate" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "fromCurrency" CHAR(3) NOT NULL,
    "toCurrency" CHAR(3) NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "spreadPercent" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "feeFixed" DECIMAL(12,2),
    "feePercent" DECIMAL(8,4),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE INDEX "Institution_type_idx" ON "Institution"("type");

-- CreateIndex
CREATE INDEX "Institution_countryCode_idx" ON "Institution"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionExchangeRate_institutionId_fromCurrency_toCurrency_key" ON "InstitutionExchangeRate"("institutionId", "fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "InstitutionExchangeRate_institutionId_idx" ON "InstitutionExchangeRate"("institutionId");

-- AddForeignKey
ALTER TABLE "InstitutionExchangeRate" ADD CONSTRAINT "InstitutionExchangeRate_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

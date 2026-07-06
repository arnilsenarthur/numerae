-- AlterTable
ALTER TABLE "Currency" ADD COLUMN "usdRate" DECIMAL(18,8),
ADD COLUMN "usdRateUpdatedAt" TIMESTAMP(3),
ADD COLUMN "usdRateTtlSeconds" INTEGER NOT NULL DEFAULT 86400;

-- USD is always 1
UPDATE "Currency" SET "usdRate" = 1, "usdRateUpdatedAt" = CURRENT_TIMESTAMP WHERE "code" = 'USD';

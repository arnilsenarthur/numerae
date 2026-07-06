UPDATE "Currency" SET "usdRateTtlSeconds" = 3600;
ALTER TABLE "Currency" ALTER COLUMN "usdRateTtlSeconds" SET DEFAULT 3600;

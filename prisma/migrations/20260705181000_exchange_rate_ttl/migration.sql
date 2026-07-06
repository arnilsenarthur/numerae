-- TTL de 1h para taxa e spread de câmbio institucional
ALTER TABLE "InstitutionExchangeRate"
ADD COLUMN "rateUpdatedAt" TIMESTAMP(3),
ADD COLUMN "rateTtlSeconds" INTEGER NOT NULL DEFAULT 3600,
ADD COLUMN "spreadUpdatedAt" TIMESTAMP(3),
ADD COLUMN "spreadTtlSeconds" INTEGER NOT NULL DEFAULT 3600;

UPDATE "InstitutionExchangeRate"
SET
  "rateUpdatedAt" = "updatedAt",
  "spreadUpdatedAt" = "updatedAt";

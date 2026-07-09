ALTER TABLE "FinancialAccount" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Mark the oldest active account per user as default
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC) AS rn
  FROM "FinancialAccount"
  WHERE archived = false
)
UPDATE "FinancialAccount" AS fa
SET "isDefault" = true
FROM ranked AS r
WHERE fa.id = r.id AND r.rn = 1;

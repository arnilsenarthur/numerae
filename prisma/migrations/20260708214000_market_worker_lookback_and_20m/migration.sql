ALTER TABLE "Worker"
ADD COLUMN "historyLookbackDays" INTEGER;

UPDATE "Worker"
SET "historyLookbackDays" = 400
WHERE "id" = 'market_quotes'
  AND "historyLookbackDays" IS NULL;

UPDATE "Worker"
SET "intervalSeconds" = 1200
WHERE "id" = 'market_quotes';

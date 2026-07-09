-- Update market quotes worker cadence to every 10 minutes.
-- Keep existing custom intervals untouched.
UPDATE "Worker"
SET "intervalSeconds" = 600
WHERE "id" = 'market_quotes'
  AND "intervalSeconds" = 3600;

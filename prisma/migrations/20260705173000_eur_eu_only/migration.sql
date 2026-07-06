-- Pan-European EUR only; country-specific euro rows stay in DB but inactive.
UPDATE "Currency"
SET "active" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'EUR' AND "countryCode" <> 'EU';

UPDATE "Currency"
SET "active" = true, "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'cur_eur_eu';

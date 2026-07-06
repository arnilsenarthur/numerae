-- União Europeia + Euro canônico (evita duplicatas EUR por país na UI)
INSERT INTO "Country" ("code", "name", "active", "updatedAt") VALUES
('EU', 'União Europeia', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "active" = EXCLUDED."active",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "Currency" ("id", "code", "name", "countryCode", "symbol", "active", "updatedAt") VALUES
('cur_eur_eu', 'EUR', 'Euro', 'EU', '€', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "code" = EXCLUDED."code",
  "name" = EXCLUDED."name",
  "countryCode" = EXCLUDED."countryCode",
  "symbol" = EXCLUDED."symbol",
  "active" = EXCLUDED."active",
  "updatedAt" = CURRENT_TIMESTAMP;

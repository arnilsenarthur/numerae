-- CreateTable
CREATE TABLE IF NOT EXISTS "Country" (
    "code" CHAR(2) NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- Seed countries (must exist before institution FK)
INSERT INTO "Country" ("code", "name", "active", "updatedAt") VALUES
('BR', 'Brasil', true, CURRENT_TIMESTAMP),
('US', 'Estados Unidos', true, CURRENT_TIMESTAMP),
('GB', 'Reino Unido', true, CURRENT_TIMESTAMP),
('CA', 'Canadá', true, CURRENT_TIMESTAMP),
('AU', 'Austrália', true, CURRENT_TIMESTAMP),
('DE', 'Alemanha', true, CURRENT_TIMESTAMP),
('FR', 'França', true, CURRENT_TIMESTAMP),
('PT', 'Portugal', true, CURRENT_TIMESTAMP),
('ES', 'Espanha', true, CURRENT_TIMESTAMP),
('IT', 'Itália', true, CURRENT_TIMESTAMP),
('NL', 'Países Baixos', true, CURRENT_TIMESTAMP),
('CH', 'Suíça', true, CURRENT_TIMESTAMP),
('MX', 'México', true, CURRENT_TIMESTAMP),
('AR', 'Argentina', true, CURRENT_TIMESTAMP),
('CL', 'Chile', true, CURRENT_TIMESTAMP),
('CO', 'Colômbia', true, CURRENT_TIMESTAMP),
('JP', 'Japão', true, CURRENT_TIMESTAMP),
('SG', 'Singapura', true, CURRENT_TIMESTAMP),
('HK', 'Hong Kong', true, CURRENT_TIMESTAMP),
('AE', 'Emirados Árabes', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Currency" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "symbol" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Country_active_idx" ON "Country"("active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Currency_countryCode_idx" ON "Currency"("countryCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Currency_code_countryCode_key" ON "Currency"("code", "countryCode");

-- Ensure currency code column fits USDT/USDC
ALTER TABLE "Currency" ALTER COLUMN "code" TYPE VARCHAR(8);

-- Widen exchange rate currency columns for codes like USDT
ALTER TABLE "InstitutionExchangeRate" ALTER COLUMN "fromCurrency" TYPE VARCHAR(8);
ALTER TABLE "InstitutionExchangeRate" ALTER COLUMN "toCurrency" TYPE VARCHAR(8);

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "Institution" ADD CONSTRAINT "Institution_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Currency" ADD CONSTRAINT "Currency_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Seed currencies (linked to country)
INSERT INTO "Currency" ("id", "code", "name", "countryCode", "symbol", "active", "updatedAt") VALUES
('cur_brl', 'BRL', 'Real brasileiro', 'BR', 'R$', true, CURRENT_TIMESTAMP),
('cur_usd', 'USD', 'Dólar americano', 'US', '$', true, CURRENT_TIMESTAMP),
('cur_eur_de', 'EUR', 'Euro', 'DE', '€', true, CURRENT_TIMESTAMP),
('cur_eur_pt', 'EUR', 'Euro', 'PT', '€', true, CURRENT_TIMESTAMP),
('cur_eur_fr', 'EUR', 'Euro', 'FR', '€', true, CURRENT_TIMESTAMP),
('cur_gbp', 'GBP', 'Libra esterlina', 'GB', '£', true, CURRENT_TIMESTAMP),
('cur_cad', 'CAD', 'Dólar canadense', 'CA', 'CA$', true, CURRENT_TIMESTAMP),
('cur_aud', 'AUD', 'Dólar australiano', 'AU', 'A$', true, CURRENT_TIMESTAMP),
('cur_chf', 'CHF', 'Franco suíço', 'CH', 'CHF', true, CURRENT_TIMESTAMP),
('cur_jpy', 'JPY', 'Iene japonês', 'JP', '¥', true, CURRENT_TIMESTAMP),
('cur_mxn', 'MXN', 'Peso mexicano', 'MX', '$', true, CURRENT_TIMESTAMP),
('cur_ars', 'ARS', 'Peso argentino', 'AR', '$', true, CURRENT_TIMESTAMP),
('cur_clp', 'CLP', 'Peso chileno', 'CL', '$', true, CURRENT_TIMESTAMP),
('cur_cop', 'COP', 'Peso colombiano', 'CO', '$', true, CURRENT_TIMESTAMP),
('cur_sgd', 'SGD', 'Dólar de Singapura', 'SG', 'S$', true, CURRENT_TIMESTAMP),
('cur_hkd', 'HKD', 'Dólar de Hong Kong', 'HK', 'HK$', true, CURRENT_TIMESTAMP),
('cur_aed', 'AED', 'Dirham dos EAU', 'AE', 'د.إ', true, CURRENT_TIMESTAMP),
('cur_usdt', 'USDT', 'Tether (USDT)', 'US', 'USDT', true, CURRENT_TIMESTAMP),
('cur_usdc', 'USDC', 'USD Coin (USDC)', 'US', 'USDC', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

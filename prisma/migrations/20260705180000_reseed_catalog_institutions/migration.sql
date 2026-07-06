-- Reseed: catálogo (países/moedas) + instituições BR/internacionais + pares BRL/USD/EUR
-- Referência (jul/2026): USD/BRL=5.40, EUR/USD=1.08, EUR/BRL=5.832

DELETE FROM "AdminAuditLog"
WHERE "entityType" IN (
  'institution',
  'exchange_rate',
  'institution_product',
  'country',
  'currency'
);

DELETE FROM "InstitutionProduct";
DELETE FROM "InstitutionExchangeRate";
DELETE FROM "Institution";
DELETE FROM "Currency";
DELETE FROM "Country";

INSERT INTO "Country" ("code", "name", "active", "updatedAt") VALUES
('BR', 'Brasil', true, CURRENT_TIMESTAMP),
('US', 'Estados Unidos', true, CURRENT_TIMESTAMP),
('EU', 'União Europeia', true, CURRENT_TIMESTAMP),
('GB', 'Reino Unido', true, CURRENT_TIMESTAMP),
('PT', 'Portugal', true, CURRENT_TIMESTAMP),
('DE', 'Alemanha', true, CURRENT_TIMESTAMP),
('CA', 'Canadá', true, CURRENT_TIMESTAMP),
('CH', 'Suíça', true, CURRENT_TIMESTAMP),
('MX', 'México', true, CURRENT_TIMESTAMP),
('AR', 'Argentina', true, CURRENT_TIMESTAMP),
('AU', 'Austrália', true, CURRENT_TIMESTAMP),
('JP', 'Japão', true, CURRENT_TIMESTAMP),
('SG', 'Singapura', true, CURRENT_TIMESTAMP),
('HK', 'Hong Kong', true, CURRENT_TIMESTAMP),
('AE', 'Emirados Árabes', true, CURRENT_TIMESTAMP);

INSERT INTO "Currency" (
  "id", "code", "name", "countryCode", "symbol",
  "usdRate", "usdRateUpdatedAt", "usdRateTtlSeconds", "active", "updatedAt"
) VALUES
('cur_brl', 'BRL', 'Real brasileiro', 'BR', 'R$', 0.18518519, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_usd', 'USD', 'Dólar americano', 'US', '$', 1.00000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_eur', 'EUR', 'Euro', 'EU', '€', 1.08000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_gbp', 'GBP', 'Libra esterlina', 'GB', '£', 1.27000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_cad', 'CAD', 'Dólar canadense', 'CA', 'CA$', 0.74000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_chf', 'CHF', 'Franco suíço', 'CH', 'CHF', 1.12000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_mxn', 'MXN', 'Peso mexicano', 'MX', '$', 0.05400000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_ars', 'ARS', 'Peso argentino', 'AR', '$', 0.00110000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_aud', 'AUD', 'Dólar australiano', 'AU', 'A$', 0.66000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_jpy', 'JPY', 'Iene japonês', 'JP', '¥', 0.00670000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_sgd', 'SGD', 'Dólar de Singapura', 'SG', 'S$', 0.74000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_hkd', 'HKD', 'Dólar de Hong Kong', 'HK', 'HK$', 0.12800000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_aed', 'AED', 'Dirham dos EAU', 'AE', 'د.إ', 0.27200000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_usdt', 'USDT', 'Tether (USDT)', 'US', 'USDT', 1.00000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP),
('cur_usdc', 'USDC', 'USD Coin (USDC)', 'US', 'USDC', 1.00000000, CURRENT_TIMESTAMP, 3600, true, CURRENT_TIMESTAMP);

INSERT INTO "Institution" (
  "id", "slug", "name", "type", "countryCode",
  "website", "brandColor", "description", "active", "updatedAt"
) VALUES
('inst_nubank', 'nubank', 'Nubank', 'FINTECH', 'BR', 'https://nubank.com.br', '#820AD1', 'Fintech brasileira — conta, cartão e investimentos.', true, CURRENT_TIMESTAMP),
('inst_inter', 'inter', 'Banco Inter', 'FINTECH', 'BR', 'https://bancointer.com.br', '#FF7A00', 'Banco digital com conta global e câmbio.', true, CURRENT_TIMESTAMP),
('inst_c6', 'c6', 'C6 Bank', 'FINTECH', 'BR', 'https://c6bank.com.br', '#242424', 'Banco digital C6.', true, CURRENT_TIMESTAMP),
('inst_btg', 'btg', 'BTG Pactual', 'BANK', 'BR', 'https://www.btgpactual.com', '#001E61', 'Banco de investimento.', true, CURRENT_TIMESTAMP),
('inst_itau', 'itau', 'Itaú Unibanco', 'BANK', 'BR', 'https://www.itau.com.br', '#EC7000', 'Maior banco privado do Brasil.', true, CURRENT_TIMESTAMP),
('inst_xp', 'xp', 'XP Investimentos', 'BROKER', 'BR', 'https://www.xpi.com.br', '#000000', 'Corretora e gestora de investimentos.', true, CURRENT_TIMESTAMP),
('inst_avenue', 'avenue', 'Avenue', 'BROKER', 'BR', 'https://avenue.us', '#00B140', 'Corretora para investir nos EUA.', true, CURRENT_TIMESTAMP),
('inst_nomad', 'nomad', 'Nomad', 'FINTECH', 'BR', 'https://nomadglobal.com', '#111111', 'Conta global em dólar.', true, CURRENT_TIMESTAMP),
('inst_wise', 'wise', 'Wise', 'REMITTANCE', 'GB', 'https://wise.com', '#9FE870', 'Transferências internacionais e multi-moeda.', true, CURRENT_TIMESTAMP),
('inst_revolut', 'revolut', 'Revolut', 'FINTECH', 'GB', 'https://revolut.com', '#0075EB', 'Super app financeira global.', true, CURRENT_TIMESTAMP),
('inst_ibkr', 'interactive-brokers', 'Interactive Brokers', 'BROKER', 'US', 'https://www.interactivebrokers.com', '#D81222', 'Corretora global.', true, CURRENT_TIMESTAMP),
('inst_schwab', 'charles-schwab', 'Charles Schwab', 'BROKER', 'US', 'https://www.schwab.com', '#00A0DF', 'Corretora americana.', true, CURRENT_TIMESTAMP);

-- rate = unidades da moeda destino por 1 unidade da origem; spreadPercent = markup institucional
INSERT INTO "InstitutionExchangeRate" (
  "id", "institutionId", "fromCurrency", "toCurrency",
  "rate", "spreadPercent", "notes", "active", "updatedAt"
)
SELECT
  'rate_' || i.slug || '_' || lower(p.fc) || '_' || lower(p.tc),
  i.id,
  p.fc,
  p.tc,
  p.rate,
  s.spread,
  p.note,
  true,
  CURRENT_TIMESTAMP
FROM (VALUES
  ('inst_nubank', 1.50),
  ('inst_inter', 1.20),
  ('inst_c6', 1.50),
  ('inst_btg', 2.80),
  ('inst_itau', 3.00),
  ('inst_xp', 1.80),
  ('inst_avenue', 1.50),
  ('inst_nomad', 1.20),
  ('inst_wise', 0.35),
  ('inst_revolut', 0.50),
  ('inst_ibkr', 1.80),
  ('inst_schwab', 1.80)
) AS s(inst_id, spread)
JOIN "Institution" i ON i.id = s.inst_id
CROSS JOIN (VALUES
  ('USD', 'BRL', 5.40000000::numeric, 'Taxa comercial USD/BRL'),
  ('BRL', 'USD', 0.18518519::numeric, 'Taxa comercial BRL/USD'),
  ('EUR', 'BRL', 5.83200000::numeric, 'Taxa comercial EUR/BRL'),
  ('BRL', 'EUR', 0.17146776::numeric, 'Taxa comercial BRL/EUR'),
  ('USD', 'EUR', 0.92592593::numeric, 'Taxa comercial USD/EUR'),
  ('EUR', 'USD', 1.08000000::numeric, 'Taxa comercial EUR/USD')
) AS p(fc, tc, rate, note);

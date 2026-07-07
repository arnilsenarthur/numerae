-- Seed inicial de ativos de mercado (B3, EUA, cripto, índices)

INSERT INTO "MarketAsset" ("id", "symbol", "name", "kind", "exchange", "currencyCode", "countryCode", "active", "priceTtlSeconds", "updatedAt")
VALUES
  -- Ações B3
  ('ma_petr4',  'PETR4',  'Petrobras PN',            'STOCK', 'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_vale3',  'VALE3',  'Vale ON',                 'STOCK', 'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_itub4',  'ITUB4',  'Itaú Unibanco PN',        'STOCK', 'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_bbas3',  'BBAS3',  'Banco do Brasil ON',      'STOCK', 'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_bbdc4',  'BBDC4',  'Bradesco PN',             'STOCK', 'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_wege3',  'WEGE3',  'WEG ON',                  'STOCK', 'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_abev3',  'ABEV3',  'Ambev ON',                'STOCK', 'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_b3sa3',  'B3SA3',  'B3 ON',                   'STOCK', 'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),

  -- ETFs B3
  ('ma_bova11', 'BOVA11', 'iShares Ibovespa',        'ETF',   'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_ivvb11', 'IVVB11', 'iShares S&P 500 BRL',     'ETF',   'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),

  -- FIIs
  ('ma_mxrf11', 'MXRF11', 'Maxi Renda FII',          'FII',   'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_hglg11', 'HGLG11', 'CSHG Logística FII',      'FII',   'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),
  ('ma_knri11', 'KNRI11', 'Kinea Renda Imobiliária', 'FII',   'B3', 'BRL', 'BR', true, 3600, CURRENT_TIMESTAMP),

  -- Ações EUA
  ('ma_aapl',   'AAPL',   'Apple',                   'STOCK', 'NASDAQ', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),
  ('ma_msft',   'MSFT',   'Microsoft',               'STOCK', 'NASDAQ', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),
  ('ma_googl',  'GOOGL',  'Alphabet',                'STOCK', 'NASDAQ', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),
  ('ma_amzn',   'AMZN',   'Amazon',                  'STOCK', 'NASDAQ', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),
  ('ma_nvda',   'NVDA',   'NVIDIA',                  'STOCK', 'NASDAQ', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),
  ('ma_meta',   'META',   'Meta Platforms',          'STOCK', 'NASDAQ', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),
  ('ma_tsla',   'TSLA',   'Tesla',                   'STOCK', 'NASDAQ', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),

  -- ETFs EUA
  ('ma_spy',    'SPY',    'SPDR S&P 500',            'ETF',   'NYSE', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),
  ('ma_voo',    'VOO',    'Vanguard S&P 500',        'ETF',   'NYSE', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),
  ('ma_qqq',    'QQQ',    'Invesco QQQ (Nasdaq-100)','ETF',   'NASDAQ', 'USD', 'US', true, 3600, CURRENT_TIMESTAMP),

  -- Cripto
  ('ma_btc',    'BTC',    'Bitcoin',                 'CRYPTO', NULL, 'USD', NULL, true, 3600, CURRENT_TIMESTAMP),
  ('ma_eth',    'ETH',    'Ethereum',                'CRYPTO', NULL, 'USD', NULL, true, 3600, CURRENT_TIMESTAMP),
  ('ma_sol',    'SOL',    'Solana',                  'CRYPTO', NULL, 'USD', NULL, true, 3600, CURRENT_TIMESTAMP),
  ('ma_xrp',    'XRP',    'XRP',                     'CRYPTO', NULL, 'USD', NULL, true, 3600, CURRENT_TIMESTAMP),
  ('ma_doge',   'DOGE',   'Dogecoin',                'CRYPTO', NULL, 'USD', NULL, true, 3600, CURRENT_TIMESTAMP),

  -- Índices
  ('ma_spx',    '^SPX',   'S&P 500',                 'INDEX', NULL, 'USD', 'US', true, 3600, CURRENT_TIMESTAMP)
ON CONFLICT ("symbol") DO NOTHING;

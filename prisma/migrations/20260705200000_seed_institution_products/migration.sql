-- Produtos/contas por instituição (reseed não incluía produtos)
INSERT INTO "InstitutionProduct" (
  "id", "institutionId", "name", "slug", "kind", "currencyCode", "description", "active", "updatedAt"
) VALUES
-- Nubank
('prod_nubank_conta', 'inst_nubank', 'Conta digital', 'conta-digital', 'CHECKING', 'BRL', 'Conta corrente sem tarifa.', true, CURRENT_TIMESTAMP),
('prod_nubank_cartao', 'inst_nubank', 'Cartão de crédito', 'cartao-credito', 'CREDIT', 'BRL', 'Cartão Mastercard internacional.', true, CURRENT_TIMESTAMP),
('prod_nubank_invest', 'inst_nubank', 'NuInvest', 'nuinvest', 'INVESTMENT', 'BRL', 'Corretora integrada ao app.', true, CURRENT_TIMESTAMP),
('prod_nubank_cofrinho', 'inst_nubank', 'Cofrinho', 'cofrinho', 'SAVINGS', 'BRL', 'Reserva com rendimento CDI.', true, CURRENT_TIMESTAMP),

-- Inter
('prod_inter_conta', 'inst_inter', 'Conta digital', 'conta-digital', 'CHECKING', 'BRL', 'Conta completa com cashback.', true, CURRENT_TIMESTAMP),
('prod_inter_global', 'inst_inter', 'Conta Global', 'conta-global', 'CHECKING', 'USD', 'Conta em dólar para viagens e remessas.', true, CURRENT_TIMESTAMP),
('prod_inter_invest', 'inst_inter', 'Inter Invest', 'inter-invest', 'INVESTMENT', 'BRL', 'Renda fixa, fundos e ações.', true, CURRENT_TIMESTAMP),
('prod_inter_cambio', 'inst_inter', 'Câmbio', 'cambio', 'PAYMENT', 'BRL', 'Conversão BRL/USD integrada.', true, CURRENT_TIMESTAMP),

-- C6 Bank
('prod_c6_conta', 'inst_c6', 'Conta C6', 'conta-c6', 'CHECKING', 'BRL', 'Conta digital C6 Bank.', true, CURRENT_TIMESTAMP),
('prod_c6_cartao', 'inst_c6', 'Cartão C6 Carbon', 'cartao-carbon', 'CREDIT', 'BRL', 'Cartão premium com pontos.', true, CURRENT_TIMESTAMP),
('prod_c6_invest', 'inst_c6', 'C6 Invest', 'c6-invest', 'INVESTMENT', 'BRL', 'Investimentos no app.', true, CURRENT_TIMESTAMP),

-- BTG
('prod_btg_conta', 'inst_btg', 'Conta BTG', 'conta-btg', 'CHECKING', 'BRL', 'Conta banking BTG.', true, CURRENT_TIMESTAMP),
('prod_btg_invest', 'inst_btg', 'BTG Investimentos', 'btg-invest', 'INVESTMENT', 'BRL', 'Plataforma de investimentos.', true, CURRENT_TIMESTAMP),
('prod_btg_cartao', 'inst_btg', 'Cartão BTG', 'cartao-btg', 'CREDIT', 'BRL', 'Cartão de crédito BTG.', true, CURRENT_TIMESTAMP),

-- Itaú
('prod_itau_conta', 'inst_itau', 'Conta corrente', 'conta-corrente', 'CHECKING', 'BRL', 'Conta corrente tradicional.', true, CURRENT_TIMESTAMP),
('prod_itau_poupanca', 'inst_itau', 'Poupança', 'poupanca', 'SAVINGS', 'BRL', 'Conta poupança.', true, CURRENT_TIMESTAMP),
('prod_itau_cartao', 'inst_itau', 'Cartão de crédito', 'cartao-credito', 'CREDIT', 'BRL', 'Cartões Itaú Personnalité e outros.', true, CURRENT_TIMESTAMP),
('prod_itau_invest', 'inst_itau', 'Itaú Invest', 'itau-invest', 'INVESTMENT', 'BRL', 'Investimentos e previdência.', true, CURRENT_TIMESTAMP),

-- XP
('prod_xp_conta', 'inst_xp', 'Conta XP', 'conta-xp', 'INVESTMENT', 'BRL', 'Conta de investimentos.', true, CURRENT_TIMESTAMP),
('prod_xp_usd', 'inst_xp', 'Conta internacional', 'conta-internacional', 'INVESTMENT', 'USD', 'Investimentos em dólar.', true, CURRENT_TIMESTAMP),
('prod_xp_cartao', 'inst_xp', 'Cartão XP', 'cartao-xp', 'CREDIT', 'BRL', 'Cartão de crédito XP.', true, CURRENT_TIMESTAMP),

-- Avenue
('prod_avenue_us', 'inst_avenue', 'Conta EUA', 'conta-eua', 'INVESTMENT', 'USD', 'Corretagem nos Estados Unidos.', true, CURRENT_TIMESTAMP),
('prod_avenue_br', 'inst_avenue', 'Conta Brasil', 'conta-brasil', 'CHECKING', 'BRL', 'Conta de custódia no Brasil.', true, CURRENT_TIMESTAMP),

-- Nomad
('prod_nomad_global', 'inst_nomad', 'Conta global USD', 'conta-global-usd', 'CHECKING', 'USD', 'Conta em dólar para brasileiros.', true, CURRENT_TIMESTAMP),
('prod_nomad_cartao', 'inst_nomad', 'Cartão Nomad', 'cartao-nomad', 'PAYMENT', 'USD', 'Cartão de débito internacional.', true, CURRENT_TIMESTAMP),

-- Wise
('prod_wise_conta', 'inst_wise', 'Conta Wise', 'conta-wise', 'CHECKING', NULL, 'Conta multi-moeda (40+ moedas).', true, CURRENT_TIMESTAMP),
('prod_wise_transfer', 'inst_wise', 'Transferências', 'transferencias', 'PAYMENT', NULL, 'Remessas internacionais.', true, CURRENT_TIMESTAMP),

-- Revolut
('prod_revolut_conta', 'inst_revolut', 'Conta Revolut', 'conta-revolut', 'CHECKING', 'EUR', 'Conta corrente multi-moeda.', true, CURRENT_TIMESTAMP),
('prod_revolut_cartao', 'inst_revolut', 'Cartão Revolut', 'cartao-revolut', 'PAYMENT', NULL, 'Cartão débito/crédito global.', true, CURRENT_TIMESTAMP),
('prod_revolut_invest', 'inst_revolut', 'Revolut Invest', 'revolut-invest', 'INVESTMENT', 'USD', 'Ações e cripto.', true, CURRENT_TIMESTAMP),

-- Interactive Brokers
('prod_ibkr_conta', 'inst_ibkr', 'Conta corretagem', 'conta-corretagem', 'INVESTMENT', 'USD', 'Conta global de corretagem.', true, CURRENT_TIMESTAMP),
('prod_ibkr_margin', 'inst_ibkr', 'Conta margin', 'conta-margin', 'INVESTMENT', 'USD', 'Conta com alavancagem.', true, CURRENT_TIMESTAMP),

-- Charles Schwab
('prod_schwab_brokerage', 'inst_schwab', 'Brokerage Account', 'brokerage', 'INVESTMENT', 'USD', 'Conta de investimentos nos EUA.', true, CURRENT_TIMESTAMP),
('prod_schwab_checking', 'inst_schwab', 'Schwab Bank Checking', 'checking', 'CHECKING', 'USD', 'Conta corrente vinculada.', true, CURRENT_TIMESTAMP);

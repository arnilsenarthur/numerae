-- Repopulate tips with verifiable sources (direct quotes or official text)
DELETE FROM "Tip";

INSERT INTO "Tip" (
  "id", "quote", "author", "category", "sourceUrl", "sourceLabel", "active", "sortOrder", "createdAt", "updatedAt"
) VALUES
(
  'tip_001',
  'Antes de mais nada, a primeira coisa que você precisa compor é uma reserva estratégica — para não vender investimentos quando surgir um imprevisto.',
  'Raul Sardinha',
  'saving',
  'https://www.youtube.com/watch?v=bOEmfru9qTQ&t=52',
  'YouTube — Onde deixar sua reserva de emergência (0:52)',
  true, 0, '2026-01-01 10:00:00', '2026-01-01 10:00:00'
),
(
  'tip_002',
  'A reserva deve cobrir de 6 a 12 meses do seu custo fixo — não do salário inteiro.',
  'Raul Sardinha',
  'saving',
  'https://www.youtube.com/watch?v=bOEmfru9qTQ&t=75',
  'YouTube — Onde deixar sua reserva de emergência (1:15)',
  true, 0, '2026-01-02 10:00:00', '2026-01-02 10:00:00'
),
(
  'tip_003',
  'Ganhos líquidos em ações vendidas no mercado à vista são isentos quando o total de vendas no mês é de até R$ 20.000,00.',
  'Receita Federal',
  'taxes',
  'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/isencoes',
  'Receita Federal — Isenções em bolsa',
  true, 0, '2026-01-03 10:00:00', '2026-01-03 10:00:00'
),
(
  'tip_004',
  'Acima do limite de isenção, o ganho líquido em ações comuns é tributado a 15%; em day trade, a alíquota é de 20%.',
  'Receita Federal',
  'taxes',
  'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/calculo-e-pagamento-do-imposto',
  'Receita Federal — Cálculo e pagamento',
  true, 0, '2026-01-04 10:00:00', '2026-01-04 10:00:00'
),
(
  'tip_005',
  'O imposto sobre ganho em bolsa deve ser pago até o último dia útil do mês seguinte, via DARF com código 6015.',
  'Receita Federal',
  'taxes',
  'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/calculo-e-pagamento-do-imposto',
  'Receita Federal — Pagamento do imposto',
  true, 0, '2026-01-05 10:00:00', '2026-01-05 10:00:00'
),
(
  'tip_006',
  'Para pessoa física, LCI e LCA são isentas de Imposto de Renda sobre os rendimentos, conforme a legislação vigente.',
  'Receita Federal',
  'taxes',
  'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/tributacao/letras-de-credito-imobiliario-lci-e-do-agronegocio-lca',
  'Receita Federal — LCI e LCA',
  true, 0, '2026-01-06 10:00:00', '2026-01-06 10:00:00'
),
(
  'tip_007',
  'Ninguém aplica na bolsa: as pessoas aplicam nas empresas. A bolsa é o veículo que te possibilita ser o sócio.',
  'Luiz Barsi Filho',
  'investing',
  'https://www.cnnbrasil.com.br/economia/mercado/luiz-barsi-ao-cnn-money-as-licoes-de-investimento-do-rei-dos-dividendos/',
  'CNN Brasil — Entrevista com Luiz Barsi',
  true, 0, '2026-01-07 10:00:00', '2026-01-07 10:00:00'
),
(
  'tip_008',
  'Comprar e segurar — buy and hold. Evite especular e busque conhecer a fundo as empresas em que aposta.',
  'Luiz Barsi Filho',
  'investing',
  'https://www.cnnbrasil.com.br/economia/mercado/luiz-barsi-ao-cnn-money-as-licoes-de-investimento-do-rei-dos-dividendos/',
  'CNN Brasil — Entrevista com Luiz Barsi',
  true, 0, '2026-01-08 10:00:00', '2026-01-08 10:00:00'
),
(
  'tip_009',
  'É melhor ser parceiro de um grande negócio do que dono de um pequeno negócio.',
  'Luiz Barsi Filho',
  'investing',
  'https://www.cnnbrasil.com.br/economia/mercado/luiz-barsi-ao-cnn-money-as-licoes-de-investimento-do-rei-dos-dividendos/',
  'CNN Brasil — Entrevista com Luiz Barsi',
  true, 0, '2026-01-09 10:00:00', '2026-01-09 10:00:00'
),
(
  'tip_010',
  'O investidor brasileiro acha que investir leva 15 minutos — mas você precisa investir em décadas.',
  'Luiz Barsi Filho',
  'timing',
  'https://www.cnnbrasil.com.br/economia/mercado/luiz-barsi-ao-cnn-money-as-licoes-de-investimento-do-rei-dos-dividendos/',
  'CNN Brasil — Entrevista com Luiz Barsi',
  true, 0, '2026-01-10 10:00:00', '2026-01-10 10:00:00'
),
(
  'tip_011',
  'As atividades educacionais da CVM são gratuitas, sem interesse comercial, e não constituem recomendação de investimento.',
  'CVM',
  'general',
  'https://www.gov.br/cvm/pt-br/assuntos/educacao',
  'CVM — Educação financeira',
  true, 0, '2026-01-11 10:00:00', '2026-01-11 10:00:00'
),
(
  'tip_012',
  'O Tesouro Selic é o título público mais indicado para reserva de emergência por combinar liquidez diária e baixo risco de crédito.',
  'Tesouro Nacional',
  'saving',
  'https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm',
  'Tesouro Direto — Títulos disponíveis',
  true, 0, '2026-01-12 10:00:00', '2026-01-12 10:00:00'
),
(
  'tip_013',
  'O patrimônio alimenta o ego; o que sustenta a carteira no longo prazo são os proventos e dividendos reinvestidos.',
  'Luiz Barsi Filho',
  'investing',
  'https://www.youtube.com/watch?v=LuEPSwvsBrs&t=120',
  'YouTube — Estratégia da família Barsi (2:00)',
  true, 0, '2026-01-13 10:00:00', '2026-01-13 10:00:00'
);

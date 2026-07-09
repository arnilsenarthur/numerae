-- AlterTable
ALTER TABLE "Tip" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Tip" ADD COLUMN "sourceLabel" TEXT;

-- Remove influencer tips
DELETE FROM "Tip" WHERE "author" ILIKE '%Primo Rico%';

-- Refresh catalog with attributable sources (paraphrases + official links)
DELETE FROM "Tip";

INSERT INTO "Tip" ("id", "quote", "author", "category", "sourceUrl", "sourceLabel", "active", "sortOrder", "createdAt", "updatedAt") VALUES
(
  'tip_001',
  'Monte uma reserva de emergência de 6 a 12 meses do seu custo fixo antes de buscar retorno com risco — e guarde em ativos líquidos.',
  'Raul Sardinha',
  'saving',
  'https://www.youtube.com/watch?v=bOEmfru9qTQ&t=75',
  'YouTube — Onde deixar sua reserva de emergência',
  true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_002',
  'A reserva existe para você não precisar vender investimentos no meio de um imprevisto — telhado, saúde ou perda de renda.',
  'Raul Sardinha',
  'saving',
  'https://www.youtube.com/watch?v=bOEmfru9qTQ&t=45',
  'YouTube — Onde deixar sua reserva de emergência',
  true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_003',
  'Vendas de ações no mercado à vista são isentas quando o total de alienações no mês não ultrapassa R$ 20 mil (conjunto de papéis).',
  'Receita Federal',
  'taxes',
  'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/isencoes',
  'Receita Federal — Isenções em bolsa',
  true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_004',
  'Acima do limite de isenção, o ganho líquido em ações comuns é tributado a 15% (day trade: 20%). Pague via DARF 6015 até o último dia útil do mês seguinte.',
  'Receita Federal',
  'taxes',
  'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/calculo-e-pagamento-do-imposto',
  'Receita Federal — Cálculo e pagamento',
  true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_005',
  'Prejuízos em operações tributadas podem ser compensados com lucros futuros na renda variável — organize notas e apurações mensais.',
  'Receita Federal',
  'taxes',
  'https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1/calculo-e-pagamento-do-imposto',
  'Receita Federal — Apuração mensal',
  true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_006',
  'LCI e LCA podem ser isentas de IR para pessoa física; na comparação com CDB, use sempre o rendimento líquido equivalente.',
  'Raul Sardinha',
  'taxes',
  'https://www.youtube.com/@investidorsardinha',
  'YouTube — Canal Investidor Sardinha',
  true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_007',
  'Comprar e segurar empresas sólidas por décadas tende a vencer a especulação: você investe nas companhias; a bolsa é o veículo.',
  'Luiz Barsi Filho',
  'investing',
  'https://www.cnnbrasil.com.br/economia/mercado/luiz-barsi-ao-cnn-money-as-licoes-de-investimento-do-rei-dos-dividendos/',
  'CNN Brasil — Entrevista Luiz Barsi',
  true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_008',
  'Foque em negócios perenes e geradores de caixa; reinvestir proventos com disciplina é o motor da carteira no longo prazo.',
  'Luiz Barsi Filho',
  'investing',
  'https://www.youtube.com/watch?v=LuEPSwvsBrs',
  'YouTube — Estratégia da família Barsi',
  true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_009',
  'Evite operar por impulso ou “dica quente”: conheça a fundo a empresa antes de ser sócio dela na bolsa.',
  'Luiz Barsi Filho',
  'investing',
  'https://www.cnnbrasil.com.br/economia/mercado/luiz-barsi-ao-cnn-money-as-licoes-de-investimento-do-rei-dos-dividendos/',
  'CNN Brasil — Entrevista Luiz Barsi',
  true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_010',
  'Decisão consciente no mercado de capitais exige informação qualificada — educação do investidor é gratuita e não é recomendação de ativos.',
  'CVM',
  'general',
  'https://www.gov.br/investidor/pt-br',
  'Portal do Investidor — CVM',
  true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_011',
  'O melhor momento para investir combina objetivo, prazo e reserva pronta — não espere o mercado “parecer seguro” para começar.',
  'Raul Sardinha',
  'timing',
  'https://www.youtube.com/@investidorsardinha',
  'YouTube — Canal Investidor Sardinha',
  true, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'tip_012',
  'Quitar dívidas caras (cartão, cheque especial) costuma “render” mais do que muitos investimentos — trate isso como prioridade.',
  'Raul Sardinha',
  'saving',
  'https://www.youtube.com/@investidorsardinha',
  'YouTube — Canal Investidor Sardinha',
  true, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tip_active_sortOrder_idx" ON "Tip"("active", "sortOrder");

-- Seed dicas iniciais
INSERT INTO "Tip" ("id", "quote", "author", "category", "active", "sortOrder", "createdAt", "updatedAt") VALUES
('tip_seed_001', 'Pague-se primeiro: separe a reserva de emergência antes de gastar o restante do salário.', 'Raul Sardinha', 'saving', true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_002', 'Reserva de emergência vem antes de qualquer investimento de risco — sem colchão, qualquer queda vira problema.', 'Raul Sardinha', 'saving', true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_003', 'Ganho de capital em ações: 20% sobre o lucro na venda, com isenção de até R$ 20 mil em vendas no mês.', 'Receita Federal', 'taxes', true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_004', 'Prejuízo em ações pode ser compensado com lucros futuros — guarde as notas de corretagem.', 'Raul Sardinha', 'taxes', true, 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_005', 'LCI e LCA são isentas de IR para pessoa física; compare sempre com o equivalente líquido do CDB.', 'Raul Sardinha', 'taxes', true, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_006', 'O melhor momento para investir é quando você tem objetivo, prazo e reserva — não quando o mercado “parece seguro”.', 'Raul Sardinha', 'timing', true, 6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_007', 'Aportes regulares suaviam o preço médio: disciplina costuma vencer tentar acertar o fundo do mercado.', 'Primo Rico', 'investing', true, 7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_008', 'Diversifique por classe de ativo antes de diversificar por “dica quente” de rede social.', 'Luis Barsi', 'investing', true, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_009', 'FIIs pagam dividendos mensais, mas o preço oscila — olhe rendimento e vacância, não só o yield.', 'Raul Sardinha', 'investing', true, 9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_010', 'Tesouro Selic para reserva; IPCA+ para longo prazo; renda variável só com horizonte e estômago para volatilidade.', 'Raul Sardinha', 'investing', true, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_011', 'Declaração de IR em dia evita malha e multas — organize extratos e DARFs ao longo do ano.', 'Receita Federal', 'taxes', true, 11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('tip_seed_012', 'Evite endividamento caro: quitar cartão e cheque especial libera mais retorno do que muitos investimentos.', 'Raul Sardinha', 'saving', true, 12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

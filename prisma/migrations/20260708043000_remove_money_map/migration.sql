-- Remove money-map (plano financeiro) and financial goals

-- DropTable (order matters: children first)
DROP TABLE IF EXISTS "MoneyMapNode";
DROP TABLE IF EXISTS "MoneyMapEdge";
DROP TABLE IF EXISTS "FinancialGoal";
DROP TABLE IF EXISTS "MoneyMap";

-- DropEnum
DROP TYPE IF EXISTS "MoneyMapNodeType";

-- Expand money map node types for full financial planning graphs
ALTER TYPE "MoneyMapNodeType" ADD VALUE IF NOT EXISTS 'MIN';
ALTER TYPE "MoneyMapNodeType" ADD VALUE IF NOT EXISTS 'SUM';
ALTER TYPE "MoneyMapNodeType" ADD VALUE IF NOT EXISTS 'INTEREST';

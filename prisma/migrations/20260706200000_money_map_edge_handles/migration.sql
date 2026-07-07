-- Persist socket handles on graph edges (multi-output nodes: Split, Investment, etc.)
ALTER TABLE "MoneyMapEdge" ADD COLUMN IF NOT EXISTS "sourceHandle" TEXT NOT NULL DEFAULT 'out-valor';
ALTER TABLE "MoneyMapEdge" ADD COLUMN IF NOT EXISTS "targetHandle" TEXT NOT NULL DEFAULT 'in-valor';

ALTER TABLE "MoneyMapEdge" DROP CONSTRAINT IF EXISTS "MoneyMapEdge_mapId_fromNodeId_toNodeId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "MoneyMapEdge_mapId_fromNodeId_toNodeId_sourceHandle_targetHandle_key"
  ON "MoneyMapEdge"("mapId", "fromNodeId", "toNodeId", "sourceHandle", "targetHandle");

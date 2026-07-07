-- Conexões entre blocos do mapa do dinheiro
CREATE TABLE "MoneyMapEdge" (
  "id" TEXT NOT NULL,
  "mapId" TEXT NOT NULL,
  "fromNodeId" TEXT NOT NULL,
  "toNodeId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MoneyMapEdge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MoneyMapEdge_mapId_fromNodeId_toNodeId_key"
  ON "MoneyMapEdge"("mapId", "fromNodeId", "toNodeId");
CREATE INDEX "MoneyMapEdge_mapId_idx" ON "MoneyMapEdge"("mapId");

ALTER TABLE "MoneyMapEdge"
ADD CONSTRAINT "MoneyMapEdge_mapId_fkey"
FOREIGN KEY ("mapId") REFERENCES "MoneyMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

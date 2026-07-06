-- Mapa do dinheiro — cenários modulares do usuário
CREATE TYPE "MoneyMapNodeType" AS ENUM (
  'INCOME',
  'CONVERSION',
  'TAX_PJ',
  'EXPENSE',
  'INVESTMENT',
  'SPLIT'
);

CREATE TABLE "MoneyMap" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "templateId" TEXT,
  "horizonMonths" INTEGER NOT NULL DEFAULT 12,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MoneyMap_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MoneyMapNode" (
  "id" TEXT NOT NULL,
  "mapId" TEXT NOT NULL,
  "type" "MoneyMapNodeType" NOT NULL,
  "label" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "config" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MoneyMapNode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MoneyMap_userId_idx" ON "MoneyMap"("userId");
CREATE INDEX "MoneyMapNode_mapId_sortOrder_idx" ON "MoneyMapNode"("mapId", "sortOrder");

ALTER TABLE "MoneyMap"
ADD CONSTRAINT "MoneyMap_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MoneyMapNode"
ADD CONSTRAINT "MoneyMapNode_mapId_fkey"
FOREIGN KEY ("mapId") REFERENCES "MoneyMap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

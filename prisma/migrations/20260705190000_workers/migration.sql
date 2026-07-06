-- Workers / crons padronizados
CREATE TYPE "WorkerRunStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED');
CREATE TYPE "WorkerRunTrigger" AS ENUM ('MANUAL', 'CRON', 'SYSTEM');

CREATE TABLE "Worker" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "primaryProvider" TEXT NOT NULL DEFAULT 'frankfurter',
  "secondaryProvider" TEXT,
  "intervalSeconds" INTEGER NOT NULL DEFAULT 3600,
  "lastRunAt" TIMESTAMP(3),
  "lastRunStatus" "WorkerRunStatus",
  "lastRunProvider" TEXT,
  "lastRunError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkerRun" (
  "id" TEXT NOT NULL,
  "workerId" TEXT NOT NULL,
  "status" "WorkerRunStatus" NOT NULL,
  "trigger" "WorkerRunTrigger" NOT NULL,
  "provider" TEXT,
  "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  "attemptedProviders" JSONB,
  "durationMs" INTEGER,
  "summary" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkerRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Worker_enabled_idx" ON "Worker"("enabled");
CREATE INDEX "WorkerRun_workerId_createdAt_idx" ON "WorkerRun"("workerId", "createdAt");
CREATE INDEX "WorkerRun_createdAt_idx" ON "WorkerRun"("createdAt");

ALTER TABLE "WorkerRun"
ADD CONSTRAINT "WorkerRun_workerId_fkey"
FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Worker" (
  "id", "name", "description", "enabled",
  "primaryProvider", "secondaryProvider", "intervalSeconds", "updatedAt"
) VALUES
(
  'usd_rate',
  'Taxas USD (moedas)',
  'Atualiza Currency.usdRate a partir de APIs externas de câmbio.',
  true,
  'frankfurter',
  'openexchangerates',
  3600,
  CURRENT_TIMESTAMP
),
(
  'institution_rates',
  'Taxas institucionais',
  'Propaga taxas de referência do catálogo para pares de câmbio das instituições (rate base; spread manual).',
  true,
  'catalog',
  NULL,
  3600,
  CURRENT_TIMESTAMP
);

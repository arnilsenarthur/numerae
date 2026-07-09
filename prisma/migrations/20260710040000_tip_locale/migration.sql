-- Add locale to tips for per-language content
ALTER TABLE "Tip" ADD COLUMN "locale" VARCHAR(10) NOT NULL DEFAULT 'pt-BR';

DROP INDEX IF EXISTS "Tip_active_sortOrder_idx";
CREATE INDEX "Tip_active_locale_sortOrder_idx" ON "Tip"("active", "locale", "sortOrder");

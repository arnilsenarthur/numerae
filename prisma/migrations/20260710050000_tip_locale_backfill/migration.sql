-- Ensure all existing tips default to pt-BR (content was authored in Portuguese)
UPDATE "Tip" SET "locale" = 'pt-BR' WHERE "locale" IS DISTINCT FROM 'en-US';

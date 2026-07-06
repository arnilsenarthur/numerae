-- Remove worker institucional (taxas são por moeda + spread manual)
DELETE FROM "WorkerRun" WHERE "workerId" = 'institution_rates';
DELETE FROM "Worker" WHERE "id" = 'institution_rates';

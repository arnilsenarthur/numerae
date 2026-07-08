-- Worker execution lock (prevents concurrent runs of the same worker)
ALTER TABLE "Worker" ADD COLUMN "runningSince" TIMESTAMP(3);

CREATE INDEX "Worker_runningSince_idx" ON "Worker"("runningSince");

-- Prevent duplicate recurring transaction generation for the same due date
CREATE UNIQUE INDEX "Transaction_recurringId_date_key" ON "Transaction"("recurringId", "date");

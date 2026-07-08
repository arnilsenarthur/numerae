import "server-only";

import { prisma } from "@/lib/db";
import { isWorkerRunning } from "@/lib/workers/workers.shared";
import { ensureWorkersSeeded, runDueWorkers } from "@/lib/workers/runner";
import { getWorkerScheduleMeta } from "@/lib/workers/workers.shared";

export async function maybeRunDueWorkers() {
  const workers = await prisma.worker.findMany({ where: { enabled: true } });
  const now = Date.now();

  const anyDue = workers.some((worker) => {
    const schedule = getWorkerScheduleMeta({
      enabled: worker.enabled,
      lastRunAt: worker.lastRunAt?.toISOString() ?? null,
      intervalSeconds: worker.intervalSeconds,
      runningSince: worker.runningSince?.toISOString() ?? null,
    });
    return schedule.isDue;
  });

  if (!anyDue) {
    return { ran: false, runs: [] };
  }

  const anyRunning = workers.some((worker) => isWorkerRunning(worker.runningSince, now));
  if (anyRunning) {
    return { ran: false, runs: [] };
  }

  await ensureWorkersSeeded();
  const runs = await runDueWorkers("SYSTEM");

  return { ran: runs.length > 0, runs };
}

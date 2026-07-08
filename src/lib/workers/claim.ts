import "server-only";

import { prisma } from "@/lib/db";
import { WORKER_STALE_LOCK_MS } from "@/lib/workers/workers.shared";

/**
 * Atomically claims a worker for execution.
 * Returns true only for the caller that wins the race.
 */
export async function tryClaimWorker(
  workerId: string,
  intervalSeconds: number,
  options: { bypassDue?: boolean } = {},
): Promise<boolean> {
  const now = Date.now();
  const staleThreshold = new Date(now - WORKER_STALE_LOCK_MS);
  const dueThreshold = new Date(now - intervalSeconds * 1000);

  const lockAvailable = {
    OR: [{ runningSince: null }, { runningSince: { lte: staleThreshold } }],
  };

  const dueCondition = options.bypassDue
    ? {}
    : {
        OR: [{ lastRunAt: null }, { lastRunAt: { lte: dueThreshold } }],
      };

  const result = await prisma.worker.updateMany({
    where: {
      id: workerId,
      AND: [lockAvailable, dueCondition],
    },
    data: { runningSince: new Date() },
  });

  return result.count > 0;
}

export async function releaseWorkerClaim(workerId: string) {
  await prisma.worker.updateMany({
    where: { id: workerId },
    data: { runningSince: null },
  });
}

import "server-only";

import type { WorkerRunTrigger } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { tryClaimWorker } from "@/lib/workers/claim";
import {
  getWorkerDefinition,
  isWorkerProviderId,
  WORKER_IDS,
  type WorkerProviderId,
} from "@/lib/workers/registry";
import {
  runMarketQuotesWorker,
  runRecurringTransactionWorker,
  runUsdRateWorker,
} from "@/lib/workers/tasks";
import {
  getWorkerScheduleMeta,
  isWorkerRunning,
  type SerializedWorker,
  type SerializedWorkerRun,
} from "@/lib/workers/workers.shared";

export type { SerializedWorker, SerializedWorkerRun } from "@/lib/workers/workers.shared";

type WorkerRecord = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  primaryProvider: string;
  secondaryProvider: string | null;
  intervalSeconds: number;
  lastRunAt: Date | null;
  runningSince: Date | null;
  lastRunStatus: string | null;
  lastRunProvider: string | null;
  lastRunError: string | null;
  createdAt: Date;
  updatedAt: Date;
  runs?: WorkerRunRecord[];
};

type WorkerRunRecord = {
  id: string;
  workerId: string;
  status: string;
  trigger: string;
  provider: string | null;
  fallbackUsed: boolean;
  attemptedProviders: unknown;
  durationMs: number | null;
  summary: unknown;
  error: string | null;
  createdAt: Date;
};

export function serializeWorkerRun(record: WorkerRunRecord): SerializedWorkerRun {
  return {
    id: record.id,
    workerId: record.workerId,
    status: record.status,
    trigger: record.trigger,
    provider: record.provider,
    fallbackUsed: record.fallbackUsed,
    attemptedProviders: Array.isArray(record.attemptedProviders)
      ? (record.attemptedProviders as SerializedWorkerRun["attemptedProviders"])
      : null,
    durationMs: record.durationMs,
    summary:
      record.summary && typeof record.summary === "object"
        ? (record.summary as Record<string, unknown>)
        : null,
    error: record.error,
    createdAt: record.createdAt.toISOString(),
  };
}

export function serializeWorker(record: WorkerRecord): SerializedWorker {
  const definition = getWorkerDefinition(record.id);
  const schedule = getWorkerScheduleMeta({
    enabled: record.enabled,
    lastRunAt: record.lastRunAt?.toISOString() ?? null,
    intervalSeconds: record.intervalSeconds,
    runningSince: record.runningSince?.toISOString() ?? null,
  });

  return {
    id: record.id,
    name: record.name,
    description: record.description,
    enabled: record.enabled,
    primaryProvider: record.primaryProvider,
    secondaryProvider: record.secondaryProvider,
    intervalSeconds: record.intervalSeconds,
    lastRunAt: record.lastRunAt?.toISOString() ?? null,
    runningSince: record.runningSince?.toISOString() ?? null,
    isRunning: isWorkerRunning(record.runningSince),
    lastRunStatus: record.lastRunStatus,
    lastRunProvider: record.lastRunProvider,
    lastRunError: record.lastRunError,
    nextRunAt: schedule.nextRunAt,
    isDue: schedule.isDue,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    allowedProviders: definition?.allowedProviders ?? [],
    recentRuns: record.runs?.map(serializeWorkerRun),
  };
}

async function executeWorkerTask(
  workerId: string,
  primaryProvider: WorkerProviderId,
  secondaryProvider: WorkerProviderId | null,
  trigger: WorkerRunTrigger,
) {
  switch (workerId) {
    case WORKER_IDS.USD_RATE:
      return runUsdRateWorker({ primaryProvider, secondaryProvider, trigger });
    case WORKER_IDS.MARKET_QUOTES:
      return runMarketQuotesWorker({ primaryProvider, secondaryProvider, trigger });
    case WORKER_IDS.RECURRING_TXN:
      return runRecurringTransactionWorker({ trigger });
    default:
      throw new Error(`Worker desconhecido: ${workerId}`);
  }
}

export async function runWorkerById(
  workerId: string,
  trigger: WorkerRunTrigger,
  options: { bypassDue?: boolean } = {},
): Promise<{ worker: SerializedWorker; run: SerializedWorkerRun } | null> {
  const worker = await prisma.worker.findUnique({ where: { id: workerId } });

  if (!worker) {
    throw new Error("Worker não encontrado.");
  }

  if (!worker.enabled && trigger !== "MANUAL") {
    const run = await prisma.workerRun.create({
      data: {
        workerId: worker.id,
        status: "SKIPPED",
        trigger,
        provider: null,
        fallbackUsed: false,
        attemptedProviders: [],
        durationMs: 0,
        summary: { reason: "Automático desligado." },
        error: "Automático desligado.",
      },
    });

    const updatedWorker = await prisma.worker.update({
      where: { id: worker.id },
      data: {
        lastRunAt: new Date(),
        runningSince: null,
        lastRunStatus: "SKIPPED",
        lastRunProvider: null,
        lastRunError: "Automático desligado.",
      },
    });

    return {
      worker: serializeWorker(updatedWorker),
      run: serializeWorkerRun(run),
    };
  }

  const bypassDue = options.bypassDue ?? trigger === "MANUAL";
  const claimed = await tryClaimWorker(worker.id, worker.intervalSeconds, { bypassDue });

  if (!claimed) {
    if (trigger === "MANUAL") {
      throw new Error("Worker já está em execução ou não está disponível.");
    }
    return null;
  }

  const primaryProvider = isWorkerProviderId(worker.primaryProvider)
    ? worker.primaryProvider
    : "frankfurter";

  const secondaryProvider =
    worker.secondaryProvider && isWorkerProviderId(worker.secondaryProvider)
      ? worker.secondaryProvider
      : null;

  const started = Date.now();

  try {
    const result = await executeWorkerTask(
      worker.id,
      primaryProvider,
      secondaryProvider,
      trigger,
    );

    const durationMs = Date.now() - started;

    const run = await prisma.workerRun.create({
      data: {
        workerId: worker.id,
        status: result.status,
        trigger,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        attemptedProviders: result.attemptedProviders,
        durationMs,
        summary: result.summary,
        error: result.error ?? null,
      },
    });

    const updatedWorker = await prisma.worker.update({
      where: { id: worker.id },
      data: {
        lastRunAt: new Date(),
        runningSince: null,
        lastRunStatus: result.status,
        lastRunProvider: result.provider,
        lastRunError: result.error ?? null,
      },
    });

    return {
      worker: serializeWorker(updatedWorker),
      run: serializeWorkerRun(run),
    };
  } catch (error) {
    const durationMs = Date.now() - started;
    const message = error instanceof Error ? error.message : "Erro desconhecido.";

    const run = await prisma.workerRun.create({
      data: {
        workerId: worker.id,
        status: "FAILED",
        trigger,
        provider: null,
        fallbackUsed: false,
        attemptedProviders: [],
        durationMs,
        summary: { errors: [message] },
        error: message,
      },
    });

    const updatedWorker = await prisma.worker.update({
      where: { id: worker.id },
      data: {
        lastRunAt: new Date(),
        runningSince: null,
        lastRunStatus: "FAILED",
        lastRunProvider: null,
        lastRunError: message,
      },
    });

    return {
      worker: serializeWorker(updatedWorker),
      run: serializeWorkerRun(run),
    };
  }
}

export async function runDueWorkers(trigger: WorkerRunTrigger) {
  const workers = await prisma.worker.findMany({ where: { enabled: true } });
  const results: { workerId: string; run: SerializedWorkerRun }[] = [];

  for (const worker of workers) {
    const result = await runWorkerById(worker.id, trigger);
    if (result) {
      results.push({ workerId: worker.id, run: result.run });
    }
  }

  return results;
}

export async function ensureWorkersSeeded() {
  const definitions = Object.values(WORKER_IDS);
  for (const id of definitions) {
    const def = getWorkerDefinition(id);
    if (!def) continue;

    await prisma.worker.upsert({
      where: { id },
      create: {
        id,
        name: def.name,
        description: def.description,
        enabled: true,
        primaryProvider: def.defaultPrimaryProvider,
        secondaryProvider: def.defaultSecondaryProvider,
        intervalSeconds: def.defaultIntervalSeconds,
      },
      update: {},
    });
  }
}

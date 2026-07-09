export type SerializedWorkerRun = {
  id: string;
  workerId: string;
  status: string;
  trigger: string;
  provider: string | null;
  fallbackUsed: boolean;
  attemptedProviders: { provider: string; ok: boolean; error?: string }[] | null;
  durationMs: number | null;
  summary: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
};

export type SerializedWorker = {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  primaryProvider: string;
  secondaryProvider: string | null;
  intervalSeconds: number;
  historyLookbackDays: number | null;
  lastRunAt: string | null;
  runningSince: string | null;
  isRunning: boolean;
  lastRunStatus: string | null;
  lastRunProvider: string | null;
  lastRunError: string | null;
  nextRunAt: string | null;
  isDue: boolean;
  createdAt: string;
  updatedAt: string;
  allowedProviders: string[];
  recentRuns?: SerializedWorkerRun[];
};

export const WORKER_RUN_STATUS_LABEL: Record<string, string> = {
  SUCCESS: "Sucesso",
  PARTIAL: "Parcial",
  FAILED: "Falhou",
  SKIPPED: "Ignorado",
};

export const WORKER_RUN_TRIGGER_LABEL: Record<string, string> = {
  MANUAL: "Manual",
  CRON: "Automático",
  SYSTEM: "Sistema",
};

/** Reclaim workers stuck in "running" after a crash or timeout. */
export const WORKER_STALE_LOCK_MS = 30 * 60 * 1000;

export function isWorkerRunning(runningSince: Date | null, now = Date.now()) {
  if (!runningSince) return false;
  return now - runningSince.getTime() < WORKER_STALE_LOCK_MS;
}

export function getWorkerScheduleMeta(
  worker: Pick<
    SerializedWorker,
    "enabled" | "lastRunAt" | "intervalSeconds" | "runningSince"
  >,
  now = Date.now(),
) {
  if (!worker.enabled) {
    return {
      automatic: false,
      isDue: false,
      nextRunAt: null as string | null,
    };
  }

  if (isWorkerRunning(worker.runningSince ? new Date(worker.runningSince) : null, now)) {
    return {
      automatic: true,
      isDue: false,
      nextRunAt: null as string | null,
    };
  }

  const intervalMs = worker.intervalSeconds * 1000;
  const lastMs = worker.lastRunAt ? new Date(worker.lastRunAt).getTime() : null;
  const nextMs = lastMs === null ? now : lastMs + intervalMs;
  const isDue = nextMs <= now;

  return {
    automatic: true,
    isDue,
    nextRunAt: isDue ? null : new Date(nextMs).toISOString(),
  };
}

export function formatWorkerNextRunLabel(
  worker: Pick<
    SerializedWorker,
    "enabled" | "lastRunAt" | "intervalSeconds" | "nextRunAt" | "isDue" | "isRunning"
  >,
  formatWhen: (iso: string | null) => string,
) {
  if (!worker.enabled) {
    return "Automático desligado";
  }

  if (worker.isRunning) {
    return "Executando agora…";
  }

  if (worker.isDue) {
    if (worker.lastRunAt) {
      const expectedAt = new Date(
        new Date(worker.lastRunAt).getTime() + worker.intervalSeconds * 1000,
      );
      return `Pendente · previsto ${formatWhen(expectedAt.toISOString())}`;
    }
    return "Pendente · aguardando cron";
  }

  if (worker.nextRunAt) {
    return formatWhen(worker.nextRunAt);
  }

  return "—";
}

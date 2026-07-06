"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { IconCheck, IconAlertTriangle, IconX } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { WORKER_PROVIDER_OPTIONS } from "@/lib/workers/registry";
import {
  WORKER_RUN_STATUS_LABEL,
  WORKER_RUN_TRIGGER_LABEL,
  formatWorkerNextRunLabel,
  getWorkerScheduleMeta,
  type SerializedWorker,
  type SerializedWorkerRun,
} from "@/lib/workers/workers.shared";

function formatWhen(iso: string | null) {
  if (!iso) return "Nunca";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatInterval(seconds: number) {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} h`;
}

const STATUS_LABEL = WORKER_RUN_STATUS_LABEL;

function statusVariant(status: string | null): "default" | "success" | "warning" | "error" {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "PARTIAL":
      return "warning";
    case "FAILED":
      return "error";
    case "SKIPPED":
      return "default";
    default:
      return "default";
  }
}

function providerOptionsForWorker(worker: SerializedWorker) {
  return WORKER_PROVIDER_OPTIONS.filter((option) =>
    worker.allowedProviders.includes(option.value),
  ).map((option) => ({
    ...option,
    label: option.label,
  }));
}

function RunHistory({ runs }: { runs: SerializedWorkerRun[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-zinc-500">Nenhuma execução registrada.</p>;
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <details
          key={run.id}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge variant={statusVariant(run.status)}>{STATUS_LABEL[run.status] ?? run.status}</Badge>
              <span className="text-zinc-600 dark:text-zinc-300">{formatWhen(run.createdAt)}</span>
              <span className="text-xs text-zinc-400">
                {WORKER_RUN_TRIGGER_LABEL[run.trigger] ?? run.trigger}
                {run.provider ? ` · ${run.provider}` : ""}
                {run.fallbackUsed ? " · fallback" : ""}
                {run.durationMs !== null ? ` · ${formatDuration(run.durationMs)}` : ""}
              </span>
            </div>
          </summary>
          <div className="space-y-2 border-t border-zinc-100 px-3 py-2 dark:border-zinc-900">
            {run.error ? (
              <p className="text-sm text-red-600 dark:text-red-400">{run.error}</p>
            ) : null}
            {run.attemptedProviders?.length ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-zinc-500">Provedores tentados</p>
                <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
                  {run.attemptedProviders.map((attempt) => (
                    <li key={`${run.id}-${attempt.provider}`} className="flex items-center gap-2">
                      {attempt.ok ? (
                        <IconCheck size="sm" className="text-emerald-600" />
                      ) : (
                        <IconX size="sm" className="text-red-500" />
                      )}
                      <span>
                        {attempt.provider}
                        {attempt.error ? ` — ${attempt.error}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {run.summary ? (
              <pre className="max-h-40 overflow-auto rounded bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                {JSON.stringify(run.summary, null, 2)}
              </pre>
            ) : null}
          </div>
        </details>
      ))}
    </div>
  );
}

function WorkerCard({
  worker,
  onChange,
}: {
  worker: SerializedWorker;
  onChange: (worker: SerializedWorker) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<SerializedWorkerRun[]>(worker.recentRuns ?? []);
  const [expanded, setExpanded] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(String(worker.intervalSeconds));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setIntervalSeconds(String(worker.intervalSeconds));
  }, [worker.intervalSeconds]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const schedule = useMemo(
    () =>
      getWorkerScheduleMeta(
        {
          enabled: worker.enabled,
          lastRunAt: worker.lastRunAt,
          intervalSeconds: worker.intervalSeconds,
        },
        now,
      ),
    [worker.enabled, worker.intervalSeconds, worker.lastRunAt, now],
  );

  const nextRunLabel = useMemo(
    () =>
      formatWorkerNextRunLabel(
        {
          enabled: worker.enabled,
          lastRunAt: worker.lastRunAt,
          intervalSeconds: worker.intervalSeconds,
          nextRunAt: schedule.nextRunAt,
          isDue: schedule.isDue,
        },
        formatWhen,
      ),
    [worker, schedule.isDue, schedule.nextRunAt],
  );

  const providerOptions = useMemo(() => providerOptionsForWorker(worker), [worker]);

  const secondaryOptions = useMemo(
    () => [{ value: "", label: "Nenhum", description: "Sem fallback" }, ...providerOptions],
    [providerOptions],
  );

  async function patchWorker(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{ worker?: SerializedWorker; error?: string }>(
        `/api/admin/workers/${worker.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok || !data?.worker) {
        throw new Error(data?.error ?? "Erro ao salvar worker.");
      }

      onChange(data.worker);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function runNow() {
    setRunning(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{
        worker?: SerializedWorker;
        run?: SerializedWorkerRun;
        error?: string;
      }>(`/api/admin/workers/${worker.id}/run`, { method: "POST" });

      if (!response.ok || !data?.worker || !data?.run) {
        throw new Error(data?.error ?? "Erro ao executar worker.");
      }

      onChange(data.worker);
      setRuns((prev) => [data.run!, ...prev].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao executar.");
    } finally {
      setRunning(false);
    }
  }

  async function loadMoreRuns() {
    const { response, data } = await fetchJson<{ runs?: SerializedWorkerRun[] }>(
      `/api/admin/workers/${worker.id}/runs?limit=30`,
    );
    if (response.ok && data?.runs) setRuns(data.runs);
    setExpanded(true);
  }

  async function saveInterval() {
    const parsed = Number(intervalSeconds);
    if (!Number.isFinite(parsed) || parsed < 300 || parsed > 86400) {
      setError("Intervalo deve ser entre 300 e 86400 segundos.");
      setIntervalSeconds(String(worker.intervalSeconds));
      return;
    }

    if (parsed === worker.intervalSeconds) return;
    await patchWorker({ intervalSeconds: Math.round(parsed) });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{worker.name}</CardTitle>
              <Badge variant={worker.enabled ? "success" : "default"}>
                {worker.enabled ? "Automático" : "Manual"}
              </Badge>
              {worker.lastRunStatus ? (
                <Badge variant={statusVariant(worker.lastRunStatus)}>
                  {STATUS_LABEL[worker.lastRunStatus] ?? worker.lastRunStatus}
                </Badge>
              ) : null}
            </div>
            <p className="font-mono text-xs text-zinc-400">{worker.id}</p>
            {worker.description ? (
              <p className="text-sm text-zinc-500">{worker.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={running || saving}
              onClick={() => void runNow()}
            >
              {running ? "Executando..." : "Executar agora"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <p className="text-xs text-zinc-500">Última execução</p>
            <p className="text-sm font-medium">{formatWhen(worker.lastRunAt)}</p>
          </div>
          <div className="space-y-1 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <p className="text-xs text-zinc-500">Próxima execução</p>
            <p
              className={
                schedule.isDue && worker.enabled
                  ? "text-sm font-medium text-amber-700 dark:text-amber-300"
                  : "text-sm font-medium"
              }
            >
              {nextRunLabel}
            </p>
          </div>
          <div className="space-y-1 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <p className="text-xs text-zinc-500">Provedor usado</p>
            <p className="text-sm font-medium">{worker.lastRunProvider ?? "—"}</p>
          </div>
          <div className="space-y-1 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <p className="text-xs text-zinc-500">Último erro</p>
            <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {worker.lastRunError ?? "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1">
            <Switch
              label="Worker automático"
              checked={worker.enabled}
              disabled={saving}
              onChange={(event) => void patchWorker({ enabled: event.target.checked })}
            />
            <p className="text-xs text-zinc-500">
              Ligado: o cron executa a cada {formatInterval(worker.intervalSeconds)} após a última
              execução. Desligado: só via &quot;Executar agora&quot;.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`interval-${worker.id}`}>Intervalo automático (segundos)</Label>
            <NumberInput
              id={`interval-${worker.id}`}
              value={intervalSeconds}
              min={300}
              max={86400}
              step={60}
              disabled={saving || !worker.enabled}
              onChange={(event) => setIntervalSeconds(event.target.value)}
              onBlur={() => void saveInterval()}
            />
            <p className="text-xs text-zinc-500">
              {worker.enabled
                ? `Próximo ciclo: ${nextRunLabel} · ${formatInterval(worker.intervalSeconds)} · 300–86400s`
                : "Ative o automático para usar o intervalo · 300–86400s"}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Provedor primário</Label>
            <Select
              options={providerOptions}
              value={worker.primaryProvider}
              disabled={saving}
              onChange={(value) => void patchWorker({ primaryProvider: value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Provedor secundário (fallback)</Label>
            <Select
              options={secondaryOptions}
              value={worker.secondaryProvider ?? ""}
              disabled={saving || worker.allowedProviders.length <= 1}
              onChange={(value) =>
                void patchWorker({ secondaryProvider: value || null })
              }
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Histórico de execuções
            </p>
            {!expanded ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadMoreRuns()}>
                Ver histórico completo
              </Button>
            ) : null}
          </div>
          <RunHistory runs={expanded ? runs : (worker.recentRuns ?? runs).slice(0, 3)} />
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkersAdmin() {
  const [workers, setWorkers] = useState<SerializedWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{ workers?: SerializedWorker[]; error?: string }>(
        "/api/admin/workers",
      );

      if (!response.ok) {
        throw new Error(data?.error ?? "Erro ao carregar workers.");
      }

      setWorkers(data?.workers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar workers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  const stats = useMemo(() => {
    const enabled = workers.filter((w) => w.enabled).length;
    const failed = workers.filter((w) => w.lastRunStatus === "FAILED").length;
    return { enabled, failed, total: workers.length };
  }, [workers]);

  function updateWorker(next: SerializedWorker) {
    setWorkers((prev) => prev.map((item) => (item.id === next.id ? next : item)));
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <p className="text-sm text-emerald-600">Admin</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Workers / Crons</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Workers automáticos rodam no intervalo configurado via cron. Acompanhe execuções,
          provedores, fallback e erros — ou dispare manualmente.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-zinc-500">Workers</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-zinc-500">Automáticos</p>
            <p className="text-2xl font-semibold text-emerald-600">{stats.enabled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="flex items-center gap-1 text-xs text-zinc-500">
              {stats.failed > 0 ? <IconAlertTriangle size="sm" className="text-amber-500" /> : null}
              Com falha recente
            </p>
            <p className="text-2xl font-semibold">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cron automático</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm text-zinc-600 dark:text-zinc-300">
          <p>
            Configure <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">CRON_SECRET</code>{" "}
            e agende <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">POST /api/cron/workers</code>{" "}
            a cada 1–5 min. Cada worker automático roda quando{" "}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-900">última execução + intervalo</code>{" "}
            já passou.
          </p>
          <p className="text-xs text-zinc-500">
            Header: <code>Authorization: Bearer CRON_SECRET</code> ou{" "}
            <code>x-cron-secret</code>. Use <code>?force=true</code> para forçar todos os automáticos.
          </p>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-8 text-sm text-zinc-500">Carregando workers...</p>
      ) : (
        <div className="space-y-4">
          {workers.map((worker) => (
            <WorkerCard key={worker.id} worker={worker} onChange={updateWorker} />
          ))}
        </div>
      )}
    </div>
  );
}

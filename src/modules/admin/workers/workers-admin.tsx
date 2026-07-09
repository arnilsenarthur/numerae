"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { IconCheck, IconAlertTriangle, IconX } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  translateWorkerRunStatus,
  translateWorkerRunTrigger,
} from "@/i18n/labels";
import { WORKER_PROVIDER_OPTIONS } from "@/lib/workers/registry";
import {
  formatWorkerNextRunLabel,
  getWorkerScheduleMeta,
  type SerializedWorker,
  type SerializedWorkerRun,
} from "@/lib/workers/workers.shared";

function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatInterval(seconds: number) {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${Math.round(seconds / 3600)} h`;
}

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
  const t = useT();
  const { locale } = useLocale();

  const formatWhen = useCallback(
    (iso: string | null) => {
      if (!iso) return t("admin.workers.never");
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso));
    },
    [locale, t],
  );

  if (runs.length === 0) {
    return <p className="text-sm text-zinc-500">{t("admin.workers.noRuns")}</p>;
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
              <Badge variant={statusVariant(run.status)}>
                {translateWorkerRunStatus(run.status, t)}
              </Badge>
              <span className="text-zinc-600 dark:text-zinc-300">{formatWhen(run.createdAt)}</span>
              <span className="text-xs text-zinc-400">
                {translateWorkerRunTrigger(run.trigger, t)}
                {run.provider ? ` · ${run.provider}` : ""}
                {run.fallbackUsed ? ` · ${t("admin.workers.fallback")}` : ""}
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
                <p className="text-xs font-medium text-zinc-500">{t("admin.workers.attemptedProviders")}</p>
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
  const t = useT();
  const { locale } = useLocale();
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<SerializedWorkerRun[]>(worker.recentRuns ?? []);
  const [expanded, setExpanded] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(String(worker.intervalSeconds));
  const [historyLookbackDays, setHistoryLookbackDays] = useState(
    worker.historyLookbackDays ? String(worker.historyLookbackDays) : "",
  );
  const [now, setNow] = useState(() => Date.now());

  const formatWhen = useCallback(
    (iso: string | null) => {
      if (!iso) return t("admin.workers.never");
      return new Intl.DateTimeFormat(locale, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(iso));
    },
    [locale, t],
  );

  useEffect(() => {
    setIntervalSeconds(String(worker.intervalSeconds));
  }, [worker.intervalSeconds]);

  useEffect(() => {
    setHistoryLookbackDays(worker.historyLookbackDays ? String(worker.historyLookbackDays) : "");
  }, [worker.historyLookbackDays]);

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
          runningSince: worker.runningSince,
        },
        now,
      ),
    [worker.enabled, worker.intervalSeconds, worker.lastRunAt, worker.runningSince, now],
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
          isRunning: worker.isRunning,
        },
        formatWhen,
        t,
      ),
    [worker, schedule.isDue, schedule.nextRunAt, formatWhen, t],
  );

  const providerOptions = useMemo(() => providerOptionsForWorker(worker), [worker]);

  const secondaryOptions = useMemo(
    () => [
      { value: "", label: t("admin.workers.none"), description: t("admin.workers.noFallback") },
      ...providerOptions,
    ],
    [providerOptions, t],
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
        throw new Error(data?.error ?? t("admin.workers.errorSave"));
      }

      onChange(data.worker);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.workers.errorSave"));
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
        throw new Error(data?.error ?? t("admin.workers.errorRun"));
      }

      onChange(data.worker);
      setRuns((prev) => [data.run!, ...prev].slice(0, 20));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.workers.errorRun"));
    } finally {
      setRunning(false);
    }
  }

  async function unlockWorker() {
    setSaving(true);
    setError(null);
    try {
      const { response, data } = await fetchJson<{ worker?: SerializedWorker; error?: string }>(
        `/api/admin/workers/${worker.id}/unlock`,
        { method: "POST" },
      );
      if (!response.ok || !data?.worker) {
        throw new Error(data?.error ?? t("admin.workers.errorUnlock"));
      }
      onChange(data.worker);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.workers.errorUnlock"));
    } finally {
      setSaving(false);
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
      setError(t("admin.workers.validation.interval"));
      setIntervalSeconds(String(worker.intervalSeconds));
      return;
    }

    if (parsed === worker.intervalSeconds) return;
    await patchWorker({ intervalSeconds: Math.round(parsed) });
  }

  async function saveLookbackDays() {
    if (worker.id !== "market_quotes") return;
    const parsed = Number(historyLookbackDays);
    if (!Number.isFinite(parsed) || parsed < 30 || parsed > 2000) {
      setError(t("admin.workers.validation.lookback"));
      setHistoryLookbackDays(worker.historyLookbackDays ? String(worker.historyLookbackDays) : "400");
      return;
    }
    if (parsed === worker.historyLookbackDays) return;
    await patchWorker({ historyLookbackDays: Math.round(parsed) });
  }

  const intervalLabel = formatInterval(worker.intervalSeconds);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{worker.name}</CardTitle>
              <Badge variant={worker.enabled ? "success" : "default"}>
                {worker.enabled ? t("admin.workers.automatic") : t("admin.workers.manual")}
              </Badge>
              {worker.lastRunStatus ? (
                <Badge variant={statusVariant(worker.lastRunStatus)}>
                  {translateWorkerRunStatus(worker.lastRunStatus, t)}
                </Badge>
              ) : null}
            </div>
            <p className="font-mono text-xs text-zinc-400">{worker.id}</p>
            {worker.description ? (
              <p className="text-sm text-zinc-500">{worker.description}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {worker.isRunning ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={saving}
                onClick={() => void unlockWorker()}
              >
                {saving ? t("admin.workers.unlocking") : t("admin.workers.unlock")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={running || saving}
                onClick={() => void runNow()}
              >
                {running ? t("admin.workers.running") : t("admin.workers.runNow")}
              </Button>
            )}
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
            <p className="text-xs text-zinc-500">{t("admin.workers.lastRun")}</p>
            <p className="text-sm font-medium">{formatWhen(worker.lastRunAt)}</p>
          </div>
          <div className="space-y-1 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <p className="text-xs text-zinc-500">{t("admin.workers.nextRun")}</p>
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
            <p className="text-xs text-zinc-500">{t("admin.workers.providerUsed")}</p>
            <p className="text-sm font-medium">{worker.lastRunProvider ?? "—"}</p>
          </div>
          <div className="space-y-1 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
            <p className="text-xs text-zinc-500">{t("admin.workers.lastError")}</p>
            <p className="truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
              {worker.lastRunError ?? "—"}
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1">
            <Switch
              label={t("admin.workers.autoWorker")}
              checked={worker.enabled}
              disabled={saving}
              onChange={(event) => void patchWorker({ enabled: event.target.checked })}
            />
            <p className="text-xs text-zinc-500">
              {t("admin.workers.autoWorkerHint", { interval: intervalLabel })}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={`interval-${worker.id}`}>{t("admin.workers.intervalSeconds")}</Label>
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
                ? t("admin.workers.intervalHintEnabled", {
                    nextRun: nextRunLabel,
                    interval: intervalLabel,
                  })
                : t("admin.workers.intervalHintDisabled")}
            </p>
          </div>

          {worker.id === "market_quotes" ? (
            <div className="space-y-1.5">
              <Label htmlFor={`lookback-${worker.id}`}>{t("admin.workers.lookbackDays")}</Label>
              <NumberInput
                id={`lookback-${worker.id}`}
                value={historyLookbackDays}
                min={30}
                max={2000}
                step={10}
                disabled={saving}
                onChange={(event) => setHistoryLookbackDays(event.target.value)}
                onBlur={() => void saveLookbackDays()}
              />
              <p className="text-xs text-zinc-500">{t("admin.workers.lookbackHint")}</p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>{t("admin.workers.primaryProvider")}</Label>
            <Select
              options={providerOptions}
              value={worker.primaryProvider}
              disabled={saving}
              onChange={(value) => void patchWorker({ primaryProvider: value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t("admin.workers.secondaryProvider")}</Label>
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
              {t("admin.workers.runHistory")}
            </p>
            {!expanded ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadMoreRuns()}>
                {t("admin.workers.viewFullHistory")}
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
  const t = useT();
  const [workers, setWorkers] = useState<SerializedWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const autoTicked = useRef(false);

  const loadWorkers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{ workers?: SerializedWorker[]; error?: string }>(
        "/api/admin/workers",
      );

      if (!response.ok) {
        throw new Error(data?.error ?? t("admin.workers.errorLoad"));
      }

      setWorkers(data?.workers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.workers.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  useEffect(() => {
    if (loading || autoTicked.current) return;

    const hasDue = workers.some((worker) => worker.enabled && worker.isDue);
    if (!hasDue) return;

    autoTicked.current = true;
    void fetch("/api/workers/tick", { method: "POST" })
      .then(() => loadWorkers())
      .catch(() => undefined);
  }, [workers, loading, loadWorkers]);

  const stats = useMemo(() => {
    const enabled = workers.filter((w) => w.enabled).length;
    const failed = workers.filter((w) => w.lastRunStatus === "FAILED").length;
    return { enabled, failed, total: workers.length };
  }, [workers]);

  function updateWorker(next: SerializedWorker) {
    setWorkers((prev) => prev.map((item) => (item.id === next.id ? next : item)));
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div>
        <p className="text-sm text-emerald-600">{t("admin.common.kicker")}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("admin.workers.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{t("admin.workers.subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-zinc-500">{t("admin.workers.stats.total")}</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-zinc-500">{t("admin.workers.stats.automatic")}</p>
            <p className="text-2xl font-semibold text-emerald-600">{stats.enabled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="flex items-center gap-1 text-xs text-zinc-500">
              {stats.failed > 0 ? <IconAlertTriangle size="sm" className="text-amber-500" /> : null}
              {t("admin.workers.stats.recentFailure")}
            </p>
            <p className="text-2xl font-semibold">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("admin.workers.cron.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 pt-0 text-sm text-zinc-600 dark:text-zinc-300">
          <p>{t("admin.workers.cron.p1")}</p>
          <p className="text-xs text-zinc-500">{t("admin.workers.cron.p2")}</p>
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-8 text-sm text-zinc-500">{t("admin.workers.loading")}</p>
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

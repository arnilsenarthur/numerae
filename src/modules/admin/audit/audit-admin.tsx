"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale, useT } from "@/i18n/locale-provider";
import { translateAuditAction, translateAuditEntity } from "@/i18n/labels";
import type { SerializedAdminAuditLog } from "@/lib/admin-audit.shared";
import { fetchJson } from "@/lib/fetch-json";

function SnapshotBlock({ label, data }: { label: string; data: unknown }) {
  if (data === null || data === undefined) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <pre className="max-h-40 overflow-auto rounded-lg bg-zinc-50 p-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function AuditEntry({ log }: { log: SerializedAdminAuditLog }) {
  const t = useT();
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);
  const entityLabel = translateAuditEntity(log.entityType, t);
  const actionLabel = translateAuditAction(log.action, t);
  const who = log.user.name?.trim() || log.user.email;
  const context =
    log.parentType && log.parentId
      ? `${log.parentType} · ${log.parentId}`
      : null;
  const when = new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(log.createdAt));

  return (
    <article className="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {actionLabel}: {log.entityLabel ?? entityLabel}
          </p>
          <p className="text-xs text-zinc-500">
            {entityLabel}
            {context ? ` · ${context}` : ""} · {who} · {when}
          </p>
        </div>
        <span className="shrink-0 text-xs text-zinc-400">{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div className="space-y-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-900">
          <SnapshotBlock label={t("admin.audit.before")} data={log.before} />
          <SnapshotBlock label={t("admin.audit.after")} data={log.after} />
          {!log.before && !log.after ? (
            <p className="text-xs text-zinc-500">{t("admin.audit.noDetails")}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function AuditAdmin() {
  const t = useT();
  const [logs, setLogs] = useState<SerializedAdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { response, data } = await fetchJson<{
        logs: SerializedAdminAuditLog[];
        error?: string;
      }>("/api/admin/audit?limit=100");

      if (!response.ok) {
        throw new Error(data?.error ?? t("admin.audit.errorLoad"));
      }

      setLogs(data?.logs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("admin.audit.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div>
        <p className="text-sm text-emerald-600">{t("admin.common.kicker")}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("admin.audit.title")}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">{t("admin.audit.subtitle")}</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("admin.audit.recentActivity")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="py-6 text-sm text-zinc-500">{t("admin.audit.loading")}</p>
          ) : logs.length === 0 ? (
            <p className="py-6 text-sm text-zinc-500">{t("admin.audit.empty")}</p>
          ) : (
            logs.map((log) => <AuditEntry key={log.id} log={log} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}

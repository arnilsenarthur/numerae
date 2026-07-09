"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import { Money } from "@/components/ui/money";
import { IconRepeat, IconSubscription } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { AppIcon, categoryDefaultIcon } from "@/lib/icon-utils";
import { useFinanceLabels } from "@/hooks/use-finance-labels";
import { useT } from "@/i18n/locale-provider";
import { type SerializedRecurring } from "@/types/finance";
import { financeTabPath, FINANCE_TABS } from "@/lib/app-routes";

function monthlyAmount(rec: SerializedRecurring): number {
  switch (rec.recurrence) {
    case "DAILY": return rec.amount * 30;
    case "WEEKLY": return rec.amount * 4.33;
    case "BIWEEKLY": return rec.amount * 2.17;
    case "MONTHLY": return rec.amount;
    case "BIMONTHLY": return rec.amount / 2;
    case "QUARTERLY": return rec.amount / 3;
    case "YEARLY": return rec.amount / 12;
    default: return rec.amount;
  }
}

export function FinanceSubscriptions() {
  const t = useT();
  const labels = useFinanceLabels();
  const [subscriptions, setSubscriptions] = useState<SerializedRecurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetchJson<{ recurring?: SerializedRecurring[] }>("/api/recurring");
        if (cancelled) return;
        if (res.response.ok) {
          const all = res.data?.recurring ?? [];
          setSubscriptions(all.filter((r) => r.category === "subscription" && r.active));
        } else {
          setError(t("finance.pages.subscriptions.loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [t]);

  const totalMonthly = useMemo(() => {
    const byCurrency = new Map<string, number>();
    for (const sub of subscriptions) {
      const monthly = monthlyAmount(sub);
      byCurrency.set(sub.currencyCode, (byCurrency.get(sub.currencyCode) ?? 0) + monthly);
    }
    return [...byCurrency.entries()];
  }, [subscriptions]);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}

      {totalMonthly.length > 0 ? (
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-baseline gap-4">
              <div>
                <p className="text-xs text-zinc-500">{t("finance.pages.subscriptions.totalMonthly")}</p>
                {totalMonthly.map(([currency, amount]) => (
                  <Money key={currency} value={amount} currency={currency} size="md" />
                ))}
              </div>
              <p className="text-xs text-zinc-400">
                {t(
                  subscriptions.length !== 1
                    ? "finance.pages.subscriptions.activeCountPlural"
                    : "finance.pages.subscriptions.activeCount",
                  { count: subscriptions.length },
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {subscriptions.length === 0 ? (
        <EmptyState
          icon={<IconSubscription className="h-6 w-6" />}
          title={t("finance.pages.subscriptions.emptyTitle")}
          description={t("finance.pages.subscriptions.emptyDescription")}
          action={
            <Link href={financeTabPath(FINANCE_TABS.recurring)}>
              <Button type="button" size="sm" variant="secondary">
                <IconRepeat size="sm" /> {t("finance.pages.subscriptions.manageRecurring")}
              </Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((sub) => {
              const nextDate = new Date(sub.nextDueAt);
              const daysUntil = Math.ceil(
                (nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
              );

              return (
                <Card key={sub.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                        <AppIcon
                          name={sub.icon ?? categoryDefaultIcon("subscription")}
                          size="sm"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{sub.description}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {labels.recurrenceLabel(sub.recurrence)}
                          </Badge>
                          {sub.accountName ? (
                            <span className="text-[10px] text-zinc-400">{sub.accountName}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-2">
                      <Money value={sub.amount} currency={sub.currencyCode} size="md" />
                      <p
                        className={`text-[10px] ${daysUntil < 0 ? "text-red-500" : daysUntil <= 3 ? "text-amber-500" : "text-zinc-400"}`}
                      >
                        {daysUntil < 0
                          ? t("finance.pages.subscriptions.overdue")
                          : daysUntil === 0
                            ? t("finance.pages.subscriptions.dueToday")
                            : t("finance.pages.subscriptions.dueInDays", { days: daysUntil })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <Link
              href={financeTabPath(FINANCE_TABS.recurring)}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
            >
              {t("finance.pages.subscriptions.manageAll")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

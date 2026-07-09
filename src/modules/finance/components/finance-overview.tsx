"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, DonutChart, type ChartPoint } from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { StatCard } from "@/components/ui/stat-card";
import { IconChart, IconTrendDown, IconTrendUp, IconWallet } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format-money";
import { useFinanceLabels } from "@/hooks/use-finance-labels";
import { useLocale, useT } from "@/i18n/locale-provider";
import type { AppLocale } from "@/i18n/locales";
import type { SerializedAccount } from "@/types/finance";
import type { FinanceSummary } from "@/modules/finance/hooks/use-finance-data";

function formatMonthLabel(monthKey: string, locale: AppLocale) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "short" });
}

export function FinanceOverview({
  summary,
  accounts,
  currency,
}: {
  summary: FinanceSummary | null;
  accounts: SerializedAccount[];
  currency: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const labels = useFinanceLabels();
  const totals = summary?.totals.find((item) => item.currencyCode === currency);
  const otherTotals = summary?.totals.filter((item) => item.currencyCode !== currency) ?? [];

  const balanceByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const account of accounts) {
      map.set(account.currencyCode, (map.get(account.currencyCode) ?? 0) + account.balance);
    }
    return [...map.entries()];
  }, [accounts]);

  const balanceInCurrency = balanceByCurrency.find(([code]) => code === currency)?.[1] ?? 0;

  const expenseDonut = useMemo<ChartPoint[]>(() => {
    if (!summary) return [];
    return summary.categories
      .filter((item) => item.kind === "EXPENSE" && item.currencyCode === currency)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((item) => ({
        label: labels.categoryLabel(item.category ?? "other"),
        value: item.total,
      }));
  }, [summary, currency, labels]);

  const monthlyBars = useMemo<ChartPoint[]>(() => {
    if (!summary) return [];
    return summary.monthly.map((month) => {
      const entry = month.series.find((item) => item.currencyCode === currency);
      const income = entry?.income ?? 0;
      const expense = entry?.expense ?? 0;
      return {
        label: formatMonthLabel(month.month, locale),
        value: income + expense,
        segments: [
          { label: t("finance.pages.overview.incomeLegend"), value: income, color: "bg-emerald-500" },
          { label: t("finance.pages.overview.expenseLegend"), value: expense, color: "bg-red-500" },
        ],
      };
    });
  }, [summary, currency, locale, t]);

  const hasData = (summary?.count ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("finance.pages.overview.incomeLabel", { currency })}
          value={totals?.income ?? 0}
          currency={currency}
          valueTone="income"
          icon={<IconTrendUp size="sm" />}
        />
        <StatCard
          label={t("finance.pages.overview.expenseLabel", { currency })}
          value={totals?.expense ?? 0}
          currency={currency}
          valueTone="expense"
          icon={<IconTrendDown size="sm" />}
        />
        <StatCard
          label={t("finance.pages.overview.netLabel", { currency })}
          value={totals?.net ?? 0}
          currency={currency}
          valueTone="auto"
          icon={<IconChart size="sm" />}
        />
        <StatCard
          label={t("finance.pages.overview.balanceLabel", { currency })}
          value={balanceInCurrency}
          currency={currency}
          valueTone="auto"
          icon={<IconWallet size="sm" />}
        />
      </div>

      {otherTotals.length > 0 ? (
        <p className="text-xs text-zinc-500">
          {t("finance.pages.overview.otherCurrencies")}{" "}
          {otherTotals
            .map(
              (item) =>
                `${item.currencyCode} ${formatMoney(item.net, { currency: item.currencyCode, showSign: true })}`,
            )
            .join(" · ")}
        </p>
      ) : null}

      {!hasData ? (
        <EmptyState
          icon={<IconChart className="h-6 w-6" />}
          title={t("finance.pages.overview.emptyTitle")}
          description={t("finance.pages.overview.emptyDescription")}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("finance.pages.overview.expensesByCategory")}</CardTitle>
              <CardDescription>{t("finance.pages.overview.expensesByCategoryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {expenseDonut.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  {t("finance.pages.overview.noExpenses")}
                </p>
              ) : (
                <DonutChart
                  segments={expenseDonut}
                  formatValue={(value) => formatMoney(value, { currency })}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("finance.pages.overview.monthlyFlow")}</CardTitle>
              <CardDescription>{t("finance.pages.overview.monthlyFlowDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {monthlyBars.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  {t("finance.pages.overview.noMonthlyData")}
                </p>
              ) : (
                <>
                  <BarChart
                    data={monthlyBars}
                    stacked
                    formatValue={(value) => formatMoney(value, { currency })}
                  />
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {t("finance.pages.overview.incomeLegend")}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      {t("finance.pages.overview.expenseLegend")}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {balanceByCurrency.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("finance.pages.overview.balanceByCurrency")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {balanceByCurrency.map(([code, total]) => (
                <div key={code}>
                  <p className="text-xs font-medium text-zinc-500">{code}</p>
                  <Money value={total} currency={code} size="lg" tone="auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

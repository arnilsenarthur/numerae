"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutChart, ColumnChart, type ChartPoint, type ChartSeries } from "@/components/ui/chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { StatCard } from "@/components/ui/stat-card";
import { IconChart, IconTrendDown, IconTrendUp, IconWallet } from "@/components/ui/icons";
import { formatMoney } from "@/lib/format-money";
import { categoryLabel, type SerializedAccount } from "@/types/finance";
import type { FinanceSummary } from "@/modules/finance/hooks/use-finance-data";

export function FinanceOverview({
  summary,
  accounts,
  currency,
}: {
  summary: FinanceSummary | null;
  accounts: SerializedAccount[];
  currency: string;
}) {
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
        label: categoryLabel(item.category ?? "other"),
        value: item.total,
      }));
  }, [summary, currency]);

  const monthlySeries = useMemo<ChartSeries[]>(() => {
    if (!summary) return [];
    const months = summary.monthly;
    const income: ChartPoint[] = [];
    const expense: ChartPoint[] = [];
    for (const month of months) {
      const entry = month.series.find((item) => item.currencyCode === currency);
      const label = month.month.slice(5);
      income.push({ label, value: entry?.income ?? 0 });
      expense.push({ label, value: entry?.expense ?? 0 });
    }
    return [
      { id: "income", label: "Entradas", data: income },
      { id: "expense", label: "Saídas", data: expense },
    ];
  }, [summary, currency]);

  const hasData = (summary?.count ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Entradas (${currency})`}
          value={totals?.income ?? 0}
          currency={currency}
          icon={<IconTrendUp size="sm" />}
        />
        <StatCard
          label={`Saídas (${currency})`}
          value={totals?.expense ?? 0}
          currency={currency}
          icon={<IconTrendDown size="sm" />}
        />
        <StatCard
          label={`Resultado no período (${currency})`}
          value={totals?.net ?? 0}
          currency={currency}
          icon={<IconChart size="sm" />}
        />
        <StatCard
          label={`Saldo atual (${currency})`}
          value={balanceInCurrency}
          currency={currency}
          icon={<IconWallet size="sm" />}
        />
      </div>

      {otherTotals.length > 0 ? (
        <p className="text-xs text-zinc-500">
          Outras moedas no período:{" "}
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
          icon={<IconChart className="h-10 w-10 text-zinc-400" />}
          title="Sem lançamentos no período"
          description="Registre entradas e saídas na aba Lançamentos para ver os relatórios."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Gastos por categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseDonut.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Nenhuma saída no período.
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
              <CardTitle className="text-base">Entradas vs saídas por mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ColumnChart
                data={monthlySeries[0]?.data ?? []}
                series={monthlySeries}
                formatValue={(value) => formatMoney(value, { currency })}
                fullWidth
              />
            </CardContent>
          </Card>
        </div>
      )}

      {balanceByCurrency.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Saldo total por moeda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {balanceByCurrency.map(([code, total]) => (
                <div key={code}>
                  <p className="text-xs font-medium text-zinc-500">{code}</p>
                  <Money value={total} currency={code} size="lg" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

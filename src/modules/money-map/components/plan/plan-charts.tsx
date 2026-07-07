"use client";

import { useMemo } from "react";
import {
  Chart,
  ColumnChart,
  DonutChart,
  LineChart,
  type ChartPoint,
  type ChartSeries,
} from "@/components/ui";
import { formatMoney } from "@/lib/format-money";
import type { MonthlyProjection, PlanAnalytics } from "@/modules/money-map/engines/types";

type PlanChartsProps = {
  timeline: MonthlyProjection[];
  analytics?: PlanAnalytics | null;
};

const formatBrl = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function sampleTimeline(timeline: MonthlyProjection[], maxPoints = 24): MonthlyProjection[] {
  if (timeline.length <= maxPoints) return timeline;
  const step = Math.ceil(timeline.length / maxPoints);
  return timeline.filter((_, index) => index % step === 0 || index === timeline.length - 1);
}

export function PlanCharts({ timeline, analytics }: PlanChartsProps) {
  const sampled = useMemo(() => sampleTimeline(timeline), [timeline]);

  const lineSeries = useMemo<ChartSeries[]>(() => {
    const points = (pick: (row: MonthlyProjection) => number): ChartPoint[] =>
      sampled.map((row) => ({ label: `${row.month}m`, value: pick(row) }));

    return [
      {
        id: "cumulative",
        label: "Acumulado",
        strokeClassName: "stroke-cyan-600",
        data: points((row) => row.cumulativeNetBrl),
      },
      {
        id: "gross",
        label: "Entradas",
        strokeClassName: "stroke-emerald-500",
        data: points((row) => row.grossBrl),
      },
      {
        id: "expenses",
        label: "Saídas",
        strokeClassName: "stroke-rose-500",
        data: points((row) => row.expensesBrl),
      },
      {
        id: "net",
        label: "Líquido/mês",
        strokeClassName: "stroke-indigo-500",
        data: points((row) => row.netBrl),
      },
    ];
  }, [sampled]);

  const columnData = useMemo<ChartPoint[]>(
    () => sampled.map((row) => ({ label: `${row.month}m`, value: row.netBrl })),
    [sampled],
  );

  const expenseDonut = useMemo<ChartPoint[]>(() => {
    if (!analytics?.byCategory.length) return [];
    return analytics.byCategory
      .filter((row) => row.expenseBrl > 0)
      .map((row) => ({ label: row.label, value: row.expenseBrl }));
  }, [analytics?.byCategory]);

  if (timeline.length === 0) {
    return <p className="text-sm text-zinc-500">Sem dados para gráfico.</p>;
  }

  return (
    <div className="space-y-6 overflow-visible">
      <div>
        <p className="mb-2 text-xs font-medium text-zinc-500">Evolução no horizonte</p>
        <LineChart
          fullWidth
          data={lineSeries[0]!.data}
          series={lineSeries}
          formatValue={formatBrl}
          animateKey={timeline.length}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="overflow-visible rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="mb-2 text-xs font-medium text-zinc-500">Líquido por mês</p>
          <ColumnChart data={columnData} formatValue={formatBrl} animateKey={timeline.length} />
        </div>

        {expenseDonut.length > 0 ? (
          <div className="overflow-visible rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium text-zinc-500">Saídas por categoria</p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              <DonutChart segments={expenseDonut} size={120} formatValue={formatBrl} />
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                {expenseDonut.map((segment) => (
                  <li key={segment.label} className="flex justify-between gap-4">
                    <span>{segment.label}</span>
                    <span className="tabular-nums">{formatMoney(segment.value)}/mês</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="overflow-visible rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium text-zinc-500">Acumulado</p>
            <Chart
              variant="line"
              data={lineSeries[0]!.data}
              showArea
              showGrid
              fullWidth
              formatValue={formatBrl}
              animateKey={`area-${timeline.length}`}
              strokeClassName="stroke-cyan-600"
            />
          </div>
        )}
      </div>
    </div>
  );
}

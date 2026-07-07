"use client";

import { formatMoney } from "@/lib/format-money";
import type { SimulationResult } from "@/modules/money-map/engines/types";
import type { SerializedFinancialGoal } from "@/lib/goal-serializer";
import { PlanBreakdown } from "@/modules/money-map/components/plan/plan-breakdown";
import { PlanCharts } from "@/modules/money-map/components/plan/plan-charts";
import { PlanTimelineTable } from "@/modules/money-map/components/plan/plan-timeline-table";

type PlanSummaryProps = {
  simulation: SimulationResult | null;
  simulating: boolean;
  goals: SerializedFinancialGoal[];
  hasTreatments?: boolean;
};

export function PlanSummary({ simulation, simulating, goals, hasTreatments }: PlanSummaryProps) {
  if (simulating && !simulation) {
    return <p className="text-sm text-zinc-500">Calculando projeção…</p>;
  }

  if (!simulation) {
    return (
      <p className="text-sm text-zinc-500">
        Cadastre entradas e saídas na aba Movimentos para ver a projeção aqui.
      </p>
    );
  }

  const analytics = simulation.analytics;
  const route = simulation.routes[0];
  const timeline = analytics?.timeline ?? route?.monthly ?? [];
  const totals = analytics?.totals ?? route?.totals;
  const horizon = simulation.horizonMonths || timeline.length || 12;

  const monthlyNet =
    timeline.length > 0 && totals
      ? totals.netBrl / timeline.length
      : route?.totals.netBrl
        ? route.totals.netBrl / (route.monthly.length || horizon)
        : 0;

  const accumulated =
    analytics?.accumulatedForGoals ??
    timeline[timeline.length - 1]?.cumulativeNetBrl ??
    route?.totals.netBrl ??
    0;

  const longTermViewer = simulation.viewers.reduce(
    (best, viewer) => (viewer.months > (best?.months ?? 0) ? viewer : best),
    simulation.viewers[0],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
        {hasTreatments
          ? `Projeção com tratamentos lineares. ${simulation.recommendation.summary}`
          : "Projeção direta dos lançamentos — sem tratamentos nas entradas."}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Entradas" value={simulation.incomeLabel} />
        <SummaryCard
          label="Líquido estimado"
          value={`${formatMoney(monthlyNet)}/mês`}
          hint={simulation.recommendation.summary}
        />
        <SummaryCard label={`Acumulado (${horizon}m)`} value={formatMoney(accumulated)} />
        <SummaryCard label="Impostos (período)" value={formatMoney(totals?.taxBrl ?? 0)} />
      </div>

      {totals ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Total entradas" value={formatMoney(totals.grossBrl)} />
          <SummaryCard label="Total saídas" value={formatMoney(totals.expensesBrl)} />
          <SummaryCard label="Investido" value={formatMoney(totals.investedBrl)} />
        </div>
      ) : null}

      {longTermViewer && longTermViewer.months > horizon ? (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
            Projeção longo prazo
          </p>
          <p className="mt-1 text-sm">
            {longTermViewer.label}: {formatMoney(longTermViewer.cumulativeNetBrl)} em{" "}
            {longTermViewer.months} meses
          </p>
        </div>
      ) : null}

      {timeline.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Projeção mês a mês
          </p>
          <div className="mt-3">
            <PlanCharts timeline={timeline} analytics={analytics} />
          </div>
        </div>
      ) : null}

      <PlanBreakdown analytics={analytics} />

      {timeline.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <PlanTimelineTable timeline={timeline} horizonMonths={horizon} />
        </div>
      ) : null}

      {simulation.routes.length > 1 ? (
        <p className="text-sm text-zinc-500">
          {simulation.routes.length} rotas calculadas — compare na aba Calculadoras.
        </p>
      ) : null}

      {goals.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Metas</p>
          <p className="mt-1 text-xs text-zinc-500">
            Progresso estimado ({formatMoney(accumulated)} acumulado na projeção).
          </p>
          <ul className="mt-3 space-y-3">
            {goals.map((goal) => {
              const simulatedProgress = Math.min(goal.targetAmount, accumulated);
              const progress =
                goal.targetAmount > 0 ? (simulatedProgress / goal.targetAmount) * 100 : 0;
              return (
                <li key={goal.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{goal.title}</span>
                    <span className="tabular-nums text-zinc-500">
                      {formatMoney(simulatedProgress)} / {formatMoney(goal.targetAmount)}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-snug text-zinc-500">{hint}</p> : null}
    </div>
  );
}

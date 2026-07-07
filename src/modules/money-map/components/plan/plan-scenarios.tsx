"use client";

import { formatMoney } from "@/lib/format-money";
import type { SimulationResult } from "@/modules/money-map/engines/types";

export function PlanScenarios({ simulation }: { simulation: SimulationResult | null }) {
  if (!simulation?.routes.length) {
    return (
      <p className="text-sm text-zinc-500">
        Conecte entradas paralelas (ex.: vários câmbios ou CLT vs PJ) para comparar cenários.
      </p>
    );
  }

  const sorted = [...simulation.routes].sort((a, b) => b.totals.netBrl - a.totals.netBrl);
  const best = sorted[0];

  return (
    <div className="space-y-3">
      {simulation.recommendation.summary ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          {simulation.recommendation.summary}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
            <tr>
              <th className="px-3 py-2">Cenário</th>
              <th className="px-3 py-2">Líquido/mês</th>
              <th className="px-3 py-2">Impostos</th>
              <th className="px-3 py-2">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((route) => {
              const months = route.monthly.length || 1;
              const netMonth = route.totals.netBrl / months;
              const isBest = best && route.pathId === best.pathId;
              return (
                <tr
                  key={route.pathId}
                  className={isBest ? "bg-emerald-50/60 dark:bg-emerald-950/20" : "border-t border-zinc-100 dark:border-zinc-800/80"}
                >
                  <td className="px-3 py-2 font-medium">
                    {route.pathLabel}
                    {isBest ? (
                      <span className="ml-2 text-xs font-normal text-emerald-700 dark:text-emerald-400">
                        melhor
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(netMonth)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(route.totals.taxBrl)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatMoney(route.totals.netBrl)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

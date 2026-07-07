"use client";

import { formatMoney } from "@/lib/format-money";
import type { PlanAnalytics, PlanLineItem } from "@/modules/money-map/engines/types";
import { lineItemMonthlyBrl } from "@/modules/money-map/components/plan/plan-timeline-table";

type PlanBreakdownProps = {
  analytics: PlanAnalytics | null | undefined;
};

export function PlanBreakdown({ analytics }: PlanBreakdownProps) {
  if (!analytics?.lineItems.length) {
    return null;
  }

  const incomes = analytics.lineItems.filter((item) => item.kind === "income");
  const expenses = analytics.lineItems.filter((item) => item.kind === "expense");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BreakdownSection title="Entradas" items={incomes} />
      <BreakdownSection title="Saídas" items={expenses} />

      {analytics.byCategory.length > 0 ? (
        <div className="lg:col-span-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Por categoria</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs text-zinc-500">
                <tr>
                  <th className="pb-2 pr-4">Categoria</th>
                  <th className="pb-2 pr-4">Entradas</th>
                  <th className="pb-2 pr-4">Saídas</th>
                  <th className="pb-2">Saldo/mês</th>
                </tr>
              </thead>
              <tbody>
                {analytics.byCategory.map((row) => (
                  <tr key={row.category} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 pr-4">{row.label}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {row.incomeBrl > 0 ? formatMoney(row.incomeBrl) : "—"}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {row.expenseBrl > 0 ? formatMoney(row.expenseBrl) : "—"}
                    </td>
                    <td className="py-2 tabular-nums">{formatMoney(row.netBrl)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BreakdownSection({ title, items }: { title: string; items: PlanLineItem[] }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</p>
      <ul className="mt-2 space-y-2">
        {items.map((item) => {
          const monthlyBrl = lineItemMonthlyBrl(item);
          return (
            <li key={item.nodeId} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-zinc-500">{periodLabel(item.period)}</p>
              </div>
              <span className="shrink-0 tabular-nums">
                {monthlyBrl != null ? `${formatMoney(monthlyBrl)}/mês` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function periodLabel(period: PlanLineItem["period"]) {
  if (period === "monthly") return "Mensal";
  if (period === "annual") return "Anual";
  return "Única";
}

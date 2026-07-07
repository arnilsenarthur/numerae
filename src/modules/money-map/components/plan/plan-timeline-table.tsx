"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { formatMoney } from "@/lib/format-money";
import type { MonthlyProjection } from "@/modules/money-map/engines/types";
import { formatMoneyValue } from "@/modules/money-map/lib/node-definitions";

type PlanTimelineTableProps = {
  timeline: MonthlyProjection[];
  horizonMonths: number;
};

export function PlanTimelineTable({ timeline, horizonMonths }: PlanTimelineTableProps) {
  const columns = useMemo<DataTableColumn<MonthlyProjection>[]>(
    () => [
      {
        id: "month",
        header: "Mês",
        sortable: true,
        sortValue: (row) => row.month,
        cell: (row) => <span className="font-medium">{row.month}</span>,
      },
      {
        id: "gross",
        header: "Entradas",
        align: "right",
        sortable: true,
        sortValue: (row) => row.grossBrl,
        cell: (row) => <span className="tabular-nums">{formatMoney(row.grossBrl)}</span>,
      },
      {
        id: "expenses",
        header: "Saídas",
        align: "right",
        sortable: true,
        sortValue: (row) => row.expensesBrl,
        cell: (row) => <span className="tabular-nums">{formatMoney(row.expensesBrl)}</span>,
      },
      {
        id: "net",
        header: "Líquido",
        align: "right",
        sortable: true,
        sortValue: (row) => row.netBrl,
        cell: (row) => <span className="tabular-nums">{formatMoney(row.netBrl)}</span>,
      },
      {
        id: "cumulative",
        header: "Acumulado",
        align: "right",
        sortable: true,
        sortValue: (row) => row.cumulativeNetBrl,
        cell: (row) => (
          <span className="tabular-nums font-medium">{formatMoney(row.cumulativeNetBrl)}</span>
        ),
      },
      {
        id: "actual",
        header: "Realizado",
        align: "right",
        cell: () => (
          <Badge variant="outline" className="text-[10px]">
            Open Finance
          </Badge>
        ),
      },
    ],
    [],
  );

  if (timeline.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Comportamento mês a mês ({horizonMonths} meses)
      </p>
      <DataTable
        data={timeline}
        columns={columns}
        getRowKey={(row) => String(row.month)}
        pageSize={6}
        searchable={false}
      />
    </div>
  );
}

/** Valor na moeda original — use só na aba Movimentos, não no resumo. */
export function formatEntryAmount(amount: number, currency: string) {
  return currency === "BRL" ? formatMoney(amount) : formatMoneyValue(amount, currency);
}

function lineItemMonthlyBrl(item: {
  currency: string;
  monthlyNative: number;
  monthlyBrl: number | null;
}): number | null {
  if (item.monthlyBrl != null) return item.monthlyBrl;
  if (item.currency === "BRL") return item.monthlyNative;
  return null;
}

export { lineItemMonthlyBrl };

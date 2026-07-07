"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconPlus, IconX } from "@/components/ui/icons";
import type { SerializedMoneyMapNode } from "@/lib/money-map-serializer";
import type { MoneyPeriod, RouteQuote } from "@/modules/money-map/engines/types";
import { EXPENSE_CATEGORY_LABELS } from "@/modules/money-map/engines/types";
import {
  EXPENSE_CATEGORY_OPTIONS,
  INCOME_CATEGORY_OPTIONS,
  PERIOD_OPTIONS,
} from "@/modules/money-map/lib/node-definitions";
import { formatEntryAmount } from "@/modules/money-map/components/plan/plan-timeline-table";
import { EntryTreatmentsFields } from "@/modules/money-map/components/plan/entry-treatments-fields";
import type { MoneyMapCatalogData } from "@/modules/money-map/hooks/use-money-map-catalog";
import {
  newTreatmentId,
  parseTreatments,
  type PlanEntryConfig,
  type PlanTreatment,
} from "@/modules/money-map/plan/entry-types";

export type EntryRow = {
  id: string;
  kind: "INCOME" | "EXPENSE";
  label: string;
  amount: number;
  currency: string;
  period: MoneyPeriod;
  category: string;
  onceMonth?: number;
  treatmentCount: number;
  source: string;
};

type SaveEntryPayload = {
  patch: Record<string, unknown>;
  label?: string;
  treatments?: PlanTreatment[];
};

type PlanEntriesProps = {
  nodes: SerializedMoneyMapNode[];
  catalog: MoneyMapCatalogData;
  quotes?: RouteQuote[];
  saving?: boolean;
  onAdd: (kind: "INCOME" | "EXPENSE") => void;
  onSaveEntry: (nodeId: string, payload: SaveEntryPayload) => void | Promise<void>;
  onDelete: (nodeId: string) => void;
};

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

const INCOME_LABELS: Record<string, string> = {
  salary: "Salário",
  business: "Empresa",
  investment: "Investimentos",
  other: "Outros",
};

function isEntryNode(node: SerializedMoneyMapNode) {
  return (node.type === "INCOME" || node.type === "EXPENSE") && node.config.movement !== false;
}

function nodeToRow(node: SerializedMoneyMapNode): EntryRow {
  const treatments = parseTreatments(node.config.treatments);
  return {
    id: node.id,
    kind: node.type as "INCOME" | "EXPENSE",
    label: node.label ?? (node.type === "INCOME" ? "Entrada" : "Saída"),
    amount: Number(node.config.amount) || 0,
    currency: String(node.config.currency ?? "BRL"),
    period: (node.config.period as MoneyPeriod) ?? "once",
    category: String(node.config.category ?? "other"),
    onceMonth: node.config.onceMonth != null ? Number(node.config.onceMonth) : undefined,
    treatmentCount: treatments.length,
    source: String(node.config.source ?? "manual"),
  };
}

function categoryLabel(kind: "INCOME" | "EXPENSE", category: string) {
  if (kind === "INCOME") return INCOME_LABELS[category] ?? category;
  return EXPENSE_CATEGORY_LABELS[category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? category;
}

function periodSuffix(period: MoneyPeriod) {
  if (period === "monthly") return "/mês";
  if (period === "annual") return "/ano";
  return "";
}

function rowAccentClass(row: EntryRow, editingId: string | null) {
  if (row.id === editingId) return "bg-zinc-100/80 dark:bg-zinc-900/60";
  if (row.kind === "INCOME") return "border-l-2 border-l-emerald-500/70";
  return "border-l-2 border-l-rose-400/70";
}

export function PlanEntries({
  nodes,
  catalog,
  quotes = [],
  saving = false,
  onAdd,
  onSaveEntry,
  onDelete,
}: PlanEntriesProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const rows = useMemo(() => nodes.filter(isEntryNode).map(nodeToRow), [nodes]);
  const editingNode = nodes.find((node) => node.id === editingId && isEntryNode(node));

  const columns = useMemo<DataTableColumn<EntryRow>[]>(
    () => [
      {
        id: "kind",
        header: "Tipo",
        getCellClassName: (row) => rowAccentClass(row, editingId),
        cell: (row) => (
          <Badge variant={row.kind === "INCOME" ? "success" : "outline"} className="text-[10px]">
            {row.kind === "INCOME" ? "Entrada" : "Saída"}
          </Badge>
        ),
      },
      {
        id: "label",
        header: "Descrição",
        sortable: true,
        sortValue: (row) => row.label,
        getCellClassName: (row) => rowAccentClass(row, editingId),
        cell: (row) => (
          <div>
            <span className="font-medium">{row.label}</span>
            {row.treatmentCount > 0 ? (
              <span className="ml-2 text-xs text-zinc-500">{row.treatmentCount} trat.</span>
            ) : null}
          </div>
        ),
      },
      {
        id: "amount",
        header: "Valor",
        align: "right",
        sortable: true,
        sortValue: (row) => row.amount,
        getCellClassName: (row) => rowAccentClass(row, editingId),
        cell: (row) => (
          <span className="tabular-nums">
            {formatEntryAmount(row.amount, row.currency)}
            {periodSuffix(row.period)}
          </span>
        ),
      },
      {
        id: "period",
        header: "Repete",
        getCellClassName: (row) => rowAccentClass(row, editingId),
        cell: (row) =>
          PERIOD_OPTIONS.find((option) => option.value === row.period)?.label ?? row.period,
      },
      {
        id: "category",
        header: "Categoria",
        getCellClassName: (row) => rowAccentClass(row, editingId),
        cell: (row) => categoryLabel(row.kind, row.category),
      },
      {
        id: "actions",
        header: "",
        align: "right",
        getCellClassName: (row) => rowAccentClass(row, editingId),
        cell: (row) => (
          <div className="flex justify-end gap-1">
            <Button
              type="button"
              variant={editingId === row.id ? "primary" : "secondary"}
              size="sm"
              onClick={() => setEditingId(editingId === row.id ? null : row.id)}
            >
              {editingId === row.id ? "Fechar" : "Editar"}
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => onDelete(row.id)}>
              Excluir
            </Button>
          </div>
        ),
      },
    ],
    [editingId, onDelete],
  );

  return (
    <div className="space-y-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Lançamentos do plano — clique em Editar para ajustar valores e tratamentos.
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => onAdd("INCOME")}>
            <IconPlus size="sm" /> Entrada
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => onAdd("EXPENSE")}>
            <IconPlus size="sm" /> Saída
          </Button>
        </div>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row.id}
        pageSize={8}
        searchPlaceholder="Buscar lançamento…"
        emptyMessage="Nenhum lançamento. Adicione entradas e saídas."
      />

      {editingNode ? (
        <EntryEditor
          node={editingNode}
          catalog={catalog}
          quotes={quotes}
          saving={saving}
          onSave={async (payload) => {
            await onSaveEntry(editingNode.id, payload);
          }}
          onClose={() => setEditingId(null)}
        />
      ) : null}
    </div>
  );
}

function EntryEditor({
  node,
  catalog,
  quotes,
  saving,
  onSave,
  onClose,
}: {
  node: SerializedMoneyMapNode;
  catalog: MoneyMapCatalogData;
  quotes: RouteQuote[];
  saving: boolean;
  onSave: (payload: SaveEntryPayload) => void | Promise<void>;
  onClose: () => void;
}) {
  const kind = node.type as "INCOME" | "EXPENSE";
  const [label, setLabel] = useState(node.label ?? (kind === "INCOME" ? "Entrada" : "Saída"));
  const [amount, setAmount] = useState(String(node.config.amount ?? 0));
  const [currency, setCurrency] = useState(String(node.config.currency ?? "BRL"));
  const [period, setPeriod] = useState((node.config.period as MoneyPeriod) ?? "once");
  const [category, setCategory] = useState(String(node.config.category ?? "other"));
  const [onceMonth, setOnceMonth] = useState(String(node.config.onceMonth ?? 1));
  const [treatments, setTreatments] = useState<PlanTreatment[]>(() =>
    parseTreatments(node.config.treatments),
  );

  const categoryOptions =
    kind === "INCOME"
      ? INCOME_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))
      : EXPENSE_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }));

  const accent =
    kind === "INCOME"
      ? "border-emerald-500/40 bg-emerald-50/30 dark:bg-emerald-950/10"
      : "border-rose-400/40 bg-rose-50/30 dark:bg-rose-950/10";

  return (
    <section className={`mt-4 border-t-2 pt-4 ${accent}`}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">
            Editando: {label || (kind === "INCOME" ? "Entrada" : "Saída")}
          </p>
          <p className="text-xs text-zinc-500">
            {kind === "INCOME" ? "Entrada" : "Saída"} · ajuste os campos e salve
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fechar">
          <IconX size="sm" />
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1 sm:col-span-2">
          <Label>Descrição</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: salário…" />
        </div>
        <div className="space-y-1">
          <Label>Valor</Label>
          <NumberInput value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Moeda</Label>
          <Select
            options={catalog.currencyOptions.length ? catalog.currencyOptions : CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
          />
        </div>
        <div className="space-y-1">
          <Label>Repetição</Label>
          <Select
            options={PERIOD_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            value={period}
            onChange={(value) => setPeriod(value as MoneyPeriod)}
          />
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select options={categoryOptions} value={category} onChange={setCategory} />
        </div>
        {period === "once" ? (
          <div className="space-y-1">
            <Label>Mês (única)</Label>
            <NumberInput value={onceMonth} onChange={(e) => setOnceMonth(e.target.value)} />
          </div>
        ) : null}
      </div>

      {kind === "INCOME" ? (
        <div className="mt-4">
          <EntryTreatmentsFields
            treatments={treatments}
            onChange={setTreatments}
            entryLabel={label}
            entryAmount={Number(amount) || 0}
            entryCurrency={currency as PlanEntryConfig["currency"]}
            entryPeriod={period}
            catalog={catalog}
            quotes={quotes}
          />
        </div>
      ) : null}

      <div className="mt-4 flex gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800/80">
        <Button
          type="button"
          disabled={saving}
          onClick={() =>
            void onSave({
              label: label.trim() || undefined,
              patch: {
                amount: Number(amount) || 0,
                currency,
                period,
                category,
                onceMonth: period === "once" ? Number(onceMonth) || 1 : undefined,
                movement: true,
                source: "manual",
              },
              treatments:
                kind === "INCOME"
                  ? treatments.map((t) => ({ ...t, id: t.id || newTreatmentId() }))
                  : undefined,
            }).then(() => onClose())
          }
        >
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
      </div>
    </section>
  );
}

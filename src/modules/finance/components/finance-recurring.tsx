"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { NumberInput, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { IconPlus, IconRepeat } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import {
  RECURRENCE_LABELS,
  TRANSACTION_KIND_LABELS,
  categoriesForKind,
  categoryLabel,
  type RecurrenceType,
  type SerializedAccount,
  type SerializedRecurring,
  type TransactionKind,
} from "@/types/finance";

type RecurringForm = {
  accountId: string;
  kind: TransactionKind;
  amount: string;
  category: string;
  description: string;
  recurrence: RecurrenceType;
  dayOfPeriod: string;
  nextDueAt: string;
  endAt: string;
  notes: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = (accountId = ""): RecurringForm => ({
  accountId,
  kind: "EXPENSE",
  amount: "",
  category: "other",
  description: "",
  recurrence: "MONTHLY",
  dayOfPeriod: String(new Date().getDate()),
  nextDueAt: todayIso(),
  endAt: "",
  notes: "",
});

const KIND_OPTIONS = (Object.keys(TRANSACTION_KIND_LABELS) as TransactionKind[])
  .filter((k) => k !== "TRANSFER")
  .map((kind) => ({ value: kind, label: TRANSACTION_KIND_LABELS[kind] }));

const RECURRENCE_OPTIONS = (Object.keys(RECURRENCE_LABELS) as RecurrenceType[]).map((r) => ({
  value: r,
  label: RECURRENCE_LABELS[r],
}));

function recurrenceBadge(r: RecurrenceType) {
  return RECURRENCE_LABELS[r] ?? r;
}

function upcomingDays(nextDueAt: string): number {
  const now = Date.now();
  const due = new Date(nextDueAt).getTime();
  return Math.ceil((due - now) / (1000 * 60 * 60 * 24));
}

export function FinanceRecurring({
  accounts,
  onChanged,
}: {
  accounts: SerializedAccount[];
  onChanged: () => void;
}) {
  const [records, setRecords] = useState<SerializedRecurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { response, data } = await fetchJson<{
      recurring?: SerializedRecurring[];
      error?: string;
    }>("/api/recurring?includeInactive=true");
    setLoading(false);
    if (response.ok) setRecords(data?.recurring ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accountOptions = useMemo(
    () =>
      accounts.map((a) => ({
        value: a.id,
        label: `${a.name} (${a.currencyCode})`,
      })),
    [accounts],
  );

  const categoryOptions = useMemo(() => {
    const list = categoriesForKind(form.kind);
    return list.map((item) => ({ value: item.value, label: item.label }));
  }, [form.kind]);

  function startCreate(kind: TransactionKind = "EXPENSE") {
    setEditingId(null);
    setForm({
      ...emptyForm(accounts[0]?.id ?? ""),
      kind,
      category: kind === "INCOME" ? "salary" : "other",
    });
    setError(null);
    setModalOpen(true);
  }

  function startEdit(rec: SerializedRecurring) {
    setEditingId(rec.id);
    setForm({
      accountId: rec.accountId,
      kind: rec.kind,
      amount: String(rec.amount),
      category: rec.category,
      description: rec.description,
      recurrence: rec.recurrence,
      dayOfPeriod: String(rec.dayOfPeriod),
      nextDueAt: rec.nextDueAt.slice(0, 10),
      endAt: rec.endAt ? rec.endAt.slice(0, 10) : "",
      notes: rec.notes ?? "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        accountId: form.accountId,
        kind: form.kind,
        amount: Number(form.amount) || 0,
        category: form.category,
        description: form.description,
        recurrence: form.recurrence,
        dayOfPeriod: Number(form.dayOfPeriod) || 1,
        nextDueAt: form.nextDueAt,
        endAt: form.endAt || null,
        notes: form.notes || null,
      };
      const { response, data } = await fetchJson<{ error?: string }>(
        editingId ? `/api/recurring/${editingId}` : "/api/recurring",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error((data as { error?: string })?.error ?? "Erro ao salvar.");
      setModalOpen(false);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rec: SerializedRecurring) {
    const { response, data } = await fetchJson<{ error?: string }>(
      `/api/recurring/${rec.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !rec.active }),
      },
    );
    if (!response.ok) {
      setError((data as { error?: string })?.error ?? "Erro ao atualizar.");
      return;
    }
    await load();
  }

  async function remove(rec: SerializedRecurring) {
    if (!confirm(`Excluir a recorrência "${rec.description}"?`)) return;
    const { response, data } = await fetchJson<{ error?: string }>(
      `/api/recurring/${rec.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setError((data as { error?: string })?.error ?? "Erro ao excluir.");
      return;
    }
    await load();
    onChanged();
  }

  const columns = useMemo<DataTableColumn<SerializedRecurring>[]>(
    () => [
      {
        id: "description",
        header: "Descrição",
        cell: (row) => (
          <div>
            <p className="font-medium">{row.description}</p>
            <p className="text-xs text-zinc-500">{categoryLabel(row.category)}</p>
          </div>
        ),
      },
      {
        id: "kind",
        header: "Tipo",
        cell: (row) => (
          <Badge variant={row.kind === "INCOME" ? "success" : "error"}>
            {TRANSACTION_KIND_LABELS[row.kind]}
          </Badge>
        ),
      },
      {
        id: "amount",
        header: "Valor",
        cell: (row) => <Money value={row.amount} currency={row.currencyCode} />,
      },
      {
        id: "recurrence",
        header: "Frequência",
        cell: (row) => (
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {recurrenceBadge(row.recurrence)}
          </span>
        ),
      },
      {
        id: "nextDueAt",
        header: "Próximo",
        sortable: true,
        sortValue: (row) => row.nextDueAt,
        cell: (row) => {
          if (!row.active) {
            return <span className="text-xs text-zinc-400">Inativa</span>;
          }
          const days = upcomingDays(row.nextDueAt);
          const label = new Date(row.nextDueAt).toLocaleDateString("pt-BR");
          const urgent = days <= 3 && days >= 0;
          const overdue = days < 0;
          return (
            <div>
              <p className={overdue ? "text-sm font-medium text-red-600" : urgent ? "text-sm font-medium text-amber-600" : "text-sm"}>
                {label}
              </p>
              <p className="text-xs text-zinc-400">
                {overdue ? `Atrasado ${Math.abs(days)}d` : days === 0 ? "Hoje" : `Em ${days}d`}
              </p>
            </div>
          );
        },
      },
      {
        id: "active",
        header: "Status",
        cell: (row) => (
          <button
            type="button"
            onClick={() => void toggleActive(row)}
            className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            {row.active ? "Ativa ✓" : "Pausada"}
          </button>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: (row) => (
          <div className="flex gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(row)}>
              Editar
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => void remove(row)}>
              Excluir
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Lançamentos automáticos gerados todo período conforme a frequência definida.
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => startCreate("INCOME")}>
            <IconPlus size="sm" /> Entrada recorrente
          </Button>
          <Button type="button" size="sm" onClick={() => startCreate("EXPENSE")}>
            <IconPlus size="sm" /> Saída recorrente
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Carregando…</p>
      ) : records.length === 0 ? (
        <EmptyState
          icon={<IconRepeat className="h-10 w-10 text-zinc-400" />}
          title="Nenhuma recorrência cadastrada"
          description="Crie entradas recorrentes para salário, aluguel, assinaturas e o sistema lança automaticamente."
          action={
            <Button type="button" size="sm" onClick={() => startCreate()}>
              <IconPlus size="sm" /> Nova recorrência
            </Button>
          }
        />
      ) : (
        <DataTable
          data={records}
          columns={columns}
          getRowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar recorrência…"
        />
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar recorrência" : "Nova recorrência"}
        size="lg"
        className="max-w-lg"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      >
        {error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ex.: Salário, Aluguel, Netflix…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                options={KIND_OPTIONS}
                value={form.kind}
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    kind: value as TransactionKind,
                    category: value === "INCOME" ? "salary" : "other",
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select
                options={categoryOptions}
                value={form.category}
                onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Conta</Label>
              <Select
                options={accountOptions}
                value={form.accountId}
                onChange={(value) => setForm((prev) => ({ ...prev, accountId: value }))}
                placeholder="Selecione a conta"
              />
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <NumberInput
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Frequência</Label>
              <Select
                options={RECURRENCE_OPTIONS}
                value={form.recurrence}
                onChange={(value) => setForm((prev) => ({ ...prev, recurrence: value as RecurrenceType }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Dia do mês</Label>
              <NumberInput
                value={form.dayOfPeriod}
                onChange={(e) => setForm((prev) => ({ ...prev, dayOfPeriod: e.target.value }))}
                placeholder="1-28"
              />
            </div>
            <div className="space-y-1">
              <Label>Próximo vencimento</Label>
              <Input
                type="date"
                value={form.nextDueAt}
                onChange={(e) => setForm((prev) => ({ ...prev, nextDueAt: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Encerrar em (opcional)</Label>
            <Input
              type="date"
              value={form.endAt}
              onChange={(e) => setForm((prev) => ({ ...prev, endAt: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

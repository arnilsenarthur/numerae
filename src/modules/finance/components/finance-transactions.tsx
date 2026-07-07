"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { IconPlus } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import {
  TRANSACTION_KIND_LABELS,
  categoriesForKind,
  categoryLabel,
  type SerializedAccount,
  type SerializedTransaction,
  type TransactionKind,
} from "@/types/finance";

type TransactionForm = {
  accountId: string;
  kind: TransactionKind;
  amount: string;
  category: string;
  description: string;
  date: string;
  counterAccountId: string;
  counterAmount: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = (accountId = ""): TransactionForm => ({
  accountId,
  kind: "EXPENSE",
  amount: "",
  category: "other",
  description: "",
  date: todayIso(),
  counterAccountId: "",
  counterAmount: "",
});

const KIND_OPTIONS = (Object.keys(TRANSACTION_KIND_LABELS) as TransactionKind[]).map(
  (kind) => ({ value: kind, label: TRANSACTION_KIND_LABELS[kind] }),
);

export function FinanceTransactions({
  transactions,
  accounts,
  onChanged,
}: {
  transactions: SerializedTransaction[];
  accounts: SerializedAccount[];
  onChanged: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currencyCode})`,
      })),
    [accounts],
  );

  const categoryOptions = useMemo(() => {
    const list = categoriesForKind(form.kind);
    return list.map((item) => ({ value: item.value, label: item.label }));
  }, [form.kind]);

  function startCreate(kind: TransactionKind) {
    setEditingId(null);
    setForm({ ...emptyForm(accounts[0]?.id ?? ""), kind, category: kind === "INCOME" ? "salary" : "other" });
    setError(null);
    setModalOpen(true);
  }

  function startEdit(tx: SerializedTransaction) {
    setEditingId(tx.id);
    setForm({
      accountId: tx.accountId,
      kind: tx.kind,
      amount: String(tx.amount),
      category: tx.category,
      description: tx.description,
      date: tx.date.slice(0, 10),
      counterAccountId: tx.counterAccountId ?? "",
      counterAmount: tx.counterAmount !== null ? String(tx.counterAmount) : "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        accountId: form.accountId,
        kind: form.kind,
        amount: Number(form.amount) || 0,
        category: form.category,
        description: form.description,
        date: form.date,
      };
      if (form.kind === "TRANSFER") {
        payload.counterAccountId = form.counterAccountId || null;
        payload.counterAmount = form.counterAmount ? Number(form.counterAmount) : null;
      }
      const { response, data } = await fetchJson<{ error?: string }>(
        editingId ? `/api/transactions/${editingId}` : "/api/transactions",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar lançamento.");
      setModalOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    const { response, data } = await fetchJson<{ error?: string }>(
      `/api/transactions/${id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setError(data?.error ?? "Erro ao excluir lançamento.");
      return;
    }
    onChanged();
  }

  const columns = useMemo<DataTableColumn<SerializedTransaction>[]>(
    () => [
      {
        id: "date",
        header: "Data",
        sortable: true,
        sortValue: (row) => row.date,
        cell: (row) => new Date(row.date).toLocaleDateString("pt-BR"),
      },
      {
        id: "kind",
        header: "Tipo",
        cell: (row) => (
          <Badge
            variant={
              row.kind === "INCOME" ? "success" : row.kind === "TRANSFER" ? "default" : "outline"
            }
            className="text-[10px]"
          >
            {TRANSACTION_KIND_LABELS[row.kind]}
          </Badge>
        ),
      },
      {
        id: "description",
        header: "Descrição",
        sortable: true,
        sortValue: (row) => row.description,
        cell: (row) => (
          <div>
            <span className="font-medium">{row.description}</span>
            <span className="ml-2 text-xs text-zinc-500">{row.accountName}</span>
          </div>
        ),
      },
      {
        id: "category",
        header: "Categoria",
        cell: (row) =>
          row.kind === "TRANSFER" ? "Transferência" : categoryLabel(row.category),
      },
      {
        id: "amount",
        header: "Valor",
        align: "right",
        sortable: true,
        sortValue: (row) => row.amount,
        cell: (row) => (
          <Money
            value={row.kind === "EXPENSE" ? -row.amount : row.amount}
            currency={row.currencyCode}
            showSign={row.kind !== "TRANSFER"}
            size="sm"
          />
        ),
      },
      {
        id: "actions",
        header: "",
        align: "right",
        cell: (row) => (
          <div className="flex justify-end gap-1">
            <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(row)}>
              Editar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => void remove(row.id)}
            >
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
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Registre o que entra e sai — os relatórios são gerados automaticamente.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => startCreate("INCOME")}
            disabled={accounts.length === 0}
          >
            <IconPlus size="sm" /> Entrada
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => startCreate("EXPENSE")}
            disabled={accounts.length === 0}
          >
            <IconPlus size="sm" /> Saída
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => startCreate("TRANSFER")}
            disabled={accounts.length < 2}
          >
            <IconPlus size="sm" /> Transferência
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <DataTable
        data={transactions}
        columns={columns}
        getRowKey={(row) => row.id}
        pageSize={10}
        searchPlaceholder="Buscar lançamento…"
        emptyMessage={
          accounts.length === 0
            ? "Crie uma conta primeiro para registrar lançamentos."
            : "Nenhum lançamento no período."
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? "Editar lançamento"
            : `Novo — ${TRANSACTION_KIND_LABELS[form.kind]}`
        }
        size="lg"
        className="max-w-md"
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
              <Label>{form.kind === "TRANSFER" ? "Conta de origem" : "Conta"}</Label>
              <Select
                options={accountOptions}
                value={form.accountId}
                onChange={(value) => setForm((prev) => ({ ...prev, accountId: value }))}
                placeholder="Selecione a conta…"
              />
            </div>
          </div>

          {form.kind === "TRANSFER" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Conta de destino</Label>
                <Select
                  options={accountOptions.filter((o) => o.value !== form.accountId)}
                  value={form.counterAccountId}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, counterAccountId: value }))
                  }
                  placeholder="Selecione…"
                />
              </div>
              <div className="space-y-1">
                <Label>Valor recebido (opcional)</Label>
                <NumberInput
                  value={form.counterAmount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, counterAmount: e.target.value }))
                  }
                  placeholder="Se difere por câmbio/tarifa"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select
                options={categoryOptions}
                value={form.category}
                onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Ex.: Mercado, Salário de julho…"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Valor</Label>
              <NumberInput
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

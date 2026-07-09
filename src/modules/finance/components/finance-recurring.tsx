"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, fieldControlProps, useValidatedField } from "@/components/ui/field";
import { validationRules } from "@/components/ui/field-validation";
import { Alert } from "@/components/ui/alert";
import { IconPicker } from "@/components/ui/icon-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { TableRowsSkeleton } from "@/components/ui/panel-skeleton";
import { NumberInput, Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { IconPencil, IconPlus, IconRepeat, IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { AppIcon, categoryDefaultIcon, type IconName } from "@/lib/icon-utils";
import { useIconSuggestion } from "@/hooks/use-icon-suggestion";
import { useConfirm } from "@/hooks/use-confirm";
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

function parseAmount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

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
  openCreateTrigger = null,
  onCountChange,
}: {
  accounts: SerializedAccount[];
  onChanged: () => void;
  openCreateTrigger?: { seq: number; kind: "INCOME" | "EXPENSE" } | null;
  onCountChange?: (count: number) => void;
}) {
  const [records, setRecords] = useState<SerializedRecurring[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecurringForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const iconSuggestion = useIconSuggestion({
    text: form.description,
    category: form.category,
    purpose: "transaction",
  });
  const { confirm, dialog } = useConfirm();

  const amountField = useValidatedField(
    [
      validationRules.required("Informe o valor."),
      validationRules.currency(),
      validationRules.positiveAmount(),
    ],
    { required: true, validateMode: ["blur", "submit"], showSuccess: false },
  );

  const descriptionField = useValidatedField(
    [
      validationRules.required("Descrição é obrigatória."),
      validationRules.maxLength(120, "Máximo de 120 caracteres."),
    ],
    { required: true, validateMode: "change", showSuccess: false },
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { response, data } = await fetchJson<{
      recurring?: SerializedRecurring[];
      error?: string;
    }>("/api/recurring?includeInactive=true");
    setLoading(false);
    if (response.ok) {
      const loaded = data?.recurring ?? [];
      setRecords(loaded);
      onCountChange?.(loaded.length);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    iconSuggestion.resetIconSuggestion();
    const category = kind === "INCOME" ? "salary" : "other";
    setForm({
      ...emptyForm(accounts[0]?.id ?? ""),
      kind,
      category,
    });
    amountField.reset();
    descriptionField.reset();
    setPageError(null);
    setFormError(null);
    setModalOpen(true);
  }

  useEffect(() => {
    if (openCreateTrigger && openCreateTrigger.seq > 0) {
      startCreate(openCreateTrigger.kind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateTrigger?.seq]);

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
    iconSuggestion.lockIcon((rec.icon as IconName) ?? categoryDefaultIcon(rec.category));
    amountField.reset();
    amountField.setValue(String(rec.amount));
    descriptionField.reset();
    descriptionField.setValue(rec.description);
    setPageError(null);
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    amountField.markSubmitted();
    descriptionField.markSubmitted();
    if (!amountField.isValid || !descriptionField.isValid) return;

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        accountId: form.accountId,
        kind: form.kind,
        amount: parseAmount(form.amount),
        category: form.category,
        description: form.description,
        icon: iconSuggestion.icon,
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
      setFormError(err instanceof Error ? err.message : "Erro ao salvar.");
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
      setPageError((data as { error?: string })?.error ?? "Erro ao atualizar.");
      return;
    }
    await load();
  }

  async function remove(rec: SerializedRecurring) {
    const ok = await confirm({
      title: "Excluir recorrência",
      message: `Excluir a recorrência "${rec.description}"?`,
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;
    const { response, data } = await fetchJson<{ error?: string }>(
      `/api/recurring/${rec.id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setPageError((data as { error?: string })?.error ?? "Erro ao excluir.");
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
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              <AppIcon name={row.icon ?? categoryDefaultIcon(row.category)} size="xs" />
            </span>
            <div>
              <p className="font-medium">{row.description}</p>
              <p className="text-xs text-zinc-500">{categoryLabel(row.category)}</p>
            </div>
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
        cell: (row) => (
          <Money
            value={row.amount}
            currency={row.currencyCode}
            tone={row.kind === "INCOME" ? "income" : "expense"}
          />
        ),
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
              <IconPencil size="xs" />
              Editar
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => void remove(row)}>
              <IconTrash size="xs" />
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
      {pageError ? <Alert variant="error">{pageError}</Alert> : null}

      {loading ? (
        <TableRowsSkeleton rows={8} />
      ) : (
        <DataTable
          data={records}
          columns={columns}
          getRowKey={(row) => row.id}
          pageSize={15}
          searchPlaceholder="Buscar recorrência…"
          emptyMessage="Nenhuma recorrência encontrada."
          emptyState={
            <EmptyState
              icon={<IconRepeat className="h-6 w-6" />}
              title="Nenhuma recorrência cadastrada"
              description="Salário, aluguel, assinaturas — configure e o sistema lança automaticamente."
            />
          }
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
        {formError ? <Alert variant="error">{formError}</Alert> : null}
        <div className="space-y-3">
          <Field
            label="Descrição"
            message={descriptionField.validation.message}
            state={descriptionField.validation.state}
            required
            counter={`${descriptionField.value.length}/120`}
          >
            <Input
              value={form.description}
              onChange={(e) => {
                const description = e.target.value;
                descriptionField.setValue(description);
                setForm((prev) => ({ ...prev, description }));
              }}
              onBlur={descriptionField.bind.onBlur}
              placeholder="Ex.: Salário, Aluguel, Netflix…"
              {...fieldControlProps(descriptionField.validation.state)}
            />
          </Field>
          <IconPicker
            label="Ícone"
            value={iconSuggestion.icon}
            onChange={iconSuggestion.pickIcon}
          />
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
                onChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    category: value,
                  }))
                }
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
            <Field
              label="Valor"
              message={amountField.validation.message}
              state={amountField.validation.state}
              required
            >
              <NumberInput
                value={form.amount}
                onChange={(e) => {
                  const amount = e.target.value;
                  amountField.setValue(amount);
                  setForm((prev) => ({ ...prev, amount }));
                }}
                onBlur={amountField.bind.onBlur}
                placeholder="0,00"
                {...fieldControlProps(amountField.validation.state)}
              />
            </Field>
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
              <DatePicker
                value={form.nextDueAt}
                onChange={(v) => setForm((prev) => ({ ...prev, nextDueAt: v }))}
                clearable={false}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Encerrar em (opcional)</Label>
            <DatePicker
              value={form.endAt}
              onChange={(v) => setForm((prev) => ({ ...prev, endAt: v }))}
              clearable
            />
          </div>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}

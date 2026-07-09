"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, fieldControlProps, useValidatedField } from "@/components/ui/field";
import { validationRules } from "@/components/ui/field-validation";
import { Alert } from "@/components/ui/alert";
import { IconPicker } from "@/components/ui/icon-picker";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { IconPencil, IconPlus, IconReceipt, IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { validateFormFields } from "@/lib/form-validation";
import { AppIcon, categoryDefaultIcon, type IconName } from "@/lib/icon-utils";
import { useIconSuggestion } from "@/hooks/use-icon-suggestion";
import { useConfirm } from "@/hooks/use-confirm";
import { useFinanceLabels } from "@/hooks/use-finance-labels";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  resolveDefaultAccountId,
  type SerializedAccount,
  type SerializedTransaction,
  type TransactionKind,
} from "@/types/finance";

const TRANSACTION_KINDS: TransactionKind[] = ["INCOME", "EXPENSE", "TRANSFER"];

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

function parseAmount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

export function FinanceTransactions({
  transactions,
  accounts,
  onChanged,
  openCreateTrigger = null,
}: {
  transactions: SerializedTransaction[];
  accounts: SerializedAccount[];
  onChanged: () => void;
  openCreateTrigger?: { seq: number; kind: "INCOME" | "EXPENSE" | "TRANSFER" } | null;
}) {
  const t = useT();
  const { locale } = useLocale();
  const labels = useFinanceLabels();
  const [modalOpen, setModalOpen] = useState(false);
  const modalFormRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TransactionForm>(emptyForm());
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
      validationRules.required(t("finance.pages.transactions.amountRequired")),
      validationRules.currency(),
      validationRules.positiveAmount(),
    ],
    { required: true, validateMode: ["blur", "submit"], showSuccess: false },
  );

  const descriptionField = useValidatedField(
    [
      validationRules.required(t("finance.pages.transactions.descriptionRequired")),
      validationRules.maxLength(120, t("finance.pages.transactions.descriptionMaxLength")),
    ],
    { required: true, validateMode: "change", showSuccess: false },
  );

  const defaultAccountId = useMemo(() => resolveDefaultAccountId(accounts), [accounts]);

  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        value: account.id,
        label: `${account.name} (${account.currencyCode})`,
      })),
    [accounts],
  );

  const kindOptions = useMemo(
    () => TRANSACTION_KINDS.map((kind) => ({ value: kind, label: labels.transactionKindLabel(kind) })),
    [labels],
  );

  const categoryOptions = useMemo(() => {
    const list = labels.categoriesForKind(form.kind);
    return list.map((item) => ({ value: item.value, label: item.label }));
  }, [form.kind, labels]);

  function startCreate(kind: TransactionKind) {
    setEditingId(null);
    iconSuggestion.resetIconSuggestion();
    const category = kind === "INCOME" ? "salary" : "other";
    setForm({
      ...emptyForm(defaultAccountId),
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
    iconSuggestion.lockIcon((tx.icon as IconName) ?? "tag");
    amountField.reset();
    amountField.setValue(String(tx.amount));
    descriptionField.reset();
    descriptionField.setValue(tx.description);
    setPageError(null);
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    if (!validateFormFields([amountField, descriptionField], modalFormRef.current)) return;

    setSaving(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {
        accountId: form.accountId,
        kind: form.kind,
        amount: parseAmount(form.amount),
        category: form.category,
        description: form.description,
        icon: form.kind === "TRANSFER" ? null : iconSuggestion.icon,
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
      if (!response.ok) throw new Error(data?.error ?? t("finance.pages.transactions.saveError"));
      setModalOpen(false);
      onChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("finance.pages.transactions.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: t("finance.pages.transactions.deleteTitle"),
      message: t("finance.pages.transactions.deleteMessage"),
      confirmLabel: t("common.delete"),
      tone: "error",
    });
    if (!ok) return;
    const { response, data } = await fetchJson<{ error?: string }>(
      `/api/transactions/${id}`,
      { method: "DELETE" },
    );
    if (!response.ok) {
      setPageError(data?.error ?? t("finance.pages.transactions.deleteError"));
      return;
    }
    onChanged();
  }

  const columns = useMemo<DataTableColumn<SerializedTransaction>[]>(
    () => [
      {
        id: "date",
        header: t("finance.pages.transactions.dateColumn"),
        sortable: true,
        sortValue: (row) => row.date,
        cell: (row) => new Date(row.date).toLocaleDateString(locale),
      },
      {
        id: "kind",
        header: t("finance.pages.transactions.kindColumn"),
        cell: (row) => (
          <Badge
            variant={
              row.kind === "INCOME"
                ? "success"
                : row.kind === "TRANSFER"
                  ? "warning"
                  : "error"
            }
            className="text-[10px]"
          >
            {labels.transactionKindLabel(row.kind)}
          </Badge>
        ),
      },
      {
        id: "description",
        header: t("finance.pages.transactions.descriptionColumn"),
        sortable: true,
        sortValue: (row) => row.description,
        cell: (row) => (
          <div className="flex items-center gap-2">
            {row.kind !== "TRANSFER" ? (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <AppIcon name={row.icon ?? categoryDefaultIcon(row.category)} size="xs" />
              </span>
            ) : null}
            <div>
              <span className="font-medium">{row.description}</span>
              <span className="ml-2 text-xs text-zinc-500">{row.accountName}</span>
            </div>
          </div>
        ),
      },
      {
        id: "category",
        header: t("finance.pages.transactions.categoryColumn"),
        cell: (row) =>
          row.kind === "TRANSFER"
            ? labels.transactionKindLabel("TRANSFER")
            : labels.categoryLabel(row.category),
      },
      {
        id: "amount",
        header: t("finance.pages.transactions.amountColumn"),
        align: "right",
        sortable: true,
        sortValue: (row) => row.amount,
        cell: (row) => (
          <Money
            value={row.kind === "EXPENSE" ? -row.amount : row.amount}
            currency={row.currencyCode}
            showSign={row.kind === "INCOME"}
            tone={
              row.kind === "TRANSFER"
                ? "transfer"
                : row.kind === "EXPENSE"
                  ? "expense"
                  : "income"
            }
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
              <IconPencil size="xs" />
              {t("finance.pages.transactions.edit")}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => void remove(row.id)}
            >
              <IconTrash size="xs" />
              {t("finance.pages.transactions.delete")}
            </Button>
          </div>
        ),
      },
    ],
    [labels, locale, t],
  );

  return (
    <div className="space-y-4">
      {pageError ? <Alert variant="error">{pageError}</Alert> : null}

      <DataTable
        data={transactions}
        columns={columns}
        getRowKey={(row) => row.id}
        pageSize={10}
        searchPlaceholder={t("finance.pages.transactions.searchPlaceholder")}
        emptyMessage={t("finance.pages.transactions.emptyMessage")}
        emptyState={
          <EmptyState
            icon={<IconReceipt className="h-6 w-6" />}
            title={
              accounts.length === 0
                ? t("finance.pages.transactions.emptyNoAccountsTitle")
                : t("finance.pages.transactions.emptyMessage")
            }
            description={
              accounts.length === 0
                ? t("finance.pages.transactions.emptyNoAccountsDesc")
                : t("finance.pages.transactions.emptyNoDataDesc")
            }
          />
        }
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? t("finance.pages.transactions.editTitle")
            : t("finance.pages.transactions.createTitle", {
                kind: labels.transactionKindLabel(form.kind),
              })
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
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </>
        }
      >
        {formError ? <Alert variant="error">{formError}</Alert> : null}
        <div ref={modalFormRef} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("finance.pages.transactions.kindLabel")}</Label>
              <Select
                options={kindOptions}
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
              <Label>
                {form.kind === "TRANSFER"
                  ? t("finance.pages.transactions.sourceAccountLabel")
                  : t("finance.pages.transactions.accountLabel")}
              </Label>
              <Select
                options={accountOptions}
                value={form.accountId}
                onChange={(value) => setForm((prev) => ({ ...prev, accountId: value }))}
                placeholder={t("finance.pages.transactions.selectAccount")}
              />
            </div>
          </div>

          {form.kind === "TRANSFER" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{t("finance.pages.transactions.destAccountLabel")}</Label>
                <Select
                  options={accountOptions.filter((o) => o.value !== form.accountId)}
                  value={form.counterAccountId}
                  onChange={(value) =>
                    setForm((prev) => ({ ...prev, counterAccountId: value }))
                  }
                  placeholder={t("finance.pages.transactions.select")}
                />
              </div>
              <div className="space-y-1">
                <Label>{t("finance.pages.transactions.counterAmountLabel")}</Label>
                <NumberInput
                  value={form.counterAmount}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, counterAmount: e.target.value }))
                  }
                  placeholder={t("finance.pages.transactions.counterAmountPlaceholder")}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>{t("finance.pages.transactions.categoryLabel")}</Label>
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
          )}

          <Field
            label={t("finance.pages.transactions.descriptionLabel")}
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
              placeholder={t("finance.pages.transactions.descriptionPlaceholder")}
              {...fieldControlProps(descriptionField.validation.state)}
            />
          </Field>

          {form.kind !== "TRANSFER" ? (
            <IconPicker
              label={t("finance.pages.transactions.iconLabel")}
              value={iconSuggestion.icon}
              onChange={iconSuggestion.pickIcon}
            />
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("finance.pages.transactions.amountLabel")}
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
                {...fieldControlProps(amountField.validation.state)}
              />
            </Field>
            <div className="space-y-1">
              <Label>{t("finance.pages.transactions.dateLabel")}</Label>
              <DatePicker
                value={form.date}
                onChange={(v) => setForm((prev) => ({ ...prev, date: v }))}
                clearable={false}
              />
            </div>
          </div>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}

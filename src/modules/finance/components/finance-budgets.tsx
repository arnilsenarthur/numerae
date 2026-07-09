"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Field } from "@/components/ui/field";
import { NumberInput } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { IconPencil, IconPiggyBank, IconPlus, IconTrash } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useUrlQueryInt, useUrlQueryPatch } from "@/hooks/use-url-query-state";
import { formatMoney } from "@/lib/format-money";
import { useConfirm } from "@/hooks/use-confirm";
import { useFinanceLabels } from "@/hooks/use-finance-labels";
import { useLocale, useT } from "@/i18n/locale-provider";
import type { AppLocale } from "@/i18n/locales";
import type { SerializedBudget } from "@/types/budget";

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

function monthLabel(month: number, year: number, locale: AppLocale) {
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
}

type BudgetForm = {
  category: string;
  amount: string;
  currencyCode: string;
};

const emptyForm = (): BudgetForm => ({
  category: "food",
  amount: "",
  currencyCode: "BRL",
});

export function FinanceBudgets() {
  const t = useT();
  const { locale } = useLocale();
  const labels = useFinanceLabels();
  const expenseCategoryOptions = useMemo(
    () => labels.categoriesForKind("EXPENSE").map((item) => ({ value: item.value, label: item.label })),
    [labels],
  );
  const now = new Date();
  const patchQuery = useUrlQueryPatch();
  const [month, setMonth] = useUrlQueryInt({
    key: "month",
    defaultValue: now.getMonth() + 1,
    min: 1,
    max: 12,
  });
  const [year, setYear] = useUrlQueryInt({
    key: "year",
    defaultValue: now.getFullYear(),
    min: 2000,
    max: 2100,
  });
  const [budgets, setBudgets] = useState<SerializedBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BudgetForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function load() {
    setLoading(true);
    setPageError(null);
    try {
      const res = await fetchJson<{ budgets?: SerializedBudget[] }>(
        `/api/budgets?month=${month}&year=${year}`,
      );
      if (res.response.ok) setBudgets(res.data?.budgets ?? []);
      else setPageError(t("finance.pages.budgets.loadError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  function navigateMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    patchQuery({ month: m, year: y });
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(budget: SerializedBudget) {
    setEditingId(budget.id);
    setForm({
      category: budget.category,
      amount: String(budget.amount),
      currencyCode: budget.currencyCode,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    if (!form.amount.trim() || isNaN(Number(form.amount.replace(",", ".")))) {
      setFormError(t("finance.pages.budgets.invalidAmount"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        category: form.category,
        amount: Number(form.amount.replace(",", ".")),
        currencyCode: form.currencyCode,
        month,
        year,
      };
      const url = editingId ? `/api/budgets/${editingId}` : "/api/budgets";
      const method = editingId ? "PATCH" : "POST";
      const { response, data } = await fetchJson<{ error?: string }>(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error((data as { error?: string })?.error ?? t("finance.pages.budgets.saveError"));
      setModalOpen(false);
      void load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("finance.pages.budgets.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function removeBudget(budget: SerializedBudget) {
    const ok = await confirm({
      title: t("finance.pages.budgets.deleteTitle"),
      message: t("finance.pages.budgets.deleteMessage", {
        category: labels.categoryLabel(budget.category),
      }),
      confirmLabel: t("common.delete"),
      tone: "error",
    });
    if (!ok) return;
    try {
      const { response } = await fetchJson(`/api/budgets/${budget.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(t("finance.pages.budgets.deleteError"));
      void load();
    } catch (err) {
      setPageError(err instanceof Error ? err.message : t("finance.pages.budgets.deleteError"));
    }
  }

  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const currency = budgets[0]?.currencyCode ?? "BRL";

  return (
    <div className="space-y-4">
      {pageError ? <Alert variant="error">{pageError}</Alert> : null}

      {/* Month navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigateMonth(-1)}
          >
            ←
          </Button>
          <span className="min-w-[140px] text-center text-sm font-medium capitalize">
            {monthLabel(month, year, locale)}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => navigateMonth(1)}
          >
            →
          </Button>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          <IconPlus size="sm" /> {t("finance.pages.budgets.newBudget")}
        </Button>
      </div>

      {/* Summary */}
      {budgets.length > 0 ? (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500">{t("finance.pages.budgets.totalBudgeted")}</p>
                <p className="text-base font-semibold">
                  {formatMoney(totalBudgeted, { currency })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500">{t("finance.pages.budgets.spentSoFar")}</p>
                <p
                  className={`text-base font-semibold ${totalSpent > totalBudgeted ? "text-red-600 dark:text-red-400" : "text-zinc-700 dark:text-zinc-300"}`}
                >
                  {formatMoney(totalSpent, { currency })}
                </p>
              </div>
            </div>
            <Progress
              value={totalSpent}
              max={totalBudgeted || 1}
              size="sm"
              variant={
                totalSpent >= totalBudgeted
                  ? "danger"
                  : totalSpent >= totalBudgeted * 0.8
                    ? "warning"
                    : "success"
              }
              className="mt-2"
            />
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<IconPiggyBank className="h-6 w-6" />}
          title={t("finance.pages.budgets.emptyTitle")}
          description={t("finance.pages.budgets.emptyDescription")}
          action={
            <Button type="button" size="sm" onClick={openCreate}>
              <IconPlus size="sm" /> {t("finance.pages.budgets.newBudget")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => {
            const pct = budget.amount > 0 ? Math.min((budget.spent / budget.amount) * 100, 100) : 0;
            const over = budget.spent > budget.amount;
            const progressVariant = over ? "danger" : pct >= 80 ? "warning" : "success";

            return (
              <Card key={budget.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{labels.categoryLabel(budget.category)}</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        onClick={() => openEdit(budget)}
                      >
                        <IconPencil size="xs" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-0.5 text-zinc-400 hover:text-red-500"
                        onClick={() => void removeBudget(budget)}
                      >
                        <IconTrash size="xs" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`text-base font-semibold tabular-nums ${over ? "text-red-600 dark:text-red-400" : ""}`}
                      >
                        {formatMoney(budget.spent, { currency: budget.currencyCode })}
                      </span>
                      <span className="text-xs text-zinc-400">
                        / {formatMoney(budget.amount, { currency: budget.currencyCode })}
                      </span>
                    </div>
                    <Progress value={pct} max={100} size="sm" variant={progressVariant} />
                    <p className="text-[10px] text-zinc-400">
                      {over
                        ? t("finance.pages.budgets.overBy", {
                            amount: formatMoney(budget.spent - budget.amount, {
                              currency: budget.currencyCode,
                            }),
                          })
                        : t("finance.pages.budgets.remaining", {
                            amount: formatMoney(budget.amount - budget.spent, {
                              currency: budget.currencyCode,
                            }),
                          })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t("finance.pages.budgets.editTitle") : t("finance.pages.budgets.createTitle")}
        size="lg"
        className="max-w-sm"
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
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>{t("finance.pages.budgets.categoryLabel")}</Label>
            <Select
              options={expenseCategoryOptions}
              value={form.category}
              onChange={(value) => setForm((prev) => ({ ...prev, category: value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("finance.pages.budgets.limitLabel")} required>
              <NumberInput
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0,00"
              />
            </Field>
            <div className="space-y-1">
              <Label>{t("finance.pages.budgets.currencyLabel")}</Label>
              <Select
                options={CURRENCY_OPTIONS}
                value={form.currencyCode}
                onChange={(value) => setForm((prev) => ({ ...prev, currencyCode: value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}

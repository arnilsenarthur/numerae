"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { GoalListSkeleton } from "@/components/ui/panel-skeleton";
import { Select } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, fieldControlProps, useValidatedField } from "@/components/ui/field";
import { validationRules } from "@/components/ui/field-validation";
import { Alert } from "@/components/ui/alert";
import { IconPicker } from "@/components/ui/icon-picker";
import {
  IconCheck,
  IconPencil,
  IconPlus,
  IconTarget,
  IconTrash,
  IconX,
} from "@/components/ui/icons";
import { AppIcon, categoryDefaultIcon, type IconName } from "@/lib/icon-utils";
import { useIconSuggestion } from "@/hooks/use-icon-suggestion";
import { fetchJson } from "@/lib/fetch-json";
import { validateFormFields } from "@/lib/form-validation";
import { formatMoney } from "@/lib/format-money";
import { useConfirm } from "@/hooks/use-confirm";
import {
  GOAL_CATEGORY_LABELS,
  GOAL_CATEGORY_OPTIONS,
  type SerializedFinancialGoal,
} from "@/lib/goal-serializer";

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL — Real" },
  { value: "USD", label: "USD — Dólar" },
  { value: "EUR", label: "EUR — Euro" },
];

type GoalForm = {
  title: string;
  targetAmount: string;
  currentAmount: string;
  currency: string;
  deadline: string;
  category: string;
  notes: string;
};

function parseAmount(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".");
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

function emptyForm(): GoalForm {
  return {
    title: "",
    targetAmount: "",
    currentAmount: "0",
    currency: "BRL",
    deadline: "",
    category: "other",
    notes: "",
  };
}

function daysLabel(days: number | null): string {
  if (days === null) return "";
  if (days < 0) return "Vencida";
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  return `${days} dias`;
}

function daysVariant(days: number | null): "default" | "success" | "warning" | "error" {
  if (days === null) return "default";
  if (days < 0) return "error";
  if (days <= 7) return "warning";
  if (days <= 30) return "default";
  return "default";
}

export function FinanceGoals({ openCreateSeq = 0 }: { openCreateSeq?: number }) {
  const [goals, setGoals] = useState<SerializedFinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const modalFormRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showAchieved, setShowAchieved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const iconSuggestion = useIconSuggestion({
    text: form.title,
    category: form.category,
    purpose: "goal",
  });
  const { confirm, dialog } = useConfirm();

  const titleField = useValidatedField(
    [
      validationRules.required("Título é obrigatório."),
      validationRules.maxLength(80, "Máximo de 80 caracteres."),
    ],
    { required: true, validateMode: "change", showSuccess: false },
  );

  const targetField = useValidatedField(
    [
      validationRules.required("Informe o valor alvo."),
      validationRules.currency(),
      validationRules.positiveAmount("O valor alvo deve ser maior que zero."),
    ],
    { required: true, validateMode: ["blur", "submit"], showSuccess: false },
  );

  const currentField = useValidatedField([validationRules.currency()], {
    required: false,
    allowEmpty: true,
    validateMode: ["blur", "submit"],
    showSuccess: false,
  });

  async function load() {
    setLoading(true);
    const { response, data } = await fetchJson<{
      goals?: SerializedFinancialGoal[];
      error?: string;
    }>("/api/goals");
    setLoading(false);
    if (!response.ok) {
      setError(data?.error ?? "Erro ao carregar metas.");
      return;
    }
    setGoals(data?.goals ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    iconSuggestion.resetIconSuggestion();
    setFormError(null);
    titleField.reset();
    targetField.reset();
    currentField.reset();
    setModalOpen(true);
  }

  useEffect(() => {
    if (openCreateSeq > 0) startCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateSeq]);

  function startEdit(goal: SerializedFinancialGoal) {
    setEditingId(goal.id);
    setForm({
      title: goal.title,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      currency: goal.currency,
      deadline: goal.deadline ? goal.deadline.slice(0, 10) : "",
      category: goal.category,
      notes: goal.notes ?? "",
    });
    iconSuggestion.lockIcon((goal.icon as IconName) ?? categoryDefaultIcon(goal.category, "goal"));
    titleField.reset();
    titleField.setValue(goal.title);
    targetField.reset();
    targetField.setValue(String(goal.targetAmount));
    currentField.reset();
    currentField.setValue(String(goal.currentAmount));
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    if (
      !validateFormFields([titleField, targetField, currentField], modalFormRef.current)
    ) {
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title.trim(),
        targetAmount: parseAmount(form.targetAmount),
        currentAmount: parseAmount(form.currentAmount),
        currency: form.currency,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        category: form.category,
        notes: form.notes || null,
        icon: iconSuggestion.icon,
      };

      const url = editingId ? `/api/goals/${editingId}` : "/api/goals";
      const method = editingId ? "PATCH" : "POST";
      const { response, data } = await fetchJson<{
        goal?: SerializedFinancialGoal;
        error?: string;
      }>(url, { method, body: JSON.stringify(payload) });

      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar meta.");
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao salvar meta.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAchieved(goal: SerializedFinancialGoal) {
    const { response, data } = await fetchJson<{ goal?: SerializedFinancialGoal; error?: string }>(
      `/api/goals/${goal.id}`,
      { method: "PATCH", body: JSON.stringify({ achieved: !goal.achieved }) },
    );
    if (response.ok && data?.goal) {
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? data.goal! : g)));
    }
  }

  async function deleteGoalById(goal: SerializedFinancialGoal) {
    const ok = await confirm({
      title: "Excluir meta",
      message: `Excluir "${goal.title}"? Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      tone: "error",
    });
    if (!ok) return;

    setDeletingId(goal.id);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/goals/${goal.id}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir meta.");
      if (editingId === goal.id) setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir meta.");
    } finally {
      setDeletingId(null);
    }
  }

  async function deleteGoal() {
    if (!editingId) return;
    const goal = goals.find((g) => g.id === editingId);
    if (!goal) return;
    await deleteGoalById(goal);
  }

  const active = goals.filter((g) => !g.achieved);
  const achieved = goals.filter((g) => g.achieved);
  const shown = showAchieved ? goals : active;

  return (
    <div className="space-y-4">
      {achieved.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAchieved((v) => !v)}
          className="text-xs text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {showAchieved
            ? "Ocultar concluídas"
            : `Ver ${achieved.length} concluída${achieved.length !== 1 ? "s" : ""}`}
        </button>
      )}

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <GoalListSkeleton />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<IconTarget className="h-6 w-6" />}
          title="Nenhuma meta"
          description="Crie uma meta para acompanhar o progresso rumo a um objetivo financeiro."
          action={
            <Button type="button" size="sm" onClick={startCreate}>
              <IconPlus size="sm" /> Nova meta
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {shown.map((goal) => {
            const progressVariant =
              goal.progressPercent >= 100
                ? "success"
                : goal.daysRemaining !== null && goal.daysRemaining < 0
                  ? "warning"
                  : "default";

            return (
              <Card
                key={goal.id}
                className={`overflow-hidden transition-all ${goal.achieved ? "opacity-60" : ""}`}
              >
                {/* Header: icon + title + badges */}
                <CardHeader className="p-3 pb-2">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <AppIcon name={goal.icon ?? categoryDefaultIcon(goal.category)} size="sm" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <CardTitle
                          className={`text-sm ${goal.achieved ? "line-through text-zinc-400" : ""}`}
                        >
                          {goal.title}
                        </CardTitle>
                        <Badge variant="default" className="text-[10px]">
                          {GOAL_CATEGORY_LABELS[goal.category] ?? goal.category}
                        </Badge>
                        {goal.achieved ? (
                          <Badge variant="success" className="text-[10px]">Concluída</Badge>
                        ) : null}
                        {goal.daysRemaining !== null && !goal.achieved ? (
                          <Badge variant={daysVariant(goal.daysRemaining)} className="text-[10px]">
                            {daysLabel(goal.daysRemaining)}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Content: amounts + progress */}
                <CardContent className="space-y-2 px-3 pb-3 pt-0">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatMoney(goal.currentAmount, { currency: goal.currency })}
                    </span>
                    <span className="text-xs text-zinc-400">de</span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatMoney(goal.targetAmount, { currency: goal.currency })}
                    </span>
                    <span className="ml-auto text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {goal.progressPercent.toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    value={goal.progressPercent}
                    max={100}
                    variant={progressVariant}
                    size="sm"
                  />
                </CardContent>

                {/* Action strip — same pattern as accounts/companies/positions */}
                <div className="flex gap-1.5 border-t border-zinc-100 p-2 dark:border-zinc-800">
                  <Button
                    type="button"
                    variant={goal.achieved ? "secondary" : "primary"}
                    size="sm"
                    className={
                      goal.achieved
                        ? "flex-1 border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
                        : "flex-1"
                    }
                    onClick={() => void toggleAchieved(goal)}
                    disabled={deletingId === goal.id}
                  >
                    {goal.achieved ? <IconX size="xs" /> : <IconCheck size="xs" />}
                    {goal.achieved ? "Reabrir" : "Concluir"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => startEdit(goal)}
                    disabled={deletingId === goal.id}
                  >
                    <IconPencil size="xs" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    loading={deletingId === goal.id}
                    onClick={() => void deleteGoalById(goal)}
                  >
                    <IconTrash size="xs" />
                    Excluir
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar meta" : "Nova meta financeira"}
        size="md"
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
            {editingId ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void deleteGoal()}
                disabled={saving}
              >
                <IconTrash size="sm" />
                Excluir
              </Button>
            ) : null}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </>
        }
      >
        {formError ? <Alert variant="error">{formError}</Alert> : null}
        <div ref={modalFormRef} className="space-y-3">
          <Field
            label="Título"
            message={titleField.validation.message}
            state={titleField.validation.state}
            required
            counter={`${titleField.value.length}/80`}
          >
            <Input
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                titleField.setValue(title);
                setForm((p) => ({ ...p, title }));
              }}
              onBlur={titleField.bind.onBlur}
              placeholder="Ex.: Reserva de emergência, Viagem, Casa própria…"
              {...fieldControlProps(titleField.validation.state)}
            />
          </Field>
          <IconPicker
            label="Ícone"
            value={iconSuggestion.icon}
            onChange={iconSuggestion.pickIcon}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select
                options={GOAL_CATEGORY_OPTIONS}
                value={form.category}
                onChange={(v) => setForm((p) => ({ ...p, category: v }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Moeda</Label>
              <Select
                options={CURRENCY_OPTIONS}
                value={form.currency}
                onChange={(v) => setForm((p) => ({ ...p, currency: v }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Valor alvo"
              message={targetField.validation.message}
              state={targetField.validation.state}
              required
            >
              <NumberInput
                value={form.targetAmount}
                onChange={(e) => {
                  const targetAmount = e.target.value;
                  targetField.setValue(targetAmount);
                  setForm((p) => ({ ...p, targetAmount }));
                }}
                onBlur={targetField.bind.onBlur}
                placeholder="0,00"
                {...fieldControlProps(targetField.validation.state)}
              />
            </Field>
            <Field
              label="Valor atual"
              message={currentField.validation.message}
              state={currentField.validation.state}
            >
              <NumberInput
                value={form.currentAmount}
                onChange={(e) => {
                  const currentAmount = e.target.value;
                  currentField.setValue(currentAmount);
                  setForm((p) => ({ ...p, currentAmount }));
                }}
                onBlur={currentField.bind.onBlur}
                placeholder="0,00"
                {...fieldControlProps(currentField.validation.state)}
              />
            </Field>
          </div>
          <div className="space-y-1">
            <Label>Prazo (opcional)</Label>
            <DatePicker
              value={form.deadline}
              onChange={(v) => setForm((p) => ({ ...p, deadline: v }))}
              clearable
            />
          </div>
          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Observações sobre esta meta…"
            />
          </div>
        </div>
      </Modal>

      {dialog}
    </div>
  );
}

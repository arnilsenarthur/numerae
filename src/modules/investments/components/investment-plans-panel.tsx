"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, type ChartSeries } from "@/components/ui/chart";
import { Modal } from "@/components/ui/modal";
import { InvestmentPlansSkeleton } from "@/components/ui/panel-skeleton";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import {
  IconCalendar,
  IconCoins,
  IconPencil,
  IconPercent,
  IconPlus,
  IconTarget,
  IconTrash,
  IconTrendUp,
} from "@/components/ui/icons";
import { useLocale, useT } from "@/i18n/locale-provider";
import { fetchJson } from "@/lib/fetch-json";
import { useConfirm } from "@/hooks/use-confirm";
import { formatMoney } from "@/lib/format-money";
import {
  compareProfiles,
  projectPlan,
} from "@/modules/investments/lib/plan-projection";
import {
  RISK_PROFILES,
  riskProfileMeta,
  type SerializedInvestmentPlan,
} from "@/types/market";

type PlanForm = {
  name: string;
  currencyCode: string;
  initialAmount: string;
  monthlyDeposit: string;
  horizonMonths: string;
  riskProfile: string;
  targetAmount: string;
};

const emptyForm = (): PlanForm => ({
  name: "",
  currencyCode: "BRL",
  initialAmount: "0",
  monthlyDeposit: "500",
  horizonMonths: "60",
  riskProfile: "moderate",
  targetAmount: "",
});

const PROFILE_OPTIONS = RISK_PROFILES.map((profile) => ({
  value: profile.value,
  label: `${profile.label} (~${profile.annualRatePercent}% a.a.)`,
  description: profile.description,
}));

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL — Real" },
  { value: "USD", label: "USD — Dólar" },
  { value: "EUR", label: "EUR — Euro" },
];

export function InvestmentPlansPanel() {
  const t = useT();
  const { locale } = useLocale();
  const [plans, setPlans] = useState<SerializedInvestmentPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirm();

  async function load() {
    setLoading(true);
    const { response, data } = await fetchJson<{
      plans?: SerializedInvestmentPlan[];
      error?: string;
    }>("/api/investment-plans");
    setLoading(false);
    if (!response.ok) {
      setError(data?.error ?? t("investments.pages.plans.loadError"));
      return;
    }
    const list = data?.plans ?? [];
    setPlans(list);
    setSelectedId((current) => current ?? list[0]?.id ?? null);
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = plans.find((plan) => plan.id === selectedId) ?? null;

  const comparison = useMemo(() => {
    if (!selected) return [];
    return compareProfiles({
      initialAmount: selected.initialAmount,
      monthlyDeposit: selected.monthlyDeposit,
      horizonMonths: selected.horizonMonths,
      targetAmount: selected.targetAmount,
    });
  }, [selected]);

  function monthToDateLabel(month: number): string {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + month);
    return d.toLocaleDateString(locale, { month: "short", year: "2-digit" });
  }

  const chartSeries = useMemo<ChartSeries[]>(() => {
    if (!selected) return [];
    const profileSeries = RISK_PROFILES.map((profile) => ({
      id: profile.value,
      label: `${profile.label} (~${profile.annualRatePercent}% a.a.)`,
      data: projectPlan({
        initialAmount: selected.initialAmount,
        monthlyDeposit: selected.monthlyDeposit,
        horizonMonths: selected.horizonMonths,
        annualRatePercent: profile.annualRatePercent,
      }).map((point) => ({
        label: monthToDateLabel(point.month),
        value: Math.round(point.value),
      })),
    }));
    // CDI benchmark line (~10.65% a.a.)
    const cdiBenchmark = {
      id: "cdi",
      label: t("investments.pages.plans.cdiBenchmark"),
      data: projectPlan({
        initialAmount: selected.initialAmount,
        monthlyDeposit: selected.monthlyDeposit,
        horizonMonths: selected.horizonMonths,
        annualRatePercent: 10.65,
      }).map((point) => ({
        label: monthToDateLabel(point.month),
        value: Math.round(point.value),
      })),
    };
    return [...profileSeries, cdiBenchmark];
  }, [selected, locale, t]);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  }

  function startEdit(plan: SerializedInvestmentPlan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      currencyCode: plan.currencyCode,
      initialAmount: String(plan.initialAmount),
      monthlyDeposit: String(plan.monthlyDeposit),
      horizonMonths: String(plan.horizonMonths),
      riskProfile: plan.riskProfile,
      targetAmount: plan.targetAmount !== null ? String(plan.targetAmount) : "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        currencyCode: form.currencyCode,
        initialAmount: Number(form.initialAmount) || 0,
        monthlyDeposit: Number(form.monthlyDeposit) || 0,
        horizonMonths: Number(form.horizonMonths) || 60,
        riskProfile: form.riskProfile,
        targetAmount: form.targetAmount ? Number(form.targetAmount) : null,
      };
      const { response, data } = await fetchJson<{
        plan?: SerializedInvestmentPlan;
        error?: string;
      }>(editingId ? `/api/investment-plans/${editingId}` : "/api/investment-plans", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(data?.error ?? t("investments.pages.plans.saveError"));
      setModalOpen(false);
      if (data?.plan) setSelectedId(data.plan.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("investments.pages.plans.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId) return;
    const ok = await confirm({
      title: t("investments.pages.plans.deleteTitle"),
      message: t("investments.pages.plans.deleteMessage"),
      confirmLabel: t("common.delete"),
      tone: "error",
    });
    if (!ok) return;
    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/investment-plans/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? t("investments.pages.plans.deleteError"));
      setModalOpen(false);
      setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("investments.pages.plans.deleteError"));
    } finally {
      setSaving(false);
    }
  }

  const currency = selected?.currencyCode ?? "BRL";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Defina aporte, prazo e meta — compare os perfis e veja qual caminho chega lá.
        </p>
        <Button type="button" size="sm" onClick={startCreate}>
          <IconPlus size="sm" /> {t("investments.pages.plans.newPlan")}
        </Button>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <InvestmentPlansSkeleton />
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<IconTarget className="h-6 w-6" />}
          title={t("investments.pages.plans.emptyTitle")}
          description={t("investments.pages.plans.emptyDescription")}
          action={
            <Button type="button" size="sm" onClick={startCreate}>
              <IconPlus size="sm" /> {t("investments.pages.plans.newPlan")}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedId(plan.id)}
                className={
                  plan.id === selectedId
                    ? "rounded-lg border border-emerald-500/60 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
                }
              >
                {plan.name}
              </button>
            ))}
          </div>

          {selected ? (
            <div className="space-y-4">
              {/* Plan summary mini-cards */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <IconCoins size="sm" className="shrink-0 text-zinc-400" />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        {t("investments.pages.plans.statInitial")}
                      </p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatMoney(selected.initialAmount, { currency })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <IconTrendUp size="sm" className="shrink-0 text-zinc-400" />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        {t("investments.pages.plans.statMonthly")}
                      </p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatMoney(selected.monthlyDeposit, { currency })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <IconCalendar size="sm" className="shrink-0 text-zinc-400" />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                        {t("investments.pages.plans.statHorizon")}
                      </p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                        {selected.horizonMonths >= 12
                          ? `${Math.floor(selected.horizonMonths / 12)}a ${selected.horizonMonths % 12}m`
                          : `${selected.horizonMonths}m`}
                      </p>
                    </div>
                  </div>
                  {selected.targetAmount ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                      <IconTarget size="sm" className="shrink-0 text-emerald-500" />
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-500">
                          {t("investments.pages.plans.statTarget")}
                        </p>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                          {formatMoney(selected.targetAmount, { currency })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <IconPercent size="sm" className="shrink-0 text-zinc-400" />
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                          {t("investments.pages.plans.statProfile")}
                        </p>
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                          {riskProfileMeta(selected.riskProfile).label}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => startEdit(selected)}
                >
                  <IconPencil size="xs" /> {t("investments.pages.plans.editPlan")}
                </Button>
              </div>

              {/* Growth chart */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("investments.pages.plans.projectionTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    data={chartSeries[0]?.data ?? []}
                    series={chartSeries}
                    formatValue={(value) => formatMoney(value, { currency })}
                    fullWidth
                  />
                </CardContent>
              </Card>

              {/* Comparison cards */}
              <div className="grid gap-3 lg:grid-cols-3">
                {comparison.map((item) => {
                  const isCurrent = item.profile === selected.riskProfile;
                  const returnPct = item.totalDeposited > 0
                    ? (((item.finalValue - item.totalDeposited) / item.totalDeposited) * 100).toFixed(0)
                    : null;
                  return (
                    <Card
                      key={item.profile}
                      className={
                        isCurrent ? "border-emerald-500/50 dark:border-emerald-700/60" : undefined
                      }
                    >
                      <CardContent className="pt-4">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {t("investments.pages.plans.annualRateBadge", {
                                rate: item.annualRatePercent,
                              })}
                            </Badge>
                            {isCurrent ? (
                              <Badge variant="success" className="text-[10px]">
                                {t("investments.pages.plans.currentBadge")}
                              </Badge>
                            ) : null}
                          </div>
                        </div>

                        <Money value={item.finalValue} currency={currency} size="lg" />

                        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                          <div>
                            <p className="text-zinc-400">{t("investments.pages.plans.depositedShort")}</p>
                            <p className="font-medium text-zinc-700 dark:text-zinc-300">
                              {formatMoney(item.totalDeposited, { currency })}
                            </p>
                          </div>
                          <div>
                            <p className="text-zinc-400">{t("investments.pages.plans.returnShort")}</p>
                            <p className="font-medium text-emerald-600 dark:text-emerald-400">
                              +{formatMoney(item.earnings, { currency })}
                            </p>
                          </div>
                          {returnPct !== null ? (
                            <div>
                              <p className="text-zinc-400">{t("investments.pages.plans.totalReturn")}</p>
                              <p className="font-medium text-zinc-700 dark:text-zinc-300">{returnPct}%</p>
                            </div>
                          ) : null}
                          {selected.targetAmount ? (
                            <div>
                              <p className="text-zinc-400">{t("investments.pages.plans.statTarget")}</p>
                              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                                {item.monthsToTarget !== null
                                  ? t("investments.pages.plans.monthsToTarget", {
                                      months: item.monthsToTarget,
                                    })
                                  : t("investments.pages.plans.targetNotReached")}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? t("investments.pages.plans.editTitle") : t("investments.pages.plans.createTitle")}
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
            {editingId ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void remove()}
                disabled={saving}
              >
                <IconTrash size="sm" />
                {t("common.delete")}
              </Button>
            ) : null}
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? t("common.saving") : t("common.save")}
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
            <Label>{t("investments.pages.plans.nameLabel")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex.: Aposentadoria, Casa própria…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("investments.pages.plans.currencyLabel")}</Label>
              <Select
                options={CURRENCY_OPTIONS}
                value={form.currencyCode}
                onChange={(value) => setForm((prev) => ({ ...prev, currencyCode: value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t("investments.pages.plans.riskLabel")}</Label>
              <Select
                options={PROFILE_OPTIONS}
                value={form.riskProfile}
                onChange={(value) => setForm((prev) => ({ ...prev, riskProfile: value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("investments.pages.plans.initialLabel")}</Label>
              <NumberInput
                value={form.initialAmount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, initialAmount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{t("investments.pages.plans.monthlyLabel")}</Label>
              <NumberInput
                value={form.monthlyDeposit}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, monthlyDeposit: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{t("investments.pages.plans.yearsLabel")}</Label>
              <NumberInput
                value={form.horizonMonths}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, horizonMonths: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Meta (opcional)</Label>
              <NumberInput
                value={form.targetAmount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, targetAmount: e.target.value }))
                }
                placeholder="Ex.: 1000000"
              />
            </div>
          </div>
        </div>
      </Modal>
      {dialog}
    </div>
  );
}

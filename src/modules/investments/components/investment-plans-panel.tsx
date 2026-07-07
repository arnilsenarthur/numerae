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
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { IconPlus, IconTarget } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
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
  const [plans, setPlans] = useState<SerializedInvestmentPlan[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { response, data } = await fetchJson<{
      plans?: SerializedInvestmentPlan[];
      error?: string;
    }>("/api/investment-plans");
    setLoading(false);
    if (!response.ok) {
      setError(data?.error ?? "Erro ao carregar planos.");
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
        label: `${point.month}m`,
        value: Math.round(point.value),
      })),
    }));
    // CDI benchmark line (~10.65% a.a.)
    const cdiBenchmark = {
      id: "cdi",
      label: "CDI benchmark (~10.65% a.a.)",
      data: projectPlan({
        initialAmount: selected.initialAmount,
        monthlyDeposit: selected.monthlyDeposit,
        horizonMonths: selected.horizonMonths,
        annualRatePercent: 10.65,
      }).map((point) => ({
        label: `${point.month}m`,
        value: Math.round(point.value),
      })),
    };
    return [...profileSeries, cdiBenchmark];
  }, [selected]);

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
      if (!response.ok) throw new Error(data?.error ?? "Erro ao salvar plano.");
      setModalOpen(false);
      if (data?.plan) setSelectedId(data.plan.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar plano.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editingId || !confirm("Excluir este plano?")) return;
    setSaving(true);
    try {
      const { response, data } = await fetchJson<{ error?: string }>(
        `/api/investment-plans/${editingId}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(data?.error ?? "Erro ao excluir plano.");
      setModalOpen(false);
      setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir plano.");
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
          <IconPlus size="sm" /> Novo plano
        </Button>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Carregando planos…</p>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={<IconTarget className="h-10 w-10 text-zinc-400" />}
          title="Nenhum plano de investimento"
          description="Crie um plano com valor inicial, aporte mensal e prazo para simular os caminhos."
          action={
            <Button type="button" size="sm" onClick={startCreate}>
              <IconPlus size="sm" /> Criar plano
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
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="success">{riskProfileMeta(selected.riskProfile).label}</Badge>
                <span className="text-sm text-zinc-500">
                  {formatMoney(selected.initialAmount, { currency })} inicial +{" "}
                  {formatMoney(selected.monthlyDeposit, { currency })}/mês ·{" "}
                  {selected.horizonMonths} meses
                  {selected.targetAmount
                    ? ` · meta ${formatMoney(selected.targetAmount, { currency })}`
                    : ""}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => startEdit(selected)}
                >
                  Editar
                </Button>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Projeção por perfil</CardTitle>
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

              <div className="grid gap-3 lg:grid-cols-3">
                {comparison.map((item) => {
                  const isCurrent = item.profile === selected.riskProfile;
                  return (
                    <Card
                      key={item.profile}
                      className={
                        isCurrent ? "border-emerald-500/50 dark:border-emerald-700/60" : undefined
                      }
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                          {item.label}
                          {isCurrent ? (
                            <Badge variant="success" className="text-[10px]">
                              Seu perfil
                            </Badge>
                          ) : null}
                        </CardTitle>
                        <p className="text-xs text-zinc-500">{item.description}</p>
                      </CardHeader>
                      <CardContent className="space-y-2 pt-0">
                        <div>
                          <p className="text-xs text-zinc-500">
                            Em {selected.horizonMonths} meses (~{item.annualRatePercent}% a.a.)
                          </p>
                          <Money value={item.finalValue} currency={currency} size="lg" />
                        </div>
                        <p className="text-xs text-zinc-500">
                          Aportado: {formatMoney(item.totalDeposited, { currency })} ·
                          rendimento:{" "}
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatMoney(item.earnings, { currency })}
                          </span>
                        </p>
                        {item.totalDeposited > 0 ? (
                          <p className="text-xs text-zinc-400">
                            Retorno total:{" "}
                            <span className="font-medium text-zinc-600 dark:text-zinc-300">
                              {(((item.finalValue - item.totalDeposited) / item.totalDeposited) * 100).toFixed(0)}%
                            </span>
                            {" · "}
                            Real (−5,5% IPCA a.a.):{" "}
                            <span className="font-medium text-zinc-600 dark:text-zinc-300">
                              {(item.annualRatePercent - 5.5).toFixed(1)}% a.a.
                            </span>
                          </p>
                        ) : null}
                        {selected.targetAmount ? (
                          <p className="text-xs">
                            {item.monthsToTarget !== null ? (
                              <>
                                Meta em{" "}
                                <span className="font-medium">
                                  {item.monthsToTarget} meses
                                </span>{" "}
                                ({Math.floor(item.monthsToTarget / 12)}a{" "}
                                {item.monthsToTarget % 12}m)
                              </>
                            ) : (
                              <span className="text-zinc-500">
                                Meta não atingida em 50 anos
                              </span>
                            )}
                          </p>
                        ) : null}
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
        title={editingId ? "Editar plano" : "Novo plano de investimento"}
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
            {editingId ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => void remove()}
                disabled={saving}
              >
                Excluir
              </Button>
            ) : null}
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
            <Label>Nome</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ex.: Aposentadoria, Casa própria…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Moeda</Label>
              <Select
                options={CURRENCY_OPTIONS}
                value={form.currencyCode}
                onChange={(value) => setForm((prev) => ({ ...prev, currencyCode: value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Perfil</Label>
              <Select
                options={PROFILE_OPTIONS}
                value={form.riskProfile}
                onChange={(value) => setForm((prev) => ({ ...prev, riskProfile: value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Valor inicial</Label>
              <NumberInput
                value={form.initialAmount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, initialAmount: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Aporte mensal</Label>
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
              <Label>Prazo (meses)</Label>
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
    </div>
  );
}

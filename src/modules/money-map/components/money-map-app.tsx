"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataList, LineChart } from "@/components/ui/chart";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { IconPlus, IconTarget } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { formatMoney } from "@/lib/format-money";
import type { SerializedMoneyMap } from "@/lib/money-map-serializer";
import { CnpjSelector, type SavedCnpj } from "@/modules/calculator/components/cnpj-selector";
import {
  DEFAULT_COMPARE_INSTITUTIONS,
  createTemplateNodes,
} from "@/modules/money-map/engines/simulation";
import {
  MONEY_MAP_NODE_LABELS,
  MONEY_MAP_TEMPLATES,
  type MoneyMapNodeInput,
  type SimulationResult,
} from "@/modules/money-map/engines/types";

const INSTITUTION_OPTIONS = [
  { value: "inst_wise", label: "Wise", description: "Menor spread" },
  { value: "inst_inter", label: "Banco Inter", description: "Conta global" },
  { value: "inst_btg", label: "BTG Pactual", description: "Banco investimento" },
  { value: "inst_nomad", label: "Nomad", description: "Conta USD" },
  { value: "inst_nubank", label: "Nubank", description: "Fintech" },
  { value: "inst_avenue", label: "Avenue", description: "Invest EUA" },
];

function FlowPath({ simulation }: { simulation: SimulationResult }) {
  const best = simulation.routes[0];
  if (!best) return null;

  const last = best.monthly[best.monthly.length - 1];

  const steps = [
    { label: "Entrada", value: simulation.incomeLabel },
    { label: best.institutionName, value: formatMoney(best.monthly[0]?.grossBrl ?? 0) },
    { label: "Impostos (período)", value: formatMoney(best.totals.taxBrl) },
    { label: "Saídas", value: formatMoney(best.totals.expensesBrl) },
    {
      label: `Líquido (${simulation.horizonMonths}m)`,
      value: formatMoney(best.totals.netBrl),
    },
    {
      label: "Acumulado final",
      value: formatMoney(last?.cumulativeNetBrl ?? best.totals.netBrl),
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs text-zinc-500">{step.label}</p>
            <p className="font-medium tabular-nums">{step.value}</p>
          </div>
          {index < steps.length - 1 ? (
            <span className="text-zinc-400" aria-hidden>
              →
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function MoneyMapApp({ mapId }: { mapId?: string }) {
  const [maps, setMaps] = useState<SerializedMoneyMap[]>([]);
  const [activeMap, setActiveMap] = useState<SerializedMoneyMap | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [incomeAmount, setIncomeAmount] = useState("5000");
  const [incomeCurrency, setIncomeCurrency] = useState("USD");
  const [horizonMonths, setHorizonMonths] = useState(12);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>(
    DEFAULT_COMPARE_INSTITUTIONS,
  );
  const [expenseAmount, setExpenseAmount] = useState("400");
  const [investPercent, setInvestPercent] = useState("20");
  const [cnpj, setCnpj] = useState<SavedCnpj | null>(null);
  const [manualRate, setManualRate] = useState(6);
  const [useManualRate, setUseManualRate] = useState(false);

  const loadMaps = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { response, data } = await fetchJson<{ maps?: SerializedMoneyMap[]; error?: string }>(
      "/api/money-maps",
    );
    setLoading(false);

    if (!response.ok) {
      setError(data?.error ?? "Erro ao carregar mapas.");
      return;
    }

    const list = data?.maps ?? [];
    setMaps(list);

    if (mapId) {
      const found = list.find((item) => item.id === mapId);
      if (found) applyMapToForm(found);
      else {
        const { response: oneRes, data: oneData } = await fetchJson<{ map?: SerializedMoneyMap }>(
          `/api/money-maps/${mapId}`,
        );
        if (oneRes.ok && oneData?.map) applyMapToForm(oneData.map);
      }
    } else if (list[0]) {
      applyMapToForm(list[0]);
    }
  }, [mapId]);

  function applyMapToForm(map: SerializedMoneyMap) {
    setActiveMap(map);
    setHorizonMonths(map.horizonMonths);

    const income = map.nodes.find((n) => n.type === "INCOME");
    if (income?.config) {
      setIncomeAmount(String(income.config.amount ?? 5000));
      setIncomeCurrency(String(income.config.currency ?? "USD"));
    }

    const conversion = map.nodes.find((n) => n.type === "CONVERSION");
    if (conversion?.config && Array.isArray(conversion.config.institutionIds)) {
      setSelectedInstitutions(conversion.config.institutionIds as string[]);
    }

    const expense = map.nodes.find((n) => n.type === "EXPENSE");
    if (expense?.config) {
      setExpenseAmount(String(expense.config.amount ?? 0));
    }

    const invest = map.nodes.find((n) => n.type === "INVESTMENT");
    if (invest?.config) {
      setInvestPercent(String(invest.config.percentOfNet ?? 0));
    }

    const tax = map.nodes.find((n) => n.type === "TAX_PJ");
    if (tax?.config && typeof tax.config.taxRatePercent === "number") {
      setManualRate(tax.config.taxRatePercent as number);
    }
  }

  useEffect(() => {
    void loadMaps();
  }, [loadMaps]);

  const nodesPayload = useMemo((): MoneyMapNodeInput[] => {
    return [
      {
        type: "INCOME",
        label: "Receita",
        sortOrder: 0,
        config: {
          amount: Number(incomeAmount) || 0,
          currency: incomeCurrency as "USD" | "BRL" | "EUR",
          period: "monthly",
        },
      },
      {
        type: "CONVERSION",
        label: "Rotas de câmbio",
        sortOrder: 1,
        config: {
          institutionIds: selectedInstitutions,
          fromCurrency: incomeCurrency as "USD" | "BRL" | "EUR",
          toCurrency: "BRL",
        },
      },
      {
        type: "TAX_PJ",
        label: "Imposto PJ",
        sortOrder: 2,
        config: {
          cnpjId: cnpj?.id ?? null,
          taxRatePercent: useManualRate ? manualRate : cnpj?.taxRate ?? manualRate,
          taxRegime: cnpj?.taxRegime ?? "simples",
          cnaeCode: cnpj?.cnaeCode ?? null,
        },
      },
      {
        type: "EXPENSE",
        label: "Contador",
        sortOrder: 3,
        config: {
          amount: Number(expenseAmount) || 0,
          currency: "BRL",
          period: "monthly",
          label: "Despesas fixas",
        },
      },
      {
        type: "INVESTMENT",
        label: "Investimento",
        sortOrder: 4,
        config: {
          percentOfNet: Number(investPercent) || 0,
          label: "Alocar do líquido",
        },
      },
    ];
  }, [
    cnpj,
    expenseAmount,
    incomeAmount,
    incomeCurrency,
    investPercent,
    manualRate,
    selectedInstitutions,
    useManualRate,
  ]);

  async function createMap() {
    setSaving(true);
    setError(null);

    const { response, data } = await fetchJson<{ map?: SerializedMoneyMap; error?: string }>(
      "/api/money-maps",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "PJ recebe em USD",
          templateId: MONEY_MAP_TEMPLATES.PJ_USD_INCOME,
          horizonMonths: 12,
          nodes: createTemplateNodes(MONEY_MAP_TEMPLATES.PJ_USD_INCOME),
        }),
      },
    );

    setSaving(false);

    if (!response.ok || !data?.map) {
      setError(data?.error ?? "Erro ao criar mapa.");
      return;
    }

    setMaps((prev) => [data.map!, ...prev]);
    applyMapToForm(data.map);
    void runSimulation(data.map.id);
  }

  async function saveMap() {
    if (!activeMap) return;

    setSaving(true);
    setError(null);

    const { response, data } = await fetchJson<{ map?: SerializedMoneyMap; error?: string }>(
      `/api/money-maps/${activeMap.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: activeMap.name,
          horizonMonths,
          nodes: nodesPayload,
        }),
      },
    );

    setSaving(false);

    if (!response.ok || !data?.map) {
      setError(data?.error ?? "Erro ao salvar.");
      return;
    }

    setActiveMap(data.map);
    setMaps((prev) => prev.map((item) => (item.id === data.map!.id ? data.map! : item)));
  }

  async function runSimulation(forMapId?: string) {
    setSimulating(true);
    setError(null);

    const { response, data } = await fetchJson<{
      simulation?: SimulationResult;
      error?: string;
    }>("/api/money-maps/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mapId: forMapId ?? activeMap?.id,
        horizonMonths,
        nodes: nodesPayload,
      }),
    });

    setSimulating(false);

    if (!response.ok || !data?.simulation) {
      setError(data?.error ?? "Erro na simulação.");
      return;
    }

    setSimulation(data.simulation);
  }

  const chartData = useMemo(() => {
    if (!simulation?.routes[0]) return [];
    return simulation.routes[0].monthly.map((row) => ({
      label: `M${row.month}`,
      value: Math.round(row.cumulativeNetBrl),
    }));
  }, [simulation]);

  const toggleInstitution = (id: string) => {
    setSelectedInstitutions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  if (loading) {
    return <p className="py-12 text-sm text-zinc-500">Carregando mapas...</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-emerald-600">Planejamento</p>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Mapa do dinheiro</h2>
          <p className="mt-1 max-w-2xl text-sm text-zinc-500">
            Monte o caminho do seu dinheiro — entradas, conversão, impostos e sobra — e veja quanto
            entra por mês e quanto acumula ao longo do tempo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!activeMap ? (
            <Button type="button" onClick={() => void createMap()} disabled={saving}>
              <IconPlus size="sm" />
              Criar mapa PJ (USD)
            </Button>
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={() => void saveMap()} disabled={saving}>
                {saving ? "Salvando..." : "Salvar mapa"}
              </Button>
              <Button type="button" onClick={() => void runSimulation()} disabled={simulating}>
                {simulating ? "Simulando..." : "Atualizar projeção"}
              </Button>
            </>
          )}
        </div>
      </div>

      {maps.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {maps.map((map) => (
            <Link key={map.id} href={`/money-map/${map.id}`}>
              <Badge variant={activeMap?.id === map.id ? "success" : "outline"}>{map.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {!activeMap ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <IconTarget className="h-10 w-10 text-emerald-600" />
            <p className="max-w-md text-sm text-zinc-500">
              Crie seu primeiro mapa para simular receita em dólar como PJ, comparar Wise, Inter,
              BTG e projetar quanto sobra em 6, 12 ou 24 meses.
            </p>
            <Button type="button" onClick={() => void createMap()} disabled={saving}>
              Começar com template PJ + USD
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Blocos do mapa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5">
                  <Label>{MONEY_MAP_NODE_LABELS.INCOME}</Label>
                  <NumberInput
                    value={incomeAmount}
                    min={0}
                    step="100"
                    onChange={(e) => setIncomeAmount(e.target.value)}
                  />
                  <Select
                    options={[
                      { value: "USD", label: "USD / mês" },
                      { value: "BRL", label: "BRL / mês" },
                      { value: "EUR", label: "EUR / mês" },
                    ]}
                    value={incomeCurrency}
                    onChange={setIncomeCurrency}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{MONEY_MAP_NODE_LABELS.CONVERSION}</Label>
                  <p className="text-xs text-zinc-500">Compare rotas (USD → BRL)</p>
                  <div className="flex flex-wrap gap-2">
                    {INSTITUTION_OPTIONS.map((inst) => (
                      <button
                        key={inst.value}
                        type="button"
                        onClick={() => toggleInstitution(inst.value)}
                        className={
                          selectedInstitutions.includes(inst.value)
                            ? "rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white"
                            : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-700"
                        }
                      >
                        {inst.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>{MONEY_MAP_NODE_LABELS.TAX_PJ}</Label>
                  <CnpjSelector
                    value={cnpj}
                    onChange={setCnpj}
                    manualRate={manualRate}
                    onManualRateChange={setManualRate}
                    useManualRate={useManualRate}
                    onUseManualRateChange={setUseManualRate}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{MONEY_MAP_NODE_LABELS.EXPENSE}</Label>
                  <NumberInput
                    value={expenseAmount}
                    min={0}
                    step="50"
                    onChange={(e) => setExpenseAmount(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">Despesas fixas em BRL / mês</p>
                </div>

                <div className="space-y-1.5">
                  <Label>{MONEY_MAP_NODE_LABELS.INVESTMENT}</Label>
                  <NumberInput
                    value={investPercent}
                    min={0}
                    max={100}
                    step="5"
                    onChange={(e) => setInvestPercent(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">% do líquido mensal a alocar</p>
                </div>

                <div className="space-y-2">
                  <Label>Horizonte: {horizonMonths} meses</Label>
                  <Slider
                    min={3}
                    max={36}
                    step={1}
                    value={horizonMonths}
                    showValue={false}
                    onChange={(event) => setHorizonMonths(Number(event.target.value))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {simulation ? (
              <>
                <Card className="border-emerald-200 bg-emerald-50/40 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <CardContent className="space-y-2 py-4">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                      {simulation.recommendation.summary}
                    </p>
                    {simulation.recommendation.bestRouteLabel !== "—" ? (
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                        Melhor rota: {simulation.recommendation.bestRouteLabel}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Caminho do dinheiro</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto pt-0">
                    <FlowPath simulation={simulation} />
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {simulation.routes.map((route, index) => (
                    <Card
                      key={route.institutionId}
                      className={index === 0 ? "ring-2 ring-emerald-500/40" : undefined}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base">{route.institutionName}</CardTitle>
                          {index === 0 ? <Badge variant="success">Melhor</Badge> : null}
                        </div>
                        {route.quote.stale ? (
                          <p className="text-xs text-amber-600">Taxa pode estar desatualizada</p>
                        ) : null}
                      </CardHeader>
                      <CardContent className="pt-0">
                        <DataList
                          items={[
                            {
                              id: "spread",
                              label: "Spread",
                              value: `${route.quote.spreadPercent.toLocaleString("pt-BR")}%`,
                            },
                            {
                              id: "gross",
                              label: "Bruto/mês",
                              value: formatMoney(route.monthly[0]?.grossBrl ?? 0),
                            },
                            {
                              id: "net-period",
                              label: `Líquido (${simulation.horizonMonths}m)`,
                              value: formatMoney(route.totals.netBrl),
                            },
                            {
                              id: "invest",
                              label: "Investido (sim.)",
                              value: formatMoney(route.totals.investedBrl),
                            },
                          ]}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Acumulado — {simulation.routes[0]?.institutionName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <LineChart data={chartData} className="h-[220px]" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-sm text-zinc-500">
                  Ajuste os blocos e clique em &quot;Atualizar projeção&quot; para ver rotas,
                  caminho do dinheiro e gráfico acumulado.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

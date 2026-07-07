"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Money } from "@/components/ui/money";
import { LineChart, type ChartSeries } from "@/components/ui/chart";
import { formatMoney } from "@/lib/format-money";

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL — Real" },
  { value: "USD", label: "USD — Dólar" },
];

/** Compound growth: lump + annuity */
function futureValue(initial: number, monthly: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return initial + monthly * months;
  const lump = initial * Math.pow(1 + r, months);
  const annuity = monthly * ((Math.pow(1 + r, months) - 1) / r);
  return lump + annuity;
}

/** Months until portfolio reaches target */
function monthsToTarget(initial: number, monthly: number, annualRatePct: number, target: number): number | null {
  const r = annualRatePct / 100 / 12;
  for (let m = 1; m <= 600; m++) {
    if (futureValue(initial, monthly, annualRatePct, m) >= target) return m;
  }
  return null;
}

type FireVariant = {
  id: string;
  name: string;
  multiplier: number;
  description: string;
  badgeVariant: "success" | "default" | "warning";
};

const FIRE_VARIANTS: FireVariant[] = [
  {
    id: "lean",
    name: "Lean FIRE",
    multiplier: 20,
    description: "Vida frugal, gastos mínimos. Taxa de retirada ~5%.",
    badgeVariant: "success",
  },
  {
    id: "regular",
    name: "FIRE",
    multiplier: 25,
    description: "Regra dos 25x. Taxa de retirada segura 4% (Trinity Study).",
    badgeVariant: "default",
  },
  {
    id: "fat",
    name: "Fat FIRE",
    multiplier: 33,
    description: "Vida confortável com margem. Taxa de retirada ~3%.",
    badgeVariant: "warning",
  },
];

const RETURN_OPTIONS = [
  { value: "10.65", label: "Conservador — CDI/Selic (~10.65% a.a.)" },
  { value: "13", label: "Moderado — renda fixa + ações (~13% a.a.)" },
  { value: "16", label: "Arrojado — ações + cripto (~16% a.a.)" },
];

export function FireCalculator() {
  const [monthlyCost, setMonthlyCost] = useState("10000");
  const [currentSavings, setCurrentSavings] = useState("50000");
  const [monthlySavings, setMonthlySavings] = useState("3000");
  const [annualReturn, setAnnualReturn] = useState("13");
  const [inflation, setInflation] = useState("5.5");
  const [currency, setCurrency] = useState("BRL");

  const spend = Math.max(0, Number(monthlyCost) || 0);
  const savings = Math.max(0, Number(currentSavings) || 0);
  const monthly = Math.max(0, Number(monthlySavings) || 0);
  const returnPct = Math.max(0, Number(annualReturn) || 13);
  const inflationPct = Math.max(0, Number(inflation) || 5.5);
  const realReturn = returnPct - inflationPct;

  const annualSpend = spend * 12;

  const variants = useMemo(() =>
    FIRE_VARIANTS.map((v) => {
      const target = annualSpend * v.multiplier;
      const months = annualSpend > 0 ? monthsToTarget(savings, monthly, returnPct, target) : null;
      const years = months !== null ? months / 12 : null;
      const fv = months !== null ? futureValue(savings, monthly, returnPct, months) : null;
      return { ...v, target, months, years, fv };
    }),
    [annualSpend, savings, monthly, returnPct],
  );

  // Chart series: portfolio growth toward Lean/FIRE/Fat FIRE targets
  const chartSeries = useMemo<ChartSeries[]>(() => {
    if (!spend || !monthly) return [];
    const horizonMonths = Math.min(600, Math.max(120, (variants.find((v) => v.id === "fat")?.months ?? 360) + 60));
    const step = Math.max(1, Math.floor(horizonMonths / 30));
    const points = Array.from({ length: Math.ceil(horizonMonths / step) + 1 }, (_, i) => Math.min(i * step, horizonMonths));

    return [
      {
        id: "portfolio",
        label: `Portfólio (${returnPct}% a.a.)`,
        data: points.map((m) => ({ label: `${m}m`, value: Math.round(futureValue(savings, monthly, returnPct, m)) })),
      },
      ...FIRE_VARIANTS.map((v) => ({
        id: v.id,
        label: `Meta ${v.name} (${annualSpend * v.multiplier > 0 ? formatMoney(annualSpend * v.multiplier, { currency }) : "—"})`,
        data: points.map((m) => ({ label: `${m}m`, value: Math.round(annualSpend * v.multiplier) })),
      })),
    ];
  }, [spend, savings, monthly, returnPct, annualSpend, currency, variants]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Moeda</Label>
              <div className="w-28">
                <Select options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} size="sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Gastos mensais atuais</Label>
              <div className="w-40">
                <NumberInput value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} placeholder="10.000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Patrimônio investido atual</Label>
              <div className="w-40">
                <NumberInput value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} placeholder="50.000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Aporte mensal</Label>
              <div className="w-36">
                <NumberInput value={monthlySavings} onChange={(e) => setMonthlySavings(e.target.value)} placeholder="3.000" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Retorno esperado</Label>
              <div className="w-72">
                <Select options={RETURN_OPTIONS} value={annualReturn} onChange={setAnnualReturn} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Inflação estimada (% a.a.)</Label>
              <div className="w-32">
                <NumberInput value={inflation} onChange={(e) => setInflation(e.target.value)} placeholder="5.5" />
              </div>
            </div>
            {annualSpend > 0 && (
              <div className="pb-1 space-y-0.5">
                <p className="text-xs text-zinc-500">
                  Gasto anual: <strong>{formatMoney(annualSpend, { currency })}</strong>
                </p>
                <p className="text-xs text-zinc-500">
                  Retorno real: <strong className={realReturn > 0 ? "text-emerald-600" : "text-red-600"}>{realReturn.toFixed(1)}% a.a.</strong>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* FIRE variants */}
      {annualSpend > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {variants.map((v) => (
            <Card key={v.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{v.name}</CardTitle>
                  <Badge variant={v.badgeVariant}>{v.multiplier}×</Badge>
                </div>
                <p className="text-xs text-zinc-500">{v.description}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-zinc-500">Patrimônio necessário</p>
                  <Money value={v.target} currency={currency} size="lg" />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Falta acumular</span>
                  <span className="font-medium">
                    {formatMoney(Math.max(0, v.target - savings), { currency })}
                  </span>
                </div>
                {v.months !== null ? (
                  <>
                    <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-sm dark:border-zinc-800">
                      <span>Tempo estimado</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {Math.floor(v.months / 12)}a {v.months % 12}m
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Retirada mensal: <strong>{formatMoney((v.target * (1 / v.multiplier)) / 12, { currency })}</strong> (4% rule pró-rata)
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 border-t pt-1.5 border-zinc-100 dark:border-zinc-800">
                    Com os aportes atuais você não atingiria em 50 anos.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartSeries.length > 0 && spend > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Trajetória do portfólio vs. metas FIRE</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={chartSeries[0]?.data ?? []}
              series={chartSeries}
              formatValue={(v) => formatMoney(v, { currency })}
              fullWidth
            />
          </CardContent>
        </Card>
      )}

      {/* Context cards */}
      {annualSpend > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Regra dos 4% (Trinity Study)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              <p>Com um portfólio de <strong>{formatMoney(annualSpend * 25, { currency })}</strong> você pode sacar <strong>{formatMoney(annualSpend, { currency })}/ano</strong> (4% a.a.) com histórico de 30+ anos sem se esgotar.</p>
              <p>Para BRL, considere usar retorno real (nominal − IPCA) para uma estimativa mais conservadora.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Taxa de poupança atual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              {spend > 0 && monthly > 0 ? (
                <>
                  <p>Você poupa <strong>{formatMoney(monthly, { currency })}/mês</strong>. Para cada 10% de aumento na taxa de poupança, o tempo para FIRE reduz consideravelmente.</p>
                  <div className="mt-2 space-y-1">
                    {[10, 20, 30].map((extra) => {
                      const newMonthly = monthly + extra * (spend / 100);
                      const m = monthsToTarget(savings, newMonthly, returnPct, annualSpend * 25);
                      return (
                        <p key={extra}>
                          +{formatMoney(extra * (spend / 100), { currency })}/mês →{" "}
                          <strong>
                            {m !== null ? `${Math.floor(m / 12)}a ${m % 12}m` : "+50 anos"}
                          </strong>{" "}
                          para FIRE padrão
                        </p>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p>Informe seus gastos e aporte para calcular o impacto de aumentar a poupança.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Conceitos FIRE</p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-500">
            <li>• <strong>FIRE</strong> (Financial Independence, Retire Early) — acumule 25× seus gastos anuais e viva dos juros.</li>
            <li>• <strong>Lean FIRE</strong> — vida enxuta, portfólio menor (20×), menor margem de segurança.</li>
            <li>• <strong>Fat FIRE</strong> — conforto elevado, portfólio maior (33×), taxa de retirada mais conservadora.</li>
            <li>• <strong>Barista FIRE</strong> — semi-aposentadoria: portfólio parcial + renda mínima de trabalho eventual.</li>
            <li>• O cálculo é nominal. Para o Brasil, use retorno real (nominal − IPCA) para ser mais conservador.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

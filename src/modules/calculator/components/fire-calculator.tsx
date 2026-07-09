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
import { useT } from "@/i18n/locale-provider";

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL — Real" },
  { value: "USD", label: "USD — Dólar" },
];

function futureValue(initial: number, monthly: number, annualRatePct: number, months: number): number {
  const r = annualRatePct / 100 / 12;
  if (r === 0) return initial + monthly * months;
  const lump = initial * Math.pow(1 + r, months);
  const annuity = monthly * ((Math.pow(1 + r, months) - 1) / r);
  return lump + annuity;
}

function monthsToTarget(initial: number, monthly: number, annualRatePct: number, target: number): number | null {
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
  const t = useT();
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
        label: `${t("calculator.pages.fire.targetLabel")} ${v.name}`,
        data: points.map((m) => ({ label: `${m}m`, value: Math.round(annualSpend * v.multiplier) })),
      })),
    ];
  }, [spend, savings, monthly, returnPct, annualSpend, variants, t]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>{t("calculator.pages.loan.currencyLabel")}</Label>
              <div className="w-28">
                <Select options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} size="sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("calculator.pages.fire.monthlyExpenseLabel")}</Label>
              <div className="w-40">
                <NumberInput value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} placeholder="10.000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("calculator.pages.fire.currentSavingsLabel")}</Label>
              <div className="w-40">
                <NumberInput value={currentSavings} onChange={(e) => setCurrentSavings(e.target.value)} placeholder="50.000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("calculator.pages.fire.monthlyContributionLabel")}</Label>
              <div className="w-36">
                <NumberInput value={monthlySavings} onChange={(e) => setMonthlySavings(e.target.value)} placeholder="3.000" />
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>{t("calculator.pages.fire.annualReturnLabel")}</Label>
              <div className="w-72">
                <Select options={RETURN_OPTIONS} value={annualReturn} onChange={setAnnualReturn} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("calculator.pages.fire.inflationLabel")}</Label>
              <div className="w-32">
                <NumberInput value={inflation} onChange={(e) => setInflation(e.target.value)} placeholder="5.5" />
              </div>
            </div>
            {annualSpend > 0 && (
              <div className="pb-1 space-y-0.5">
                <p className="text-xs text-zinc-500">
                  {formatMoney(annualSpend, { currency })}
                </p>
                <p className="text-xs text-zinc-500">
                  <strong className={realReturn > 0 ? "text-emerald-600" : "text-red-600"}>{realReturn.toFixed(1)}% a.a.</strong>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                  <p className="text-xs text-zinc-500">{t("calculator.pages.fire.targetLabel")}</p>
                  <Money value={v.target} currency={currency} size="lg" />
                  <p className="text-[10px] text-zinc-400">{t("calculator.pages.fire.targetHint")}</p>
                </div>
                {v.months !== null ? (
                  <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-sm dark:border-zinc-800">
                    <span>{t("calculator.pages.fire.yearsToFire")}</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {Math.floor(v.months / 12)}a {v.months % 12}m
                    </span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chartSeries.length > 0 && spend > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("calculator.pages.fire.projectedWealth")}</CardTitle>
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

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{t("calculator.pages.fire.ruleTitle")}</p>
          <p className="mt-2 text-xs text-zinc-500">{t("calculator.pages.fire.ruleDesc")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

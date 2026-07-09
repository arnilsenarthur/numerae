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
  { value: "EUR", label: "EUR — Euro" },
];

type AmortizationRow = {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

function calcSAC(
  principal: number,
  annualRatePct: number,
  months: number,
): AmortizationRow[] {
  const r = annualRatePct / 100 / 12;
  const constPrincipal = principal / months;
  const rows: AmortizationRow[] = [];
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const payment = constPrincipal + interest;
    balance -= constPrincipal;
    rows.push({ period: i, payment, principal: constPrincipal, interest, balance: Math.max(0, balance) });
  }
  return rows;
}

function calcPrice(
  principal: number,
  annualRatePct: number,
  months: number,
): AmortizationRow[] {
  const r = annualRatePct / 100 / 12;
  const pmt = r === 0 ? principal / months : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const rows: AmortizationRow[] = [];
  let balance = principal;
  for (let i = 1; i <= months; i++) {
    const interest = balance * r;
    const principalPaid = pmt - interest;
    balance -= principalPaid;
    rows.push({ period: i, payment: pmt, principal: principalPaid, interest, balance: Math.max(0, balance) });
  }
  return rows;
}

function totalInterest(rows: AmortizationRow[]): number {
  return rows.reduce((sum, r) => sum + r.interest, 0);
}

function totalPaid(rows: AmortizationRow[]): number {
  return rows.reduce((sum, r) => sum + r.payment, 0);
}

export function LoanCalculator() {
  const t = useT();
  const [principal, setPrincipal] = useState("500000");
  const [annualRate, setAnnualRate] = useState("10.5");
  const [months, setMonths] = useState("360");
  const [currency, setCurrency] = useState("BRL");
  const [showTable, setShowTable] = useState(false);

  const p = Math.max(0, Number(principal) || 0);
  const r = Math.max(0, Number(annualRate) || 0);
  const n = Math.max(1, Math.min(600, Number(months) || 360));

  const sac = useMemo(() => (p > 0 && r > 0 ? calcSAC(p, r, n) : []), [p, r, n]);
  const price = useMemo(() => (p > 0 && r > 0 ? calcPrice(p, r, n) : []), [p, r, n]);

  const sacFirst = sac[0];
  const priceFirst = price[0];
  const sacLast = sac.at(-1);

  const chartSeries = useMemo<ChartSeries[]>(() => {
    if (!sac.length || !price.length) return [];
    const step = Math.max(1, Math.floor(n / 24));
    const points = Array.from({ length: Math.ceil(n / step) + 1 }, (_, i) => {
      const month = Math.min(i * step, n);
      return { month };
    });
    return [
      {
        id: "sac",
        label: t("calculator.pages.loan.sacBalance"),
        data: points.map(({ month }) => ({
          label: `${month}m`,
          value: Math.round(sac[month - 1]?.balance ?? 0),
        })),
      },
      {
        id: "price",
        label: t("calculator.pages.loan.priceBalance"),
        data: points.map(({ month }) => ({
          label: `${month}m`,
          value: Math.round(price[month - 1]?.balance ?? 0),
        })),
      },
    ];
  }, [sac, price, n, t]);

  const hasData = sac.length > 0 && price.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>{t("calculator.pages.loan.currencyLabel")}</Label>
              <div className="w-32">
                <Select options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} size="sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("calculator.pages.loan.amountLabel")}</Label>
              <div className="w-44">
                <NumberInput value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="500.000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("calculator.pages.loan.rateLabel")}</Label>
              <div className="w-36">
                <NumberInput value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} placeholder="10,5" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("calculator.pages.loan.termLabel")}</Label>
              <div className="w-28">
                <NumberInput value={String(n)} onChange={(e) => setMonths(e.target.value)} placeholder="360" />
              </div>
            </div>
            {n > 0 && (
              <p className="mb-1 text-xs text-zinc-500">
                {t("calculator.pages.loan.termHint")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {hasData && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("calculator.pages.loan.sacTitle")}</CardTitle>
                  <Badge variant="success">{t("calculator.pages.loan.sacBadge")}</Badge>
                </div>
                <p className="text-xs text-zinc-500">{t("calculator.pages.loan.sacDesc")}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">{t("calculator.pages.loan.firstInstallment")}</span>
                  <Money value={sacFirst?.payment ?? 0} currency={currency} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">{t("calculator.pages.loan.lastInstallment")}</span>
                  <Money value={sacLast?.payment ?? 0} currency={currency} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">{t("calculator.pages.loan.totalInterest")}</span>
                  <span className="font-medium text-red-600">{formatMoney(totalInterest(sac), { currency })}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-sm dark:border-zinc-800">
                  <span>{t("calculator.pages.loan.totalPaid")}</span>
                  <Money value={totalPaid(sac)} currency={currency} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{t("calculator.pages.loan.priceTitle")}</CardTitle>
                </div>
                <p className="text-xs text-zinc-500">{t("calculator.pages.loan.priceDesc")}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">{t("calculator.pages.loan.priceTitle")}</span>
                  <Money value={priceFirst?.payment ?? 0} currency={currency} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">{t("calculator.pages.loan.totalInterest")}</span>
                  <span className="font-medium text-red-600">{formatMoney(totalInterest(price), { currency })}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-sm dark:border-zinc-800">
                  <span>{t("calculator.pages.loan.totalPaid")}</span>
                  <Money value={totalPaid(price)} currency={currency} />
                </div>
              </CardContent>
            </Card>
          </div>

          {chartSeries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("calculator.pages.loan.sacBalance")}</CardTitle>
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
        </>
      )}
    </div>
  );
}

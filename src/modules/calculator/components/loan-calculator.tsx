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
  { value: "EUR", label: "EUR — Euro" },
];

type AmortizationRow = {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
};

/** SAC: amortização constante — parcela decresce */
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

/** Price (Tabela Price): parcela fixa */
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

  // Chart: balance over time (every 12 months)
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
        label: "SAC — saldo devedor",
        data: points.map(({ month }) => ({
          label: `${month}m`,
          value: Math.round(sac[month - 1]?.balance ?? 0),
        })),
      },
      {
        id: "price",
        label: "Price — saldo devedor",
        data: points.map(({ month }) => ({
          label: `${month}m`,
          value: Math.round(price[month - 1]?.balance ?? 0),
        })),
      },
    ];
  }, [sac, price, n]);

  const hasData = sac.length > 0 && price.length > 0;

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>Moeda</Label>
              <div className="w-32">
                <Select options={CURRENCY_OPTIONS} value={currency} onChange={setCurrency} size="sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Valor financiado</Label>
              <div className="w-44">
                <NumberInput value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="500.000" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Taxa de juros (% a.a.)</Label>
              <div className="w-36">
                <NumberInput value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} placeholder="10,5" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Prazo (meses)</Label>
              <div className="w-28">
                <NumberInput value={String(n)} onChange={(e) => setMonths(e.target.value)} placeholder="360" />
              </div>
            </div>
            {n > 0 && (
              <p className="mb-1 text-xs text-zinc-500">
                {Math.floor(n / 12)}a {n % 12}m · taxa mensal: {(r / 12).toFixed(4)}%
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {hasData && (
        <>
          {/* Comparison cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* SAC */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">SAC</CardTitle>
                  <Badge variant="success">Menos juros no total</Badge>
                </div>
                <p className="text-xs text-zinc-500">Amortização constante — parcela decresce ao longo do tempo.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">1ª parcela</span>
                  <Money value={sacFirst?.payment ?? 0} currency={currency} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Última parcela</span>
                  <Money value={sacLast?.payment ?? 0} currency={currency} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Total de juros</span>
                  <span className="font-medium text-red-600">{formatMoney(totalInterest(sac), { currency })}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-sm dark:border-zinc-800">
                  <span>Total pago</span>
                  <Money value={totalPaid(sac)} currency={currency} />
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Juros sobre o principal</span>
                  <span>{p > 0 ? ((totalInterest(sac) / p) * 100).toFixed(1) : 0}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Price */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Price (Tabela Price)</CardTitle>
                  <Badge variant="default">Parcela fixa</Badge>
                </div>
                <p className="text-xs text-zinc-500">Parcela constante — previsibilidade no orçamento mensal.</p>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Parcela fixa</span>
                  <Money value={priceFirst?.payment ?? 0} currency={currency} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">vs. 1ª SAC</span>
                  <span className={`text-sm ${(priceFirst?.payment ?? 0) < (sacFirst?.payment ?? 0) ? "text-emerald-600" : "text-amber-600"}`}>
                    {formatMoney(Math.abs((priceFirst?.payment ?? 0) - (sacFirst?.payment ?? 0)), { currency })}
                    {" "}{(priceFirst?.payment ?? 0) < (sacFirst?.payment ?? 0) ? "menor" : "maior"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Total de juros</span>
                  <span className="font-medium text-red-600">{formatMoney(totalInterest(price), { currency })}</span>
                </div>
                <div className="flex justify-between border-t border-zinc-100 pt-1.5 text-sm dark:border-zinc-800">
                  <span>Total pago</span>
                  <Money value={totalPaid(price)} currency={currency} />
                </div>
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Juros sobre o principal</span>
                  <span>{p > 0 ? ((totalInterest(price) / p) * 100).toFixed(1) : 0}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delta summary */}
          <Card className="bg-zinc-50 dark:bg-zinc-900/50">
            <CardContent className="py-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                O SAC paga{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {formatMoney(totalInterest(price) - totalInterest(sac), { currency })}
                </strong>{" "}
                menos em juros que a Tabela Price, porém a primeira parcela é{" "}
                <strong>
                  {formatMoney((sacFirst?.payment ?? 0) - (priceFirst?.payment ?? 0), { currency })}
                </strong>{" "}
                maior.
              </p>
            </CardContent>
          </Card>

          {/* Balance chart */}
          {chartSeries.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução do saldo devedor</CardTitle>
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

          {/* Amortization table (collapsible) */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tabela de amortização</CardTitle>
                <button
                  type="button"
                  onClick={() => setShowTable(!showTable)}
                  className="text-xs text-sky-600 hover:underline dark:text-sky-400"
                >
                  {showTable ? "Ocultar" : "Ver todos os períodos"}
                </button>
              </div>
            </CardHeader>
            {showTable && (
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="pb-1.5 text-left text-zinc-500">Período</th>
                        <th className="pb-1.5 text-right text-zinc-500">Parcela SAC</th>
                        <th className="pb-1.5 text-right text-zinc-500">Parcela Price</th>
                        <th className="pb-1.5 text-right text-zinc-500">Juros SAC</th>
                        <th className="pb-1.5 text-right text-zinc-500">Saldo SAC</th>
                        <th className="pb-1.5 text-right text-zinc-500">Saldo Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sac
                        .filter((_, i) => i % Math.max(1, Math.floor(n / 60)) === 0 || i === n - 1)
                        .map((row) => {
                          const priceRow = price[row.period - 1];
                          return (
                            <tr key={row.period} className="border-b border-zinc-100 dark:border-zinc-800">
                              <td className="py-1.5 text-zinc-600">{row.period}</td>
                              <td className="py-1.5 text-right">{formatMoney(row.payment, { currency })}</td>
                              <td className="py-1.5 text-right">{formatMoney(priceRow?.payment ?? 0, { currency })}</td>
                              <td className="py-1.5 text-right text-red-500">{formatMoney(row.interest, { currency })}</td>
                              <td className="py-1.5 text-right">{formatMoney(row.balance, { currency })}</td>
                              <td className="py-1.5 text-right">{formatMoney(priceRow?.balance ?? 0, { currency })}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-zinc-400">
                  * Tabela amostrada a cada ~{Math.max(1, Math.floor(n / 60))} meses para facilitar leitura.
                </p>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardContent className="pt-4">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Dicas</p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                <li>• <strong>SAC</strong> é preferível quando você pode arcar com a parcela inicial maior — paga menos juros no total.</li>
                <li>• <strong>Price</strong> é mais fácil de planejar com parcela fixa, mas custará mais no longo prazo.</li>
                <li>• Amortizações extras reduzem o prazo e os juros independente do sistema escolhido.</li>
                <li>• Taxa de juros nominal ≠ CET (Custo Efetivo Total) — o banco pode cobrar seguros e tarifas adicionais.</li>
              </ul>
            </CardContent>
          </Card>
        </>
      )}

      {!hasData && p > 0 && (
        <p className="py-6 text-center text-sm text-zinc-500">Informe a taxa de juros para calcular.</p>
      )}
      {!hasData && p === 0 && (
        <p className="py-6 text-center text-sm text-zinc-500">Preencha os campos acima para simular o financiamento.</p>
      )}
    </div>
  );
}

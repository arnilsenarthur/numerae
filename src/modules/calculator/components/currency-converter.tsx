"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { InlineResultSkeleton } from "@/components/ui/panel-skeleton";
import { IconExchange, IconTrendUp } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { formatMoney } from "@/lib/format-money";
import { useLocale, useT } from "@/i18n/locale-provider";

const POPULAR_CURRENCIES = [
  { value: "USD", label: "USD — Dólar americano" },
  { value: "BRL", label: "BRL — Real brasileiro" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — Libra esterlina" },
  { value: "ARS", label: "ARS — Peso argentino" },
  { value: "CAD", label: "CAD — Dólar canadense" },
  { value: "CHF", label: "CHF — Franco suíço" },
  { value: "CNY", label: "CNY — Yuan chinês" },
  { value: "JPY", label: "JPY — Iene japonês" },
  { value: "MXN", label: "MXN — Peso mexicano" },
  { value: "AUD", label: "AUD — Dólar australiano" },
  { value: "USDT", label: "USDT — Tether (stablecoin)" },
];

type RateResult = {
  from: string;
  to: string;
  rate: number;
  date: string;
};

/** Spread presets simulating typical institutional rates (spread % on market rate) */
const INSTITUTION_SPREADS: { name: string; spread: number; fee: number; notes: string }[] = [
  { name: "Wise", spread: 0.55, fee: 0, notes: "Taxa mid-market, melhor para remessas frequentes" },
  { name: "Remessa Online", spread: 0.9, fee: 0, notes: "Especialista em remessas internacionais" },
  { name: "Inter Global", spread: 1.2, fee: 0, notes: "Conta global gratuita" },
  { name: "Nomad", spread: 1.5, fee: 0, notes: "Conta em USD + câmbio ao repatriar" },
  { name: "BTG Pactual", spread: 1.5, fee: 0, notes: "Boa para valores acima de USD 10k" },
  { name: "C6 Bank", spread: 2.0, fee: 0, notes: "Conta global C6, praticidade" },
  { name: "Itaú", spread: 2.5, fee: 20, notes: "Banco tradicional, IOF padrão" },
  { name: "Banco do Brasil", spread: 2.8, fee: 20, notes: "Spread maior, taxa fixa" },
  { name: "Bradesco", spread: 3.0, fee: 25, notes: "Banco tradicional" },
  { name: "Caixa Econômica", spread: 3.2, fee: 25, notes: "Menos competitivo para câmbio" },
];

export function CurrencyConverter() {
  const t = useT();
  const { locale } = useLocale();
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("BRL");
  const [result, setResult] = useState<RateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRate = useCallback(async (from: string, to: string) => {
    if (from === to) {
      setResult({ from, to, rate: 1, date: new Date().toISOString().slice(0, 10) });
      return;
    }
    setLoading(true);
    setError(null);
    const { response, data } = await fetchJson<RateResult & { error?: string }>(
      `/api/exchange-rate?from=${from}&to=${to}`,
    );
    setLoading(false);
    if (response.ok && data) {
      setResult(data);
    } else {
      setError((data as { error?: string })?.error ?? t("calculator.pages.exchange.fetchError"));
    }
  }, [t]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void fetchRate(fromCurrency, toCurrency);
    }, 400);
  }, [fromCurrency, toCurrency, fetchRate]);

  function swap() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  const numAmount = Math.max(0, Number(amount) || 0);
  const baseConverted = result ? numAmount * result.rate : null;
  const formattedRate = result
    ? result.rate.toLocaleString(locale, { minimumFractionDigits: 4, maximumFractionDigits: 4 })
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label>{t("calculator.pages.exchange.amountLabel")}</Label>
              <div className="w-36">
                <NumberInput
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1.000"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("calculator.pages.exchange.fromLabel")}</Label>
              <div className="w-52">
                <Select
                  options={POPULAR_CURRENCIES}
                  value={fromCurrency}
                  onChange={setFromCurrency}
                />
              </div>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={swap} className="mb-0.5">
              <IconExchange className="h-4 w-4" /> {t("calculator.pages.exchange.swap")}
            </Button>
            <div className="space-y-1">
              <Label>{t("calculator.pages.exchange.toLabel")}</Label>
              <div className="w-52">
                <Select
                  options={POPULAR_CURRENCIES}
                  value={toCurrency}
                  onChange={setToCurrency}
                />
              </div>
            </div>
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          ) : loading ? (
            <InlineResultSkeleton />
          ) : result ? (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {baseConverted !== null
                    ? formatMoney(baseConverted, { currency: toCurrency })
                    : "—"}
                </span>
                <span className="text-sm text-zinc-500">
                  {t("calculator.pages.exchange.rateLabel", {
                    from: fromCurrency,
                    rate: formattedRate ?? "",
                    to: toCurrency,
                  })}
                </span>
                <Badge variant="default" className="ml-auto text-[10px]">
                  {t("calculator.pages.exchange.updatedAt", { time: result.date })}
                </Badge>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {result && baseConverted !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <IconTrendUp className="h-4 w-4 text-sky-500" />
              {t("calculator.pages.exchange.compareTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {INSTITUTION_SPREADS
                .map((inst) => {
                  const effectiveRate = result.rate * (1 - inst.spread / 100);
                  const converted = numAmount * effectiveRate - inst.fee;
                  const diff = converted - baseConverted;
                  const diffPct = baseConverted > 0 ? (diff / baseConverted) * 100 : 0;
                  return { ...inst, effectiveRate, converted, diff, diffPct };
                })
                .sort((a, b) => b.converted - a.converted)
                .map((inst, i) => {
                  const isBest = i === 0;
                  const isWorst = i === INSTITUTION_SPREADS.length - 1;
                  return (
                    <div
                      key={inst.name}
                      className={`flex items-center gap-3 py-2.5 ${isBest ? "rounded-lg bg-emerald-50/60 px-2 dark:bg-emerald-950/20" : ""}`}
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isBest ? "bg-emerald-500 text-white" : isWorst ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{inst.name}</p>
                          {isBest && <Badge variant="success" className="text-[10px]">{t("calculator.pages.exchange.bestOption")}</Badge>}
                        </div>
                        <p className="text-xs text-zinc-500">
                          {inst.notes} · {t("calculator.pages.exchange.spreadLabel", { spread: inst.spread, fee: inst.fee > 0 ? `+ ${inst.fee} ${toCurrency}` : "0" })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isBest ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                          {formatMoney(Math.max(0, inst.converted), { currency: toCurrency })}
                        </p>
                        <p className={`text-xs ${inst.diffPct < -3 ? "text-red-500" : inst.diffPct < -1.5 ? "text-amber-500" : "text-zinc-400"}`}>
                          {t("calculator.pages.exchange.savingsVsWorst", { pct: inst.diffPct.toFixed(2) })}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>

            {numAmount > 0 && (
              <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
                {t("calculator.pages.exchange.savingsHint")}{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  {formatMoney(
                    Math.max(0,
                      ([...INSTITUTION_SPREADS]
                        .map(i => numAmount * result.rate * (1 - i.spread / 100) - i.fee)
                        .sort((a, b) => b - a)[0] ?? 0) -
                      ([...INSTITUTION_SPREADS]
                        .map(i => numAmount * result.rate * (1 - i.spread / 100) - i.fee)
                        .sort((a, b) => b - a).at(-1) ?? 0)
                    ),
                    { currency: toCurrency }
                  )}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-zinc-400">{t("calculator.pages.exchange.disclaimer")}</p>
    </div>
  );
}

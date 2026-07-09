"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CompanyPicker, MANUAL_COMPANY_ID } from "@/components/ui/company-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/ui/money";
import { fetchJson } from "@/lib/fetch-json";
import { formatMoney } from "@/lib/format-money";
import { useT } from "@/i18n/locale-provider";
import type { TranslateFn } from "@/i18n/translate";
import { useCompanies } from "@/modules/calculator/hooks/use-companies";
import {
  calcMonthlyTaxByRegime,
  calcSimplesEffectiveRate,
  type PjRegimeId,
} from "@/modules/calculator/engines/br/regime-comparison";
import { SIMPLES_ANNEX_III, SIMPLES_ANNEX_V } from "@/modules/calculator/engines/br/tables/2025";
import { FATOR_R_THRESHOLD } from "@/modules/calculator/engines/br/fator-r";

const IOF_RATE = 0.0138;

type Institution = {
  name: string;
  spread: number;
  fixedFee: number;
  notes: string;
  recommended?: boolean;
};

const INSTITUTIONS: Institution[] = [
  { name: "Wise", spread: 0.55, fixedFee: 0, notes: "Taxa mid-market + spread baixo", recommended: true },
  { name: "Remessa Online", spread: 0.9, fixedFee: 0, notes: "Plataforma especializada em remessas" },
  { name: "Inter", spread: 1.2, fixedFee: 0, notes: "Banco digital, sem taxa fixa" },
  { name: "BTG Pactual", spread: 1.5, fixedFee: 0, notes: "Conta global, boa para valores maiores" },
  { name: "Nomad", spread: 1.8, fixedFee: 0, notes: "Conta em USD + câmbio ao converter" },
  { name: "Banco do Brasil", spread: 2.8, fixedFee: 15, notes: "Banco tradicional, spread maior" },
];

function calcTax(brlGross: number, regime: string, manualRatePercent = 0): number {
  return calcMonthlyTaxByRegime(regime as PjRegimeId, brlGross, manualRatePercent);
}

function taxLabel(regime: string, t: TranslateFn): string {
  if (regime === "mei") return t("calculator.pages.salary.taxLabelMei");
  if (regime === "simples_iii") return t("calculator.pages.salary.taxLabelSimplesIII");
  if (regime === "simples_v") return t("calculator.pages.salary.taxLabelSimplesV");
  if (regime === "lucro_presumido") return t("calculator.pages.salary.taxLabelLucroPresumido");
  if (regime === "manual") return t("calculator.pages.salary.taxLabelManual");
  return regime;
}

export function SalaryOptimizer() {
  const t = useT();
  const sourceCurrencies = useMemo(
    () => [
      { value: "USD", label: t("calculator.pages.salary.currencyUsd") },
      { value: "EUR", label: t("calculator.pages.salary.currencyEur") },
      { value: "GBP", label: t("calculator.pages.salary.currencyGbp") },
      { value: "CAD", label: t("calculator.pages.salary.currencyCad") },
    ],
    [t],
  );
  const taxRegimeOptions = useMemo(
    () => [
      { value: "mei", label: t("calculator.pages.salary.regimeMei") },
      { value: "simples_iii", label: t("calculator.pages.salary.regimeSimplesIII") },
      { value: "simples_v", label: t("calculator.pages.salary.regimeSimplesV") },
      { value: "lucro_presumido", label: t("calculator.pages.salary.regimeLucroPresumido") },
      { value: "manual", label: t("calculator.pages.salary.regimeManual") },
    ],
    [t],
  );
  const { companies, loading: loadingCompanies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(MANUAL_COMPANY_ID);
  const [amount, setAmount] = useState("5000");
  const [currency, setCurrency] = useState("USD");
  const [taxRegime, setTaxRegime] = useState("simples_iii");
  const [manualRate, setManualRate] = useState("");
  const [marketRate, setMarketRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState<string | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAutoSelectCompany = useRef(false);

  const selectedCompany =
    selectedCompanyId === MANUAL_COMPANY_ID
      ? null
      : (companies.find((c) => c.id === selectedCompanyId) ?? null);
  const isManualCompany =
    selectedCompanyId === MANUAL_COMPANY_ID || selectedCompany?.taxRegime === "manual";

  useEffect(() => {
    if (loadingCompanies || didAutoSelectCompany.current || companies.length === 0) return;
    const defaultCompany = companies.find((c) => c.isDefault) ?? companies[0];
    if (defaultCompany) {
      setSelectedCompanyId(defaultCompany.id);
      didAutoSelectCompany.current = true;
    }
  }, [companies, loadingCompanies]);

  // Sync regime when company changes
  useEffect(() => {
    if (!selectedCompany) {
      if (selectedCompanyId === MANUAL_COMPANY_ID) setTaxRegime("manual");
      return;
    }
    if (selectedCompany.taxRegime === "simples") setTaxRegime("simples_iii");
    else if (selectedCompany.taxRegime === "presumido") setTaxRegime("lucro_presumido");
    else if (selectedCompany.taxRegime === "manual") {
      setTaxRegime("manual");
      if (selectedCompany.taxRate != null) setManualRate(String(selectedCompany.taxRate));
    }
  }, [selectedCompany, selectedCompanyId]);

  const fetchRate = useCallback(async (from: string) => {
    setLoadingRate(true);
    const { response, data } = await fetchJson<{ rate?: number; date?: string; error?: string }>(
      `/api/exchange-rate?from=${from}&to=BRL`,
    );
    setLoadingRate(false);
    if (response.ok && data?.rate) {
      setMarketRate(data.rate);
      setRateDate(data.date ?? null);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void fetchRate(currency), 400);
  }, [currency, fetchRate]);

  const numAmount = Math.max(0, Number(amount) || 0);

  const manualRateValue = Math.max(0, Number(manualRate) || 0);
  const usesManualRate = taxRegime === "manual" || isManualCompany;

  const rows = useMemo(() => {
    if (!marketRate || numAmount <= 0) return [];
    const effectiveRegime = usesManualRate ? "manual" : taxRegime;
    return INSTITUTIONS.map((inst) => {
      const effectiveRate = marketRate * (1 - inst.spread / 100);
      const brlBeforeIof = numAmount * effectiveRate - inst.fixedFee;
      const iofCost = brlBeforeIof * IOF_RATE;
      const brlAfterIof = brlBeforeIof - iofCost;
      const tax = calcTax(brlAfterIof, effectiveRegime, manualRateValue);
      const netBrl = brlAfterIof - tax;
      const netRate = numAmount > 0 ? netBrl / numAmount : 0;
      return { ...inst, effectiveRate, brlAfterIof, iofCost, tax, netBrl, netRate };
    }).sort((a, b) => b.netBrl - a.netBrl);
  }, [marketRate, numAmount, taxRegime, usesManualRate, manualRateValue]);

  const best = rows[0] ?? null;

  // Effective annual tax rate for advisory tip
  const annualBrlEstimate = numAmount * (marketRate ?? 0) * 12;
  const simplesIIIRate =
    annualBrlEstimate > 0 ? calcSimplesEffectiveRate(annualBrlEstimate, SIMPLES_ANNEX_III) : 0;
  const simplesVRate =
    annualBrlEstimate > 0 ? calcSimplesEffectiveRate(annualBrlEstimate, SIMPLES_ANNEX_V) : 0;
  const minProlaboreIII =
    annualBrlEstimate > 0 ? (annualBrlEstimate * FATOR_R_THRESHOLD) / 12 : 0;

  return (
    <div className="space-y-4">
      {/* Inputs */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* Company picker */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-80">
              <CompanyPicker
                label={t("calculator.pages.taxes.companyLabel")}
                companies={companies}
                loading={loadingCompanies}
                valueId={selectedCompanyId}
                onSelect={(company) =>
                  setSelectedCompanyId(company?.id ?? MANUAL_COMPANY_ID)
                }
              />
            </div>
            {selectedCompany && (
              <div className="pb-1">
                <Badge variant="default">
                  {selectedCompany.taxRegime === "simples" ? t("calculator.pages.taxes.regimeSimples") : selectedCompany.taxRegime === "presumido" ? t("calculator.pages.taxes.regimePresumido") : t("calculator.pages.taxes.regimeManual")}
                </Badge>
                {selectedCompany.activityDescription && (
                  <p className="mt-0.5 text-xs text-zinc-500">{selectedCompany.activityDescription}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>{t("calculator.pages.salary.title")}</Label>
              <div className="flex items-center gap-2">
                <div className="w-28">
                  <Select options={sourceCurrencies} value={currency} onChange={setCurrency} size="sm" />
                </div>
                <div className="w-36">
                  <NumberInput
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="5.000"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t("companies.ui.form.taxRegimeLabel")}</Label>
              <div className="w-64">
                <Select
                  options={taxRegimeOptions}
                  value={isManualCompany ? "manual" : taxRegime}
                  onChange={setTaxRegime}
                  disabled={isManualCompany}
                />
              </div>
            </div>
            {(taxRegime === "manual" || isManualCompany) && (
              <div className="space-y-1">
                <Label>{t("calculator.pages.taxes.manualRateLabel")}</Label>
                <div className="w-28">
                  <NumberInput
                    value={manualRate}
                    onChange={(e) => setManualRate(e.target.value)}
                    placeholder={t("calculator.pages.taxes.manualRatePlaceholder")}
                  />
                </div>
              </div>
            )}
            {loadingRate ? (
              <Skeleton className="mb-1 h-3 w-56" />
            ) : marketRate ? (
              <p className="mb-1 text-xs text-zinc-500">
                {t("calculator.pages.salary.marketRate")}{" "}
                {t("calculator.pages.exchange.rateLabel", {
                  from: currency,
                  rate: marketRate.toFixed(4),
                  to: "BRL",
                })}
                {rateDate ? ` · ${rateDate}` : ""}
              </p>
            ) : null}
          </div>

          {/* Fator R hint when Simples selected */}
          {(taxRegime === "simples_iii" || taxRegime === "simples_v") && marketRate && numAmount > 0 && (
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-xs dark:border-sky-800 dark:bg-sky-950/30">
              <span className="font-medium text-sky-700 dark:text-sky-300">
                {t("calculator.pages.salary.fatorRTitle")}
              </span>
              <span className="ml-1 text-zinc-600 dark:text-zinc-400">
                {t("calculator.pages.salary.fatorRHint", {
                  rateIII: (simplesIIIRate * 100).toFixed(1),
                  rateV: (simplesVRate * 100).toFixed(1),
                  minProlabore: formatMoney(minProlaboreIII, { currency: "BRL" }),
                })}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results table */}
      {rows.length > 0 ? (
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("calculator.pages.salary.compareTitle", {
                  regime: taxLabel(usesManualRate ? "manual" : taxRegime, t),
                })}
                {usesManualRate && manualRateValue > 0 ? ` (${manualRateValue.toFixed(1)}%)` : ""}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((row, i) => {
                  const isBest = i === 0;
                  const isWorst = i === rows.length - 1;
                  return (
                    <div
                      key={row.name}
                      className={`flex items-center gap-3 py-3 ${isBest ? "rounded-lg bg-emerald-50/60 px-2 dark:bg-emerald-950/20" : ""}`}
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isBest ? "bg-emerald-500 text-white" : isWorst ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{row.name}</p>
                          {isBest && <Badge variant="success" className="text-[10px]">{t("calculator.pages.exchange.bestOption")}</Badge>}
                        </div>
                        <p className="text-xs text-zinc-500">
                          {t("calculator.pages.salary.spreadLine", {
                            notes: row.notes,
                            spread: row.spread,
                            fee:
                              row.fixedFee > 0
                                ? t("calculator.pages.salary.fixedFeeSuffix", { fee: row.fixedFee })
                                : "",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${isBest ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
                          {formatMoney(row.netBrl, { currency: "BRL" })}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {t("calculator.pages.salary.grossLine", {
                            gross: formatMoney(row.brlAfterIof, { currency: "BRL" }),
                            tax: formatMoney(row.tax, { currency: "BRL" }),
                          })}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {t("calculator.pages.salary.netRateLine", {
                            rate: row.netRate.toFixed(4),
                            currency,
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {rows.length >= 2 && (
                <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-900">
                  {t("calculator.pages.salary.bestVsWorst", {
                    amount: formatMoney((rows[0]?.netBrl ?? 0) - (rows.at(-1)?.netBrl ?? 0), {
                      currency: "BRL",
                    }),
                    name: rows[0]?.name ?? "",
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {best && (
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="py-3">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {t("calculator.pages.salary.bestSummary", {
                    institution: best.name,
                    regime: taxLabel(taxRegime, t),
                    net: formatMoney(best.netBrl, { currency: "BRL" }),
                    rate: best.netRate.toFixed(4),
                    currency,
                    fxCost: formatMoney(
                      best.iofCost + (numAmount * marketRate! - numAmount * best.effectiveRate),
                      { currency: "BRL" },
                    ),
                    tax: formatMoney(best.tax, { currency: "BRL" }),
                  })}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-zinc-500">
          {t("calculator.pages.salary.emptyHint")}
        </p>
      )}

      <p className="text-xs text-zinc-400">{t("calculator.pages.salary.disclaimer")}</p>
    </div>
  );
}

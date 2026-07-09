"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyPicker, MANUAL_COMPANY_ID } from "@/components/ui/company-picker";
import { Money } from "@/components/ui/money";
import { StatCard } from "@/components/ui/stat-card";
import { formatMoney } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { useCompanies } from "@/modules/calculator/hooks/use-companies";
import { calculateCltBr } from "@/modules/calculator/engines/br/clt";
import {
  comparePjRegimesBr,
  type PjRegimeId,
  type PjRegimeResult,
  type TaxLineItem,
} from "@/modules/calculator/engines/br/regime-comparison";
import { useT } from "@/i18n/locale-provider";
import type { TranslateFn } from "@/i18n/translate";
import type { SavedCompany } from "@/types/user-company";

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function regimeName(id: PjRegimeId, t: TranslateFn, companyLabel?: string): string {
  switch (id) {
    case "mei":
      return "MEI";
    case "simples_iii":
      return t("calculator.pages.taxes.simplesIII");
    case "simples_v":
      return t("calculator.pages.taxes.simplesV");
    case "lucro_presumido":
      return t("calculator.pages.taxes.lucroPresumido");
    case "manual":
      return companyLabel
        ? `${companyLabel} (${t("calculator.pages.taxes.manualName")})`
        : t("calculator.pages.taxes.manualName");
    default:
      return id;
  }
}

function regimeStatus(
  regime: PjRegimeResult,
  proLabore: number,
  t: TranslateFn,
): string | null {
  if (regime.id === "mei") {
    return regime.applicable
      ? "MEI"
      : t("calculator.pages.taxes.meiOverLimit");
  }
  if (regime.id === "simples_iii") {
    if (proLabore <= 0) return t("calculator.pages.taxes.fatorRUnknown");
    return regime.fatorRMet
      ? t("calculator.pages.taxes.fatorROk")
      : t("calculator.pages.taxes.fatorRLow");
  }
  if (regime.id === "simples_v") return t("calculator.pages.taxes.fatorRLow");
  if (regime.id === "manual" && regime.applicable) {
    return t("calculator.pages.taxes.badgeManualConfigured", {
      rate: (regime.effectiveRate * 100).toFixed(1),
    });
  }
  return null;
}

function breakdownLabel(line: TaxLineItem, t: TranslateFn): string {
  const key = `calculator.pages.taxes.${line.labelKey}` as Parameters<TranslateFn>[0];
  return t(key, line.labelParams as Record<string, string | number> | undefined);
}

function pjCompanyTax(regime: PjRegimeResult): number {
  return regime.breakdown
    .filter((line) => line.id !== "inss" && line.id !== "irrf")
    .reduce((sum, line) => sum + line.amount, 0);
}

function companyRegimeDefault(company: SavedCompany): { rateHint: number | null } {
  if (company.taxRegime === "manual") return { rateHint: company.taxRate };
  return { rateHint: null };
}

function isCompanyRegime(company: SavedCompany | null, regimeId: PjRegimeId): boolean {
  if (!company) return false;
  if (company.taxRegime === "simples" && (regimeId === "simples_iii" || regimeId === "simples_v")) {
    return true;
  }
  if (company.taxRegime === "presumido" && regimeId === "lucro_presumido") return true;
  if (company.taxRegime === "manual" && regimeId === "manual") return true;
  return false;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
      {children}
    </h2>
  );
}

function TaxRow({
  label,
  value,
  valueClassName,
  emphasize,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 text-xs",
        emphasize && "border-t border-zinc-100 pt-2 dark:border-zinc-800",
      )}
    >
      <span className="text-zinc-500">{label}</span>
      <span className={cn("shrink-0 tabular-nums font-medium text-zinc-800 dark:text-zinc-200", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

export function TaxCalculator() {
  const t = useT();
  const { companies, loading: loadingCompanies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(MANUAL_COMPANY_ID);
  const [monthlyRevenue, setMonthlyRevenue] = useState("10000");
  const [prolabore, setProlabore] = useState("");
  const [manualRate, setManualRate] = useState("");
  const [dependents, setDependents] = useState("0");
  const didAutoSelectCompany = useRef(false);

  const selectedCompany =
    selectedCompanyId === MANUAL_COMPANY_ID
      ? null
      : (companies.find((c) => c.id === selectedCompanyId) ?? null);

  useEffect(() => {
    if (loadingCompanies || didAutoSelectCompany.current || companies.length === 0) return;
    const defaultCompany = companies.find((c) => c.isDefault) ?? companies[0];
    if (defaultCompany) {
      setSelectedCompanyId(defaultCompany.id);
      didAutoSelectCompany.current = true;
    }
  }, [companies, loadingCompanies]);

  useEffect(() => {
    if (selectedCompany) {
      const { rateHint } = companyRegimeDefault(selectedCompany);
      if (rateHint !== null) setManualRate(String(rateHint));
    }
  }, [selectedCompany]);

  const monthly = Math.max(0, Number(monthlyRevenue) || 0);
  const prolaboreValue = prolabore === "" ? 0 : Math.max(0, Number(prolabore) || 0);
  const manualRateValue = Math.max(0, Number(manualRate) || 0);
  const dependentsValue = Math.max(0, Math.floor(Number(dependents) || 0));

  const comparison = useMemo(
    () =>
      comparePjRegimesBr({
        monthlyRevenue: monthly,
        proLaboreMonthly: prolaboreValue,
        manualRatePercent: manualRateValue,
        includeManual: manualRateValue > 0,
      }),
    [monthly, prolaboreValue, manualRateValue],
  );

  const best = comparison.regimes.find((regime) => regime.id === comparison.bestRegimeId) ?? null;

  const cltReference = useMemo(() => {
    const gross = prolaboreValue > 0 ? prolaboreValue : monthly;
    if (gross <= 0) return null;
    return calculateCltBr({ grossSalary: gross, dependents: dependentsValue });
  }, [prolaboreValue, monthly, dependentsValue]);

  const profitDistribution = useMemo(() => {
    if (!best || monthly <= 0) return 0;
    return Math.max(0, monthly - pjCompanyTax(best) - prolaboreValue);
  }, [best, monthly, prolaboreValue]);

  const totalTakeHome = useMemo(() => {
    if (!best) return 0;
    return comparison.proLaboreNet + profitDistribution;
  }, [best, comparison.proLaboreNet, profitDistribution]);

  const annualIrrfWithheld = comparison.proLaboreIrrf * 12;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("calculator.pages.taxes.inputsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{t("calculator.pages.taxes.companyLabel")}</Label>
              <CompanyPicker
                companies={companies}
                loading={loadingCompanies}
                valueId={selectedCompanyId}
                onSelect={(company) => setSelectedCompanyId(company?.id ?? MANUAL_COMPANY_ID)}
              />
              {selectedCompany ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="default">
                    {selectedCompany.taxRegime === "simples"
                      ? t("calculator.pages.taxes.regimeSimples")
                      : selectedCompany.taxRegime === "presumido"
                        ? t("calculator.pages.taxes.regimePresumido")
                        : t("calculator.pages.taxes.regimeManual")}
                  </Badge>
                  {selectedCompany.activityDescription ? (
                    <span className="text-xs text-zinc-500">
                      {selectedCompany.activityCode} · {selectedCompany.activityDescription}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label>{t("calculator.pages.taxes.revenueLabel")}</Label>
              <NumberInput
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(e.target.value)}
                placeholder="10.000"
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                {t("calculator.pages.taxes.prolaboreLabel")}{" "}
                <span className="font-normal text-zinc-400">
                  {t("calculator.pages.taxes.prolaboreOptional")}
                </span>
              </Label>
              <NumberInput
                value={prolabore}
                onChange={(e) => setProlabore(e.target.value)}
                placeholder={t("calculator.pages.taxes.prolaborePlaceholder", {
                  amount: formatMoney(comparison.minProLaboreForFatorR, { currency: "BRL" }),
                })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("calculator.pages.taxes.manualRateLabel")}</Label>
              <NumberInput
                value={manualRate}
                onChange={(e) => setManualRate(e.target.value)}
                placeholder={t("calculator.pages.taxes.manualRatePlaceholder")}
              />
              <p className="text-xs text-zinc-500">{t("calculator.pages.taxes.manualRateHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t("calculator.pages.taxes.dependentsLabel")}</Label>
              <NumberInput
                value={dependents}
                onChange={(e) => setDependents(e.target.value)}
                placeholder="0"
              />
              <p className="text-xs text-zinc-500">{t("calculator.pages.taxes.dependentsHint")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {monthly > 0 && best ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("calculator.pages.taxes.pjCompanyTaxLabel")}
              value={best.monthlyTax}
              currency="BRL"
              valueTone="expense"
            />
            <StatCard
              label={t("calculator.pages.taxes.netPerMonth")}
              value={best.netMonthly}
              currency="BRL"
              valueTone="income"
            />
            <div className="border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 rounded-xl">
              <p className="text-xs font-medium text-zinc-500">{t("calculator.pages.taxes.effectiveRate")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {pct(best.effectiveRate)}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {regimeName(best.id, t, selectedCompany?.label)}
              </p>
            </div>
            {comparison.insight.savingsVsWorst > 0 ? (
              <StatCard
                label={t("calculator.pages.taxes.savingsLabel")}
                value={comparison.insight.savingsVsWorst}
                currency="BRL"
                valueTone="income"
              />
            ) : (
              <StatCard
                label={t("calculator.pages.taxes.annualRevenueShort")}
                value={comparison.annualRevenue}
                currency="BRL"
              />
            )}
          </div>

          <Alert variant="success" title={t("calculator.pages.taxes.insightTitle")}>
            <p>
              {t("calculator.pages.taxes.insightSummary", {
                revenue: formatMoney(monthly, { currency: "BRL" }),
                regime: regimeName(best.id, t, selectedCompany?.label),
                tax: formatMoney(best.monthlyTax, { currency: "BRL" }),
                rate: pct(best.effectiveRate),
              })}
            </p>
          </Alert>

          {comparison.fatorROptimization && comparison.fatorROptimization.savingsMonthly > 0 ? (
            <Alert variant="warning" title={t("calculator.pages.taxes.fatorROptimizationTitle")}>
              <p>
                {t("calculator.pages.taxes.fatorROptimizationBody", {
                  current: formatMoney(prolaboreValue, { currency: "BRL" }),
                  fatorR: (comparison.fatorR * 100).toFixed(1),
                  min: formatMoney(comparison.fatorROptimization.minProLabore, { currency: "BRL" }),
                  rateV: comparison.fatorROptimization.rateAnnexV,
                  rateIII: comparison.fatorROptimization.rateAnnexIII,
                  savings: formatMoney(comparison.fatorROptimization.savingsMonthly, {
                    currency: "BRL",
                  }),
                })}
              </p>
            </Alert>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-3">
              <SectionTitle>{t("calculator.pages.taxes.regimesTitle")}</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2">
                {comparison.regimes.map((regime) => {
                  const status = regimeStatus(regime, prolaboreValue, t);
                  const isBest = regime.id === comparison.bestRegimeId && regime.applicable;
                  const isCurrent = isCompanyRegime(selectedCompany, regime.id) && regime.applicable;
                  const isDisabled = !regime.applicable;

                  return (
                    <Card
                      key={regime.id}
                      className={cn(
                        isBest && "border-emerald-500/60 dark:border-emerald-700/60",
                        !isBest && isCurrent && "border-sky-400/60 dark:border-sky-600/60",
                        isDisabled && "opacity-60",
                      )}
                    >
                      <CardHeader className="space-y-1 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm leading-snug">
                            {regimeName(regime.id, t, selectedCompany?.label)}
                          </CardTitle>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            {isBest ? (
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                {t("calculator.pages.taxes.lowestTax")}
                              </span>
                            ) : null}
                            {isCurrent ? (
                              <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400">
                                {t("calculator.pages.taxes.currentRegime")}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {status ? (
                          <p className="text-xs text-zinc-500">{status}</p>
                        ) : null}
                      </CardHeader>

                      <CardContent className="space-y-2 pt-0">
                        {regime.warningKey ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            {t(
                              `calculator.pages.taxes.${regime.warningKey}Warning` as Parameters<
                                TranslateFn
                              >[0],
                              {
                                annual: formatMoney(
                                  (regime.warningParams?.annual as number) ?? 0,
                                  { currency: "BRL" },
                                ),
                              },
                            )}
                          </p>
                        ) : (
                          <>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs text-zinc-500">
                                {t("calculator.pages.taxes.taxPerMonth")}
                              </span>
                              <Money
                                value={regime.monthlyTax}
                                currency="BRL"
                                size="md"
                                tone="expense"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/50">
                              <div>
                                <p className="text-[11px] text-zinc-500">
                                  {t("calculator.pages.taxes.effectiveRate")}
                                </p>
                                <p className="text-sm font-medium tabular-nums">
                                  {pct(regime.effectiveRate)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] text-zinc-500">
                                  {t("calculator.pages.taxes.netPerMonth")}
                                </p>
                                <Money value={regime.netMonthly} currency="BRL" size="sm" />
                              </div>
                            </div>

                            {regime.breakdown.length > 0 ? (
                              <div className="space-y-1 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                                {regime.breakdown.map((line) => (
                                  <TaxRow
                                    key={line.id}
                                    label={breakdownLabel(line, t)}
                                    value={formatMoney(line.amount, { currency: "BRL" })}
                                  />
                                ))}
                              </div>
                            ) : null}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 lg:col-span-2">
              <SectionTitle>{t("calculator.pages.taxes.pfTitle")}</SectionTitle>
              <p className="text-xs text-zinc-500">{t("calculator.pages.taxes.pfSubtitle")}</p>

              <Card>
                <CardContent className="space-y-3 pt-4">
                  {prolaboreValue > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {t("calculator.pages.taxes.prolaboreSection")}
                      </p>
                      <TaxRow
                        label={t("calculator.pages.taxes.prolaboreGross")}
                        value={formatMoney(prolaboreValue, { currency: "BRL" })}
                      />
                      <TaxRow
                        label={t("calculator.pages.taxes.prolaboreInss")}
                        value={formatMoney(comparison.proLaboreInss, { currency: "BRL" })}
                        valueClassName="text-red-600 dark:text-red-400"
                      />
                      <TaxRow
                        label={t("calculator.pages.taxes.prolaboreIrrf")}
                        value={formatMoney(comparison.proLaboreIrrf, { currency: "BRL" })}
                        valueClassName="text-red-600 dark:text-red-400"
                      />
                      <TaxRow
                        label={t("calculator.pages.taxes.prolaboreNetLabel")}
                        value={formatMoney(comparison.proLaboreNet, { currency: "BRL" })}
                        valueClassName="text-emerald-600 dark:text-emerald-400"
                        emphasize
                      />
                      {prolaboreValue > 0 ? (
                        <p className="text-xs text-zinc-500">
                          {t("calculator.pages.taxes.fatorRLabel")}{" "}
                          <span
                            className={cn(
                              "font-medium",
                              comparison.fatorR >= 0.28
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            {(comparison.fatorR * 100).toFixed(1)}%
                          </span>
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500">
                      {t("calculator.pages.taxes.prolaboreEmptyHint")}
                    </p>
                  )}

                  <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t("calculator.pages.taxes.profitDistribution")}
                    </p>
                    <TaxRow
                      label={t("calculator.pages.taxes.profitDistributionAmount")}
                      value={formatMoney(profitDistribution, { currency: "BRL" })}
                      valueClassName="text-emerald-600 dark:text-emerald-400"
                    />
                    <p className="text-xs text-zinc-500">
                      {t("calculator.pages.taxes.profitDistributionHint")}
                    </p>
                  </div>

                  <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {t("calculator.pages.taxes.annualIrTitle")}
                    </p>
                    <TaxRow
                      label={t("calculator.pages.taxes.annualIrWithheld")}
                      value={formatMoney(annualIrrfWithheld, { currency: "BRL" })}
                      valueClassName="text-red-600 dark:text-red-400"
                    />
                    <p className="text-xs text-zinc-500">
                      {t("calculator.pages.taxes.annualIrHint")}
                    </p>
                  </div>

                  {cltReference ? (
                    <div className="space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                      <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {t("calculator.pages.taxes.cltCompareTitle")}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {t("calculator.pages.taxes.cltCompareHint", {
                          amount: formatMoney(cltReference.gross, { currency: "BRL" }),
                        })}
                      </p>
                      <TaxRow
                        label={t("calculator.pages.taxes.cltInss")}
                        value={formatMoney(
                          cltReference.deductions.find((d) => d.id === "inss")?.amount ?? 0,
                          { currency: "BRL" },
                        )}
                      />
                      <TaxRow
                        label={t("calculator.pages.taxes.cltIrrf")}
                        value={formatMoney(
                          cltReference.deductions.find((d) => d.id === "irrf")?.amount ?? 0,
                          { currency: "BRL" },
                        )}
                      />
                      <TaxRow
                        label={t("calculator.pages.taxes.cltNet")}
                        value={formatMoney(cltReference.net, { currency: "BRL" })}
                        emphasize
                      />
                      <p className="text-xs text-zinc-500">
                        {t("calculator.pages.taxes.cltFgtsNote")}
                      </p>
                    </div>
                  ) : null}

                  <div className="space-y-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <TaxRow
                      label={t("calculator.pages.taxes.totalTakeHome")}
                      value={formatMoney(totalTakeHome, { currency: "BRL" })}
                      valueClassName="text-emerald-600 dark:text-emerald-400"
                      emphasize
                    />
                    <p className="text-xs text-zinc-500">
                      {t("calculator.pages.taxes.totalTakeHomeHint", {
                        regime: regimeName(best.id, t, selectedCompany?.label),
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <p className="py-8 text-center text-sm text-zinc-500">
          {t("calculator.pages.taxes.enterRevenue")}
        </p>
      )}

      <Accordion type="single">
        <AccordionItem value="help" title={t("calculator.pages.taxes.fatorRInfoTitle")}>
          <ul className="space-y-2 text-xs">
            <li>{t("calculator.pages.taxes.helpItem1")}</li>
            <li>{t("calculator.pages.taxes.helpItem2")}</li>
            <li>{t("calculator.pages.taxes.helpItem3")}</li>
            <li>{t("calculator.pages.taxes.helpItem4")}</li>
            <li>{t("calculator.pages.taxes.helpItem5")}</li>
          </ul>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

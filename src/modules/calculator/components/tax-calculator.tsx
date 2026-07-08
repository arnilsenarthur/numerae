"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyPicker, MANUAL_COMPANY_ID } from "@/components/ui/company-picker";
import { Money } from "@/components/ui/money";
import { formatMoney } from "@/lib/format-money";
import { useCompanies } from "@/modules/calculator/hooks/use-companies";
import type { SavedCompany } from "@/types/user-company";

// ---- Simples Nacional Anexo III ---- (Fator R >= 28%)
type SimplesRange = { maxRevenue: number; nominalRate: number; deduction: number };

const SIMPLES_III: SimplesRange[] = [
  { maxRevenue: 180000, nominalRate: 0.06, deduction: 0 },
  { maxRevenue: 360000, nominalRate: 0.112, deduction: 9360 },
  { maxRevenue: 720000, nominalRate: 0.135, deduction: 17640 },
  { maxRevenue: 1800000, nominalRate: 0.16, deduction: 35640 },
  { maxRevenue: 3600000, nominalRate: 0.21, deduction: 125640 },
  { maxRevenue: 4800000, nominalRate: 0.33, deduction: 648000 },
];

// ---- Simples Nacional Anexo V ---- (Fator R < 28%)
const SIMPLES_V: SimplesRange[] = [
  { maxRevenue: 180000, nominalRate: 0.155, deduction: 0 },
  { maxRevenue: 360000, nominalRate: 0.18, deduction: 4500 },
  { maxRevenue: 720000, nominalRate: 0.195, deduction: 9900 },
  { maxRevenue: 1800000, nominalRate: 0.205, deduction: 17100 },
  { maxRevenue: 3600000, nominalRate: 0.23, deduction: 62100 },
  { maxRevenue: 4800000, nominalRate: 0.305, deduction: 540000 },
];

function calcSimples(annual: number, table: SimplesRange[]): number {
  if (annual <= 0) return 0;
  const range = table.find((r) => annual <= r.maxRevenue);
  if (!range) return annual * 0.33;
  return Math.max(0, annual * range.nominalRate - range.deduction);
}

function effectiveRate(annual: number, table: SimplesRange[]): number {
  if (annual <= 0) return 0;
  return calcSimples(annual, table) / annual;
}

// INSS on pro-labore: 11% (socio/administrador), max teto 2025
const INSS_RATE = 0.11;
const INSS_TETO = 7786.02; // salário-de-contribuição máximo
const INSS_MAX = INSS_TETO * INSS_RATE; // ~856.46

// IRPF progressive table on pro-labore (2025 tabela mensal)
const IRPF_TABLE = [
  { max: 2259.2, rate: 0, deduction: 0 },
  { max: 2826.65, rate: 0.075, deduction: 169.44 },
  { max: 3751.05, rate: 0.15, deduction: 381.44 },
  { max: 4664.68, rate: 0.225, deduction: 662.77 },
  { max: Infinity, rate: 0.275, deduction: 896 },
];

function calcInss(prolabore: number): number {
  return Math.min(prolabore * INSS_RATE, INSS_MAX);
}

function calcIrrf(prolabore: number): number {
  const base = prolabore - calcInss(prolabore);
  const bracket = IRPF_TABLE.find((b) => base <= b.max);
  if (!bracket) return 0;
  return Math.max(0, base * bracket.rate - bracket.deduction);
}

// MEI: fixed monthly DAS for services
const MEI_DAS = 75.9;
const MEI_ANNUAL_LIMIT = 81000;

// Lucro Presumido (services - 32% presumption)
function calcLucroPresumido(annual: number): number {
  const presumed = annual * 0.32;
  const irpj = presumed * 0.15 + Math.max(0, presumed - 240000) * 0.1;
  const csll = presumed * 0.09;
  const pis = annual * 0.0065;
  const cofins = annual * 0.03;
  const iss = annual * 0.05;
  return irpj + csll + pis + cofins + iss;
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

type Result = {
  id: string;
  name: string;
  badge: string;
  badgeVariant: "success" | "default" | "warning" | "error";
  annualTax: number;
  monthlyTax: number;
  netMonthly: number;
  effectiveRate: number;
  notes: string[];
  highlight?: string;
  warning?: string;
};

/** Map company taxRegime to calculator regime IDs */
function companyRegimeDefault(company: SavedCompany): { regimeHint: string; rateHint: number | null } {
  if (company.taxRegime === "simples") return { regimeHint: "simples_iii", rateHint: null };
  if (company.taxRegime === "presumido") return { regimeHint: "lucro_presumido", rateHint: null };
  if (company.taxRegime === "manual") return { regimeHint: "manual", rateHint: company.taxRate };
  return { regimeHint: "simples_iii", rateHint: null };
}

export function TaxCalculator() {
  const { companies, loading: loadingCompanies } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(MANUAL_COMPANY_ID);
  const [monthlyRevenue, setMonthlyRevenue] = useState("10000");
  const [prolabore, setProlabore] = useState("");
  const [manualRate, setManualRate] = useState(""); // for manual regime
  const didAutoSelectCompany = useRef(false);

  // Derived: apply company data when selection changes
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

  useEffect(() => {
    if (selectedCompany) {
      const { rateHint } = companyRegimeDefault(selectedCompany);
      if (rateHint !== null) setManualRate(String(rateHint));
    }
  }, [selectedCompany]);

  const monthly = Math.max(0, Number(monthlyRevenue) || 0);
  const annual = monthly * 12;

  // Fator R (uses prolabore input or derives minimum for Anexo III)
  const prolaboreValue = prolabore === "" ? 0 : Math.max(0, Number(prolabore) || 0);
  const fatorR = annual > 0 ? (prolaboreValue * 12) / annual : 0;
  const minProlaboreIII = annual > 0 ? (annual * 0.28) / 12 : 0; // minimum for Fator R >= 28%

  const inss = calcInss(prolaboreValue);
  const irrf = calcIrrf(prolaboreValue);
  const netProlabore = prolaboreValue - inss - irrf;

  const results = useMemo((): Result[] => {
    if (annual <= 0) return [];

    const list: Result[] = [];

    // --- MEI ---
    if (annual <= MEI_ANNUAL_LIMIT) {
      list.push({
        id: "mei",
        name: "MEI",
        badge: "Simples",
        badgeVariant: "success",
        annualTax: MEI_DAS * 12,
        monthlyTax: MEI_DAS,
        netMonthly: monthly - MEI_DAS,
        effectiveRate: (MEI_DAS * 12) / annual,
        notes: [
          "DAS fixo: R$ 75,90/mês (INSS + ISS)",
          "Isento de IR sobre distribuição de lucros",
          "Proibido ter sócio ou ser sócio de outra empresa",
        ],
      });
    } else {
      list.push({
        id: "mei",
        name: "MEI",
        badge: "Fora do limite",
        badgeVariant: "error",
        annualTax: 0,
        monthlyTax: 0,
        netMonthly: monthly,
        effectiveRate: 0,
        notes: [],
        warning: `Faturamento de ${formatMoney(annual, { currency: "BRL" })}/ano excede o limite de R$ 81.000.`,
      });
    }

    // --- Simples Anexo III (Fator R >= 28%) ---
    const simplesIIITax = calcSimples(annual, SIMPLES_III);
    const rateIII = effectiveRate(annual, SIMPLES_III);
    const useIII = fatorR >= 0.28 || prolaboreValue === 0;
    const proLaboreInssCost = inss; // monthly INSS employer + sócio portion already in `inss`
    const simplesTotalMonthly =
      simplesIIITax / 12 + (prolaboreValue > 0 ? proLaboreInssCost : 0);

    list.push({
      id: "simples_iii",
      name: "Simples — Anexo III",
      badge: fatorR >= 0.28 ? "Fator R ≥ 28% ✓" : prolaboreValue > 0 ? "Fator R < 28% ✗" : "Fator R não calculado",
      badgeVariant: fatorR >= 0.28 ? "success" : prolaboreValue > 0 ? "error" : "default",
      annualTax: simplesIIITax + (prolaboreValue > 0 ? inss * 12 : 0),
      monthlyTax: simplesIIITax / 12 + (prolaboreValue > 0 ? inss : 0),
      netMonthly: monthly - simplesIIITax / 12 - (prolaboreValue > 0 ? inss : 0),
      effectiveRate: (simplesIIITax + (prolaboreValue > 0 ? inss * 12 : 0)) / annual,
      notes: [
        `Alíquota Simples: ${pct(rateIII)} efetiva sobre a receita`,
        prolaboreValue > 0
          ? `Pró-labore ${formatMoney(prolaboreValue, { currency: "BRL" })} → INSS ${formatMoney(inss, { currency: "BRL" })}/mês`
          : `Defina o pró-labore para calcular INSS`,
        prolaboreValue > 0
          ? `Fator R = ${(fatorR * 100).toFixed(1)}% (precisa ≥ 28%${fatorR < 0.28 ? ` — mínimo: ${formatMoney(minProlaboreIII, { currency: "BRL" })}/mês` : ""})`
          : `Mínimo pró-labore para Fator R 28%: ${formatMoney(minProlaboreIII, { currency: "BRL" })}/mês`,
      ],
      highlight: useIII && prolaboreValue > 0 ? `Pró-labore líquido: ${formatMoney(netProlabore, { currency: "BRL" })}/mês (após INSS + IRRF)` : undefined,
    });

    // --- Simples Anexo V (Fator R < 28%) ---
    const simplesVTax = calcSimples(annual, SIMPLES_V);
    const rateV = effectiveRate(annual, SIMPLES_V);
    list.push({
      id: "simples_v",
      name: "Simples — Anexo V",
      badge: "Fator R < 28%",
      badgeVariant: "warning",
      annualTax: simplesVTax,
      monthlyTax: simplesVTax / 12,
      netMonthly: monthly - simplesVTax / 12,
      effectiveRate: rateV,
      notes: [
        `Alíquota ${pct(rateV)} efetiva — muito mais alto que Anexo III`,
        `Diferença mensal vs. Anexo III: ${formatMoney(Math.abs(simplesVTax - simplesIIITax) / 12, { currency: "BRL" })} a mais`,
        `Acontece quando pró-labore < ${formatMoney(minProlaboreIII, { currency: "BRL" })}/mês`,
      ],
      warning:
        prolaboreValue > 0 && fatorR < 0.28
          ? `Seu pró-labore atual leva ao Anexo V. Aumente para ${formatMoney(minProlaboreIII, { currency: "BRL" })}/mês para usar o Anexo III.`
          : undefined,
    });

    // --- Lucro Presumido ---
    const lpTax = calcLucroPresumido(annual);
    const lpRate = lpTax / annual;
    list.push({
      id: "lp",
      name: "Lucro Presumido",
      badge: "Regime Real",
      badgeVariant: "warning",
      annualTax: lpTax,
      monthlyTax: lpTax / 12,
      netMonthly: monthly - lpTax / 12,
      effectiveRate: lpRate,
      notes: [
        "IRPJ 15% s/ 32% + CSLL 9% s/ 32% + PIS 0,65% + COFINS 3% + ISS 5%",
        "Distribuição de lucros isenta de IR (grande vantagem)",
        prolaboreValue > 0
          ? `Pró-labore ${formatMoney(prolaboreValue, { currency: "BRL" })} → INSS ${formatMoney(inss, { currency: "BRL" })} + IRRF ${formatMoney(irrf, { currency: "BRL" })}`
          : "Recomenda-se pagar pró-labore mínimo (previdência)",
        "Vantajoso acima de ~R$ 30k/mês vs. Simples V",
      ],
    });

    // Manual rate (company-specific or custom)
    const manualRateValue = Math.max(0, Number(manualRate) || 0) / 100;
    if (manualRateValue > 0) {
      const manualTaxMonthly = monthly * manualRateValue;
      list.push({
        id: "manual",
        name: selectedCompany?.label ? `${selectedCompany.label} (manual)` : "Alíquota manual",
        badge: `${(manualRateValue * 100).toFixed(1)}% configurado`,
        badgeVariant: "default",
        annualTax: manualTaxMonthly * 12,
        monthlyTax: manualTaxMonthly,
        netMonthly: monthly - manualTaxMonthly,
        effectiveRate: manualRateValue,
        notes: [
          "Alíquota configurada manualmente na empresa.",
          "Use para regimes não cobertos ou taxas negociadas.",
        ],
        highlight: selectedCompany?.activityDescription
          ? `Atividade: ${selectedCompany.activityDescription}`
          : undefined,
      });
    }

    // Sort: exclude disabled MEI, show by effective rate asc
    return list.sort((a, b) => {
      if (a.id === "mei" && a.warning) return 1;
      if (b.id === "mei" && b.warning) return -1;
      if (a.id === "simples_v" && b.id === "simples_iii") return 1;
      if (a.id === "simples_iii" && b.id === "simples_v") return -1;
      return a.effectiveRate - b.effectiveRate;
    });
  }, [annual, monthly, prolaboreValue, fatorR, inss, irrf, netProlabore, minProlaboreIII, manualRate, selectedCompany]);

  const best = results.find((r) => !r.warning && r.effectiveRate > 0);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          {/* Company picker */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-80">
              <CompanyPicker
                companies={companies}
                loading={loadingCompanies}
                valueId={selectedCompanyId}
                onSelect={(company) =>
                  setSelectedCompanyId(company?.id ?? MANUAL_COMPANY_ID)
                }
              />
            </div>
            {selectedCompany && (
              <div className="pb-1 space-y-0.5">
                <Badge variant="default">{selectedCompany.taxRegime === "simples" ? "Simples Nacional" : selectedCompany.taxRegime === "presumido" ? "Lucro Presumido" : "Alíquota manual"}</Badge>
                {selectedCompany.activityDescription && (
                  <p className="text-xs text-zinc-500">{selectedCompany.activityCode} · {selectedCompany.activityDescription}</p>
                )}
                <p className="text-xs text-zinc-400">{selectedCompany.registrationKind}: {selectedCompany.registrationId}</p>
              </div>
            )}
            {isManualCompany && (
              <div className="space-y-1">
                <Label>Alíquota manual (%)</Label>
                <div className="w-28">
                  <NumberInput
                    value={manualRate}
                    onChange={(e) => setManualRate(e.target.value)}
                    placeholder="Ex.: 15"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-1">
              <Label>Faturamento mensal bruto (R$)</Label>
              <div className="w-44">
                <NumberInput
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(e.target.value)}
                  placeholder="10.000"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Pró-labore mensal (R$) <span className="text-zinc-400">— opcional</span></Label>
              <div className="w-44">
                <NumberInput
                  value={prolabore}
                  onChange={(e) => setProlabore(e.target.value)}
                  placeholder={`Mín. ${formatMoney(minProlaboreIII, { currency: "BRL" })} p/ Anexo III`}
                />
              </div>
            </div>
            {monthly > 0 && (
              <div className="space-y-1 pb-1">
                <p className="text-xs text-zinc-500">
                  Receita anual: <strong>{formatMoney(annual, { currency: "BRL" })}</strong>
                </p>
                {prolaboreValue > 0 && (
                  <>
                    <p className="text-xs text-zinc-500">
                      Fator R:{" "}
                      <strong className={fatorR >= 0.28 ? "text-emerald-600" : "text-amber-600"}>
                        {(fatorR * 100).toFixed(1)}%
                      </strong>{" "}
                      {fatorR >= 0.28 ? "→ Anexo III ✓" : `→ Anexo V (mín. ${formatMoney(minProlaboreIII, { currency: "BRL" })}/mês)`}
                    </p>
                    <p className="text-xs text-zinc-500">
                      INSS pró-labore:{" "}
                      <strong>{formatMoney(inss, { currency: "BRL" })}/mês</strong>
                      {" · "}IRRF: <strong>{formatMoney(irrf, { currency: "BRL" })}/mês</strong>
                      {" · "}Líquido: <strong className="text-emerald-600">{formatMoney(netProlabore, { currency: "BRL" })}/mês</strong>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fator R tip */}
      {monthly > 0 && prolaboreValue > 0 && fatorR < 0.28 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            💡 Otimização disponível — Fator R
          </p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
            Seu pró-labore atual de <strong>{formatMoney(prolaboreValue, { currency: "BRL" })}/mês</strong> gera
            Fator R de {(fatorR * 100).toFixed(1)}%. Aumentar para{" "}
            <strong>{formatMoney(minProlaboreIII, { currency: "BRL" })}/mês</strong> muda do Anexo V
            ({pct(effectiveRate(annual, SIMPLES_V))} efetivo) para o Anexo III
            ({pct(effectiveRate(annual, SIMPLES_III))} efetivo) — uma economia mensal de{" "}
            <strong>
              {formatMoney(
                (calcSimples(annual, SIMPLES_V) - calcSimples(annual, SIMPLES_III)) / 12 -
                  (minProlaboreIII - prolaboreValue) * INSS_RATE,
                { currency: "BRL" },
              )}
            </strong>.
          </p>
        </div>
      )}

      {/* Regime cards */}
      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {results.map((regime, i) => {
            const isBest = regime.id === best?.id;
            const isDisabled = !!regime.warning && regime.id === "mei";
            const isCompanyRegime = selectedCompany && (
              (selectedCompany.taxRegime === "simples" && (regime.id === "simples_iii" || regime.id === "simples_v")) ||
              (selectedCompany.taxRegime === "presumido" && regime.id === "lp") ||
              (selectedCompany.taxRegime === "manual" && regime.id === "manual")
            );
            return (
              <Card
                key={regime.id}
                className={[
                  isBest && !isDisabled ? "border-emerald-500/50 dark:border-emerald-700/60" : isCompanyRegime && !isDisabled ? "border-sky-400/50 dark:border-sky-600/50" : "",
                  isDisabled ? "opacity-60" : "",
                ].join(" ")}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-1.5">
                        {!isDisabled && (
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isBest ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"}`}>
                            {i + 1}
                          </span>
                        )}
                        <CardTitle className="text-sm">{regime.name}</CardTitle>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <Badge variant={regime.badgeVariant} className="text-[10px]">{regime.badge}</Badge>
                      {isBest && !isDisabled && <Badge variant="success" className="text-[10px]">Menor imposto</Badge>}
                      {isCompanyRegime && !isDisabled && <Badge variant="default" className="text-[10px]">Regime atual</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {regime.warning ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400">{regime.warning}</p>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Imposto/mês</span>
                          <span className="font-medium text-red-600">
                            {formatMoney(regime.monthlyTax, { currency: "BRL" })}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-zinc-500">Alíquota efetiva</span>
                          <span className="font-medium">{pct(regime.effectiveRate)}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-100 pt-1 text-sm dark:border-zinc-800">
                          <span className="text-zinc-600">Líquido/mês</span>
                          <Money value={regime.netMonthly} currency="BRL" />
                        </div>
                      </div>

                      {/* Rate bar */}
                      <div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className={`h-1.5 rounded-full ${isBest ? "bg-emerald-500" : "bg-zinc-400"}`}
                            style={{ width: `${Math.min(100, regime.effectiveRate * 100 * 3)}%` }}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      {regime.notes.length > 0 && (
                        <ul className="space-y-0.5">
                          {regime.notes.map((note) => (
                            <li key={note} className="text-[10px] text-zinc-500">
                              · {note}
                            </li>
                          ))}
                        </ul>
                      )}
                      {regime.highlight && (
                        <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          ✓ {regime.highlight}
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-zinc-500">Informe o faturamento para comparar os regimes.</p>
      )}

      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Sobre o Fator R e pró-labore</p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-500">
            <li>
              • <strong>Fator R</strong> = folha de salários (pró-labore + funcionários) dos últimos 12 meses ÷ receita bruta dos últimos 12 meses.
            </li>
            <li>
              • Fator R <strong>≥ 28%</strong> → Simples Anexo III (muito mais baixo). Fator R &lt; 28% → Anexo V (mais alto).
            </li>
            <li>
              • INSS sobre pró-labore: <strong>11%</strong> (parte do sócio) — teto R$ 7.786,02 → máx. R$ 856,46/mês.
            </li>
            <li>
              • O pró-labore extra que você paga gera custo de INSS (11%), mas pode economizar bem mais no Simples.
            </li>
            <li>
              • <strong>Lucro Presumido:</strong> distribuição de lucros é isenta de IR — ideal para quem fatura muito.
            </li>
            <li>• Valores aproximados. Consulte um contador antes de abrir empresa ou mudar de regime.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

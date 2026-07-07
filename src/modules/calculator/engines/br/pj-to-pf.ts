import { calculateCltBr } from "@/modules/calculator/engines/br/clt";
import {
  calculateFatorR,
  minProLaboreForFatorR,
  resolveSimplesRateWithFatorR,
  FATOR_R_THRESHOLD,
} from "@/modules/calculator/engines/br/fator-r";
import type { SalaryCalculationResult } from "@/modules/calculator/types";

export type PjToPfMode = "full" | "distribution";

export type PjToPfInput = {
  /** Receita bruta mensal (full) ou caixa pós-Simples upstream (distribution). */
  monthlyAmount: number;
  mode?: PjToPfMode;
  /** Se definido, ignora a otimização automática. */
  proLaboreOverride?: number | null;
  payrollMonthly?: number;
  payrollChargesPercent?: number;
  revenue12Months?: number;
  dependents?: number;
  taxRatePercent?: number;
  cnaeCode?: string;
};

export type PjToPfOptimization = {
  proLaboreGross: number;
  strategy: "fator-r" | "lucros-only" | "manual" | "distribution";
  strategyLabel: string;
  totalTaxBrl: number;
  taxWithoutOptimization?: number;
  taxSavingsBrl: number;
};

export type PjToPfResult = SalaryCalculationResult & {
  fatorR: number;
  fatorRMet: boolean;
  fatorRSavingsBrl: number;
  pjTaxBrl: number;
  pfTaxBrl: number;
  proLaboreGross: number;
  proLaboreNet: number;
  lucrosDistribuidos: number;
  effectivePjRate: number;
  annex: string;
  minProLaboreForFatorR: number;
  optimization: PjToPfOptimization;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

type TaxScenario = {
  proLaboreGross: number;
  pjTaxBrl: number;
  pfTaxBrl: number;
  totalTaxBrl: number;
  fatorR: number;
  fatorRMet: boolean;
  rate: number;
  annex: string;
};

function evaluateScenario(params: {
  grossMonthly: number;
  proLaboreGross: number;
  payrollMonthly: number;
  payrollChargesPercent: number;
  revenue12Months: number;
  dependents: number;
  cnaeCode?: string;
  taxRatePercent?: number;
  includePjTax: boolean;
  companyCash?: number;
}): TaxScenario {
  const fatorR = calculateFatorR({
    proLaboreMonthly: params.proLaboreGross,
    payrollMonthly: params.payrollMonthly,
    payrollChargesPercent: params.payrollChargesPercent,
    revenue12Months: params.revenue12Months,
  });

  const rateInfo = resolveSimplesRateWithFatorR({
    cnaeCode: params.cnaeCode,
    manualRate: params.taxRatePercent,
    fatorR,
  });

  let pjTaxBrl = 0;
  let companyCash = params.companyCash ?? params.grossMonthly;

  if (params.includePjTax) {
    pjTaxBrl = round(params.grossMonthly * (rateInfo.rate / 100));
    companyCash = params.grossMonthly - pjTaxBrl;
  }

  const proLaboreGross = round(Math.min(Math.max(0, params.proLaboreGross), companyCash));
  const pf = calculateCltBr({ grossSalary: proLaboreGross, dependents: params.dependents });
  const pfTaxBrl = pf.totalDeductions;

  return {
    proLaboreGross,
    pjTaxBrl,
    pfTaxBrl,
    totalTaxBrl: round(pjTaxBrl + pfTaxBrl),
    fatorR,
    fatorRMet: fatorR >= FATOR_R_THRESHOLD,
    rate: rateInfo.rate,
    annex: rateInfo.annex,
  };
}

/** Encontra o pró-labore que minimiza imposto PJ (Fator R) + imposto PF. */
export function optimizeProLaboreForMinTax(params: {
  grossMonthly: number;
  payrollMonthly?: number;
  payrollChargesPercent?: number;
  revenue12Months?: number;
  dependents?: number;
  cnaeCode?: string;
  taxRatePercent?: number;
  includePjTax?: boolean;
  companyCash?: number;
}): PjToPfOptimization & TaxScenario {
  const grossMonthly = Math.max(0, params.grossMonthly);
  const payrollMonthly = Math.max(0, params.payrollMonthly ?? 0);
  const payrollChargesPercent = params.payrollChargesPercent ?? 20;
  const dependents = params.dependents ?? 0;
  const includePjTax = params.includePjTax ?? true;
  const revenue12Months =
    params.revenue12Months && params.revenue12Months > 0
      ? params.revenue12Months
      : grossMonthly * 12;

  const base = {
    grossMonthly,
    payrollMonthly,
    payrollChargesPercent,
    revenue12Months,
    dependents,
    cnaeCode: params.cnaeCode,
    taxRatePercent: params.taxRatePercent,
    includePjTax,
    companyCash: params.companyCash,
  };

  if (!includePjTax) {
    const scenario = evaluateScenario({ ...base, proLaboreGross: 0 });
    return {
      ...scenario,
      strategy: "distribution",
      strategyLabel: "Só divisão de lucros (imposto PJ já pago)",
      totalTaxBrl: scenario.totalTaxBrl,
      taxSavingsBrl: 0,
    };
  }

  const rateWithout = resolveSimplesRateWithFatorR({
    cnaeCode: params.cnaeCode,
    manualRate: params.taxRatePercent,
    fatorR: 0,
  });
  const rateWith = resolveSimplesRateWithFatorR({
    cnaeCode: params.cnaeCode,
    manualRate: params.taxRatePercent,
    fatorR: 1,
  });

  const minForFatorR = minProLaboreForFatorR(
    revenue12Months,
    payrollMonthly,
    payrollChargesPercent,
  );

  const lucrosOnly = evaluateScenario({ ...base, proLaboreGross: 0 });

  const hasFatorRBenefit = rateWith.rate + 0.001 < rateWithout.rate;
  if (!hasFatorRBenefit) {
    return {
      ...lucrosOnly,
      strategy: "lucros-only",
      strategyLabel: "Só lucros — Fator R não altera anexo",
      totalTaxBrl: lucrosOnly.totalTaxBrl,
      taxWithoutOptimization: lucrosOnly.totalTaxBrl,
      taxSavingsBrl: 0,
    };
  }

  const pjTaxAtLowRate = round(grossMonthly * (rateWith.rate / 100));
  const maxProLaboreAffordable = grossMonthly - pjTaxAtLowRate;

  if (minForFatorR > maxProLaboreAffordable + 0.01) {
    return {
      ...lucrosOnly,
      strategy: "lucros-only",
      strategyLabel: "Só lucros — pró-labore p/ Fator R inviável nesta receita",
      totalTaxBrl: lucrosOnly.totalTaxBrl,
      taxWithoutOptimization: lucrosOnly.totalTaxBrl,
      taxSavingsBrl: 0,
    };
  }

  const fatorRScenario = evaluateScenario({ ...base, proLaboreGross: minForFatorR });

  if (lucrosOnly.totalTaxBrl <= fatorRScenario.totalTaxBrl + 0.01) {
    return {
      ...lucrosOnly,
      strategy: "lucros-only",
      strategyLabel: "Só lucros — compensa mais que subir pró-labore",
      totalTaxBrl: lucrosOnly.totalTaxBrl,
      taxWithoutOptimization: lucrosOnly.totalTaxBrl,
      taxSavingsBrl: 0,
    };
  }

  return {
    ...fatorRScenario,
    strategy: "fator-r",
    strategyLabel: `Pró-labore ${round(minForFatorR).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} p/ Fator R`,
    totalTaxBrl: fatorRScenario.totalTaxBrl,
    taxWithoutOptimization: lucrosOnly.totalTaxBrl,
    taxSavingsBrl: round(Math.max(0, lucrosOnly.totalTaxBrl - fatorRScenario.totalTaxBrl)),
  };
}

export function calculatePjToPfBr(input: PjToPfInput): PjToPfResult {
  const monthlyAmount = Math.max(0, input.monthlyAmount);
  const mode = input.mode ?? "full";
  const payrollMonthly = Math.max(0, input.payrollMonthly ?? 0);
  const payrollChargesPercent = input.payrollChargesPercent ?? 20;
  const dependents = input.dependents ?? 0;
  const includePjTax = mode === "full";

  const grossMonthly = includePjTax ? monthlyAmount : 0;
  const companyCash = includePjTax ? undefined : monthlyAmount;
  const revenue12Months =
    input.revenue12Months && input.revenue12Months > 0
      ? input.revenue12Months
      : Math.max(grossMonthly, monthlyAmount) * 12;

  const optimization =
    input.proLaboreOverride != null && input.proLaboreOverride >= 0
      ? (() => {
          const scenario = evaluateScenario({
            grossMonthly: includePjTax ? monthlyAmount : 0,
            proLaboreGross: input.proLaboreOverride,
            payrollMonthly,
            payrollChargesPercent,
            revenue12Months,
            dependents,
            cnaeCode: input.cnaeCode,
            taxRatePercent: input.taxRatePercent,
            includePjTax,
            companyCash,
          });
          return {
            ...scenario,
            strategy: "manual" as const,
            strategyLabel: "Pró-labore manual",
            totalTaxBrl: scenario.totalTaxBrl,
            taxWithoutOptimization: undefined,
            taxSavingsBrl: 0,
          };
        })()
      : optimizeProLaboreForMinTax({
          grossMonthly: includePjTax ? monthlyAmount : 0,
          payrollMonthly,
          payrollChargesPercent,
          revenue12Months,
          dependents,
          cnaeCode: input.cnaeCode,
          taxRatePercent: input.taxRatePercent,
          includePjTax,
          companyCash,
        });

  const proLaboreGross = optimization.proLaboreGross;
  const pf = calculateCltBr({ grossSalary: proLaboreGross, dependents });
  const pfTaxBrl = pf.totalDeductions;
  const proLaboreNet = pf.net;

  const pjTaxBrl = optimization.pjTaxBrl;
  const cashAfterPj = includePjTax ? monthlyAmount - pjTaxBrl : monthlyAmount;
  const lucrosDistribuidos = round(Math.max(0, cashAfterPj - proLaboreGross));
  const totalPfNet = round(proLaboreNet + lucrosDistribuidos);

  const fatorR = optimization.fatorR;
  const fatorRMet = optimization.fatorRMet;
  const minProLabore = minProLaboreForFatorR(
    revenue12Months,
    payrollMonthly,
    payrollChargesPercent,
  );

  const rateWithout = resolveSimplesRateWithFatorR({
    cnaeCode: input.cnaeCode,
    manualRate: input.taxRatePercent,
    fatorR: 0,
  });

  const fatorRSavingsBrl =
    includePjTax && fatorRMet
      ? round(monthlyAmount * ((rateWithout.rate - optimization.rate) / 100))
      : 0;

  const deductions = [
    ...(includePjTax
      ? [
          {
            id: "pj-tax",
            label: `Simples Anexo ${optimization.annex} (${optimization.rate.toLocaleString("pt-BR")}%)`,
            amount: pjTaxBrl,
            hint: fatorRMet
              ? `Fator R ${(fatorR * 100).toFixed(1)}% — anexo reduzido`
              : `Fator R ${(fatorR * 100).toFixed(1)}%`,
          },
        ]
      : []),
    {
      id: "pro-labore-gross",
      label: "Pró-labore (otimizado)",
      amount: proLaboreGross,
      hint: optimization.strategyLabel,
    },
    ...pf.deductions.map((line) => ({
      ...line,
      id: `pf-${line.id}`,
      label: `${line.label} (pró-labore)`,
    })),
    {
      id: "lucros",
      label: "Divisão de lucros",
      amount: lucrosDistribuidos,
      hint: "Isento de IR (PF)",
      variant: "info" as const,
    },
  ];

  const notes = [
    optimization.strategyLabel,
    optimization.taxSavingsBrl > 0
      ? `Economia vs só lucros: ${optimization.taxSavingsBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês`
      : undefined,
    `Imposto total: ${(pjTaxBrl + pfTaxBrl).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (PJ ${pjTaxBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} + PF ${pfTaxBrl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`,
    "Simulação — consulte contador.",
  ].filter(Boolean) as string[];

  return {
    gross: monthlyAmount,
    net: totalPfNet,
    totalDeductions: pjTaxBrl + pfTaxBrl,
    deductions,
    notes,
    fatorR,
    fatorRMet,
    fatorRSavingsBrl,
    pjTaxBrl,
    pfTaxBrl,
    proLaboreGross,
    proLaboreNet,
    lucrosDistribuidos,
    effectivePjRate: optimization.rate,
    annex: optimization.annex,
    minProLaboreForFatorR: round(minProLabore),
    optimization: {
      proLaboreGross,
      strategy: optimization.strategy,
      strategyLabel: optimization.strategyLabel,
      totalTaxBrl: optimization.totalTaxBrl,
      taxWithoutOptimization: optimization.taxWithoutOptimization,
      taxSavingsBrl: optimization.taxSavingsBrl,
    },
  };
}

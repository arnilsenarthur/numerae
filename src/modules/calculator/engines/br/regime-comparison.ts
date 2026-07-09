import { FATOR_R_THRESHOLD } from "@/modules/calculator/engines/br/fator-r";
import {
  calcProLaboreInss,
  calcProLaboreIrrf,
  calcProLaboreNet,
} from "@/modules/calculator/engines/br/prolabore";
import {
  LUCRO_PRESUMIDO,
  MEI_ANNUAL_LIMIT,
  MEI_DAS_MONTHLY,
  SIMPLES_ANNEX_III,
  SIMPLES_ANNEX_V,
  type SimplesRange,
} from "@/modules/calculator/engines/br/tables/2025";

export type PjRegimeId =
  | "mei"
  | "simples_iii"
  | "simples_v"
  | "lucro_presumido"
  | "manual";

export type TaxLineItem = {
  id: string;
  labelKey: string;
  amount: number;
  labelParams?: Record<string, string | number>;
};

export type PjRegimeResult = {
  id: PjRegimeId;
  annualTax: number;
  monthlyTax: number;
  netMonthly: number;
  effectiveRate: number;
  breakdown: TaxLineItem[];
  applicable: boolean;
  warningKey?: string;
  warningParams?: Record<string, string | number>;
  fatorRMet?: boolean;
};

export type PjRegimeComparisonInput = {
  monthlyRevenue: number;
  proLaboreMonthly?: number;
  manualRatePercent?: number;
  includeManual?: boolean;
};

export type PjRegimeComparisonResult = {
  monthlyRevenue: number;
  annualRevenue: number;
  proLaboreMonthly: number;
  fatorR: number;
  minProLaboreForFatorR: number;
  proLaboreInss: number;
  proLaboreIrrf: number;
  proLaboreNet: number;
  regimes: PjRegimeResult[];
  bestRegimeId: PjRegimeId | null;
  fatorROptimization: {
    savingsMonthly: number;
    minProLabore: number;
    rateAnnexIII: number;
    rateAnnexV: number;
  } | null;
  insight: {
    bestRegimeId: PjRegimeId | null;
    bestMonthlyTax: number;
    bestEffectiveRate: number;
    worstApplicableMonthlyTax: number;
    savingsVsWorst: number;
    simpleRegimeId: PjRegimeId | null;
    simpleMonthlyTax: number;
    completeRegimeId: PjRegimeId | null;
    completeMonthlyTax: number;
  };
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function calcSimplesAnnual(annual: number, table: SimplesRange[]): number {
  if (annual <= 0) return 0;
  const range = table.find((item) => annual <= item.maxRevenue);
  if (!range) return annual * 0.33;
  return Math.max(0, annual * range.nominalRate - range.deduction);
}

export function calcSimplesEffectiveRate(annual: number, table: SimplesRange[]): number {
  if (annual <= 0) return 0;
  return calcSimplesAnnual(annual, table) / annual;
}

export function calcLucroPresumidoAnnual(annual: number): number {
  if (annual <= 0) return 0;
  const presumed = annual * LUCRO_PRESUMIDO.presumptionRate;
  const irpj =
    presumed * LUCRO_PRESUMIDO.irpjRate +
    Math.max(0, presumed - LUCRO_PRESUMIDO.irpjSurchargeThreshold) *
      LUCRO_PRESUMIDO.irpjSurchargeRate;
  const csll = presumed * LUCRO_PRESUMIDO.csllRate;
  const pis = annual * LUCRO_PRESUMIDO.pisRate;
  const cofins = annual * LUCRO_PRESUMIDO.cofinsRate;
  const iss = annual * LUCRO_PRESUMIDO.issRate;
  return irpj + csll + pis + cofins + iss;
}

export function calcMonthlyTaxByRegime(
  regimeId: PjRegimeId,
  monthlyRevenue: number,
  manualRatePercent = 0,
): number {
  const monthly = Math.max(0, monthlyRevenue);
  const annual = monthly * 12;

  switch (regimeId) {
    case "mei":
      return annual <= MEI_ANNUAL_LIMIT ? MEI_DAS_MONTHLY : 0;
    case "simples_iii":
      return calcSimplesAnnual(annual, SIMPLES_ANNEX_III) / 12;
    case "simples_v":
      return calcSimplesAnnual(annual, SIMPLES_ANNEX_V) / 12;
    case "lucro_presumido":
      return calcLucroPresumidoAnnual(annual) / 12;
    case "manual": {
      const rate = Math.max(0, manualRatePercent) / 100;
      return monthly * rate;
    }
    default:
      return 0;
  }
}

function buildMeiRegime(monthly: number, annual: number): PjRegimeResult {
  if (annual <= MEI_ANNUAL_LIMIT) {
    const monthlyTax = MEI_DAS_MONTHLY;
    return {
      id: "mei",
      annualTax: monthlyTax * 12,
      monthlyTax,
      netMonthly: monthly - monthlyTax,
      effectiveRate: annual > 0 ? (monthlyTax * 12) / annual : 0,
      breakdown: [{ id: "das", labelKey: "breakdownMeiDas", amount: monthlyTax }],
      applicable: true,
    };
  }

  return {
    id: "mei",
    annualTax: 0,
    monthlyTax: 0,
    netMonthly: monthly,
    effectiveRate: 0,
    breakdown: [],
    applicable: false,
    warningKey: "meiOverLimit",
    warningParams: { annual },
  };
}

function buildSimplesIII(
  monthly: number,
  annual: number,
  proLabore: number,
  fatorR: number,
): PjRegimeResult {
  const simplesAnnual = calcSimplesAnnual(annual, SIMPLES_ANNEX_III);
  const simplesMonthly = simplesAnnual / 12;
  const inss = proLabore > 0 ? calcProLaboreInss(proLabore) : 0;
  const monthlyTax = simplesMonthly + inss;
  const annualTax = simplesAnnual + inss * 12;

  const breakdown: TaxLineItem[] = [
    {
      id: "simples",
      labelKey: "breakdownSimples",
      amount: simplesMonthly,
      labelParams: { rate: round(calcSimplesEffectiveRate(annual, SIMPLES_ANNEX_III) * 100) },
    },
  ];

  if (inss > 0) {
    breakdown.push({ id: "inss", labelKey: "breakdownInss", amount: inss });
  }

  return {
    id: "simples_iii",
    annualTax,
    monthlyTax,
    netMonthly: monthly - monthlyTax,
    effectiveRate: annual > 0 ? annualTax / annual : 0,
    breakdown,
    applicable: true,
    fatorRMet: proLabore > 0 ? fatorR >= FATOR_R_THRESHOLD : undefined,
  };
}

function buildSimplesV(monthly: number, annual: number): PjRegimeResult {
  const simplesAnnual = calcSimplesAnnual(annual, SIMPLES_ANNEX_V);
  const simplesMonthly = simplesAnnual / 12;

  return {
    id: "simples_v",
    annualTax: simplesAnnual,
    monthlyTax: simplesMonthly,
    netMonthly: monthly - simplesMonthly,
    effectiveRate: annual > 0 ? simplesAnnual / annual : 0,
    breakdown: [
      {
        id: "simples",
        labelKey: "breakdownSimples",
        amount: simplesMonthly,
        labelParams: { rate: round(calcSimplesEffectiveRate(annual, SIMPLES_ANNEX_V) * 100) },
      },
    ],
    applicable: true,
    fatorRMet: false,
  };
}

function buildLucroPresumido(
  monthly: number,
  annual: number,
  proLabore: number,
): PjRegimeResult {
  const companyAnnual = calcLucroPresumidoAnnual(annual);
  const companyMonthly = companyAnnual / 12;
  const inss = proLabore > 0 ? calcProLaboreInss(proLabore) : 0;
  const irrf = proLabore > 0 ? calcProLaboreIrrf(proLabore) : 0;
  const monthlyTax = companyMonthly + inss + irrf;
  const annualTax = companyAnnual + (inss + irrf) * 12;

  const breakdown: TaxLineItem[] = [
    { id: "company", labelKey: "breakdownLpCompany", amount: companyMonthly },
  ];

  if (inss > 0) breakdown.push({ id: "inss", labelKey: "breakdownInss", amount: inss });
  if (irrf > 0) breakdown.push({ id: "irrf", labelKey: "breakdownIrrf", amount: irrf });

  return {
    id: "lucro_presumido",
    annualTax,
    monthlyTax,
    netMonthly: monthly - monthlyTax,
    effectiveRate: annual > 0 ? annualTax / annual : 0,
    breakdown,
    applicable: true,
  };
}

function buildManual(monthly: number, manualRatePercent: number): PjRegimeResult | null {
  const rate = Math.max(0, manualRatePercent) / 100;
  if (rate <= 0) return null;

  const monthlyTax = monthly * rate;
  return {
    id: "manual",
    annualTax: monthlyTax * 12,
    monthlyTax,
    netMonthly: monthly - monthlyTax,
    effectiveRate: rate,
    breakdown: [
      {
        id: "manual",
        labelKey: "breakdownManual",
        amount: monthlyTax,
        labelParams: { rate: round(rate * 100) },
      },
    ],
    applicable: true,
  };
}

export function comparePjRegimesBr(input: PjRegimeComparisonInput): PjRegimeComparisonResult {
  const monthly = Math.max(0, input.monthlyRevenue);
  const annual = monthly * 12;
  const proLabore = Math.max(0, input.proLaboreMonthly ?? 0);
  const fatorR = annual > 0 && proLabore > 0 ? (proLabore * 12) / annual : 0;
  const minProLaboreForFatorR = annual > 0 ? (annual * FATOR_R_THRESHOLD) / 12 : 0;
  const proLaboreInss = calcProLaboreInss(proLabore);
  const proLaboreIrrf = calcProLaboreIrrf(proLabore);
  const proLaboreNet = calcProLaboreNet(proLabore);

  const regimes: PjRegimeResult[] = [
    buildMeiRegime(monthly, annual),
    buildSimplesIII(monthly, annual, proLabore, fatorR),
    buildSimplesV(monthly, annual),
    buildLucroPresumido(monthly, annual, proLabore),
  ];

  if (input.includeManual !== false) {
    const manual = buildManual(monthly, input.manualRatePercent ?? 0);
    if (manual) regimes.push(manual);
  }

  const applicable = regimes.filter((regime) => regime.applicable && regime.monthlyTax >= 0);
  const sorted = [...applicable].sort((a, b) => {
    if (a.id === "simples_v" && b.id === "simples_iii") return 1;
    if (a.id === "simples_iii" && b.id === "simples_v") return -1;
    return a.effectiveRate - b.effectiveRate;
  });

  const best = sorted.find((regime) => regime.effectiveRate > 0 || regime.id === "mei") ?? null;
  const worst = sorted.length > 0 ? sorted[sorted.length - 1]! : null;

  const simpleRegime =
    applicable.find((regime) => regime.id === "mei" && regime.applicable) ??
    applicable.find((regime) => regime.id === "simples_iii") ??
    null;

  const completeRegime =
    applicable.find((regime) => regime.id === "lucro_presumido") ?? null;

  let fatorROptimization: PjRegimeComparisonResult["fatorROptimization"] = null;
  if (proLabore > 0 && fatorR < FATOR_R_THRESHOLD && annual > 0) {
    const rateIII = calcSimplesEffectiveRate(annual, SIMPLES_ANNEX_III);
    const rateV = calcSimplesEffectiveRate(annual, SIMPLES_ANNEX_V);
    const simplesDiff =
      (calcSimplesAnnual(annual, SIMPLES_ANNEX_V) - calcSimplesAnnual(annual, SIMPLES_ANNEX_III)) / 12;
    const inssDiff = (minProLaboreForFatorR - proLabore) * 0.11;
    fatorROptimization = {
      savingsMonthly: round(Math.max(0, simplesDiff - inssDiff)),
      minProLabore: round(minProLaboreForFatorR),
      rateAnnexIII: round(rateIII * 100),
      rateAnnexV: round(rateV * 100),
    };
  }

  return {
    monthlyRevenue: monthly,
    annualRevenue: annual,
    proLaboreMonthly: proLabore,
    fatorR,
    minProLaboreForFatorR: round(minProLaboreForFatorR),
    proLaboreInss,
    proLaboreIrrf,
    proLaboreNet,
    regimes: sorted,
    bestRegimeId: best?.id ?? null,
    fatorROptimization,
    insight: {
      bestRegimeId: best?.id ?? null,
      bestMonthlyTax: best?.monthlyTax ?? 0,
      bestEffectiveRate: best?.effectiveRate ?? 0,
      worstApplicableMonthlyTax: worst?.monthlyTax ?? 0,
      savingsVsWorst: round(Math.max(0, (worst?.monthlyTax ?? 0) - (best?.monthlyTax ?? 0))),
      simpleRegimeId: simpleRegime?.id ?? null,
      simpleMonthlyTax: simpleRegime?.monthlyTax ?? 0,
      completeRegimeId: completeRegime?.id ?? null,
      completeMonthlyTax: completeRegime?.monthlyTax ?? 0,
    },
  };
}

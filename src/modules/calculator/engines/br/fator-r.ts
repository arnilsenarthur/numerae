import { findCnaePreset } from "@/modules/calculator/engines/br/cnae-catalog";

export const FATOR_R_THRESHOLD = 0.28;

export function calculateFatorR(params: {
  proLaboreMonthly: number;
  payrollMonthly: number;
  payrollChargesPercent?: number;
  revenue12Months: number;
}): number {
  const charges = params.payrollChargesPercent ?? 20;
  const folhaMensal =
    params.proLaboreMonthly * (1 + charges / 100) + params.payrollMonthly;

  if (params.revenue12Months <= 0) return 0;
  return (folhaMensal * 12) / params.revenue12Months;
}

/** Pró-labore mensal mínimo para atingir Fator R ≥ 28% (estimativa). */
export function minProLaboreForFatorR(
  revenue12Months: number,
  payrollMonthly: number,
  payrollChargesPercent = 20,
): number {
  const targetFolha12 = revenue12Months * FATOR_R_THRESHOLD;
  const payrollPart = payrollMonthly * 12;
  const neededWithCharges = Math.max(0, targetFolha12 - payrollPart);
  return neededWithCharges / (1 + payrollChargesPercent / 100) / 12;
}

export function resolveSimplesRateWithFatorR(params: {
  cnaeCode?: string;
  manualRate?: number;
  fatorR: number;
}): {
  rate: number;
  annex: string;
  fatorRApplied: boolean;
  rateWithoutFatorR?: number;
} {
  const cnae = params.cnaeCode ? findCnaePreset(params.cnaeCode) : undefined;
  const rateWithFatorR = cnae?.rate ?? params.manualRate ?? 6;
  const rateWithoutFatorR = cnae?.rateIfLowFatorR ?? 15.5;
  const annexWith = cnae?.annex ?? "III";
  const annexWithout = cnae?.annexIfLowFatorR ?? "V";

  if (params.fatorR >= FATOR_R_THRESHOLD) {
    return {
      rate: rateWithFatorR,
      annex: annexWith,
      fatorRApplied: true,
      rateWithoutFatorR,
    };
  }

  if (cnae?.rateIfLowFatorR || cnae?.annexIfLowFatorR) {
    return {
      rate: rateWithoutFatorR,
      annex: annexWithout,
      fatorRApplied: false,
      rateWithoutFatorR,
    };
  }

  return {
    rate: rateWithFatorR,
    annex: annexWith,
    fatorRApplied: false,
    rateWithoutFatorR,
  };
}

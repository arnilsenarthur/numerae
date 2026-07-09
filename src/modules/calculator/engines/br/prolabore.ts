import {
  PROLABORE_INSS_CEILING,
  PROLABORE_INSS_RATE,
  PROLABORE_IRPF_BRACKETS,
} from "@/modules/calculator/engines/br/tables/2025";

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function calcProLaboreInss(proLabore: number): number {
  const gross = Math.max(0, proLabore);
  return round(Math.min(gross * PROLABORE_INSS_RATE, PROLABORE_INSS_CEILING * PROLABORE_INSS_RATE));
}

export function calcProLaboreIrrf(proLabore: number): number {
  const base = Math.max(0, proLabore) - calcProLaboreInss(proLabore);
  if (base <= 0) return 0;

  for (const bracket of PROLABORE_IRPF_BRACKETS) {
    if (base <= bracket.max) {
      return round(Math.max(0, base * bracket.rate - bracket.deduction));
    }
  }

  return 0;
}

export function calcProLaboreNet(proLabore: number): number {
  const gross = Math.max(0, proLabore);
  return round(gross - calcProLaboreInss(gross) - calcProLaboreIrrf(gross));
}

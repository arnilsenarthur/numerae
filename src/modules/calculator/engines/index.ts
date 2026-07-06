import type { CountryCode } from "@/lib/locale";
import { calculateCltBr } from "@/modules/calculator/engines/br/clt";
import { calculatePjBr } from "@/modules/calculator/engines/br/pj";
import type { CltInput, PjInput, SalaryCalculationResult } from "@/modules/calculator/types";

export function calculateClt(countryCode: CountryCode, input: CltInput): SalaryCalculationResult {
  switch (countryCode) {
    case "BR":
      return calculateCltBr(input);
    default:
      return calculateCltBr(input);
  }
}

export function calculatePj(countryCode: CountryCode, input: PjInput): SalaryCalculationResult {
  switch (countryCode) {
    case "BR":
      return calculatePjBr(input);
    default:
      return calculatePjBr(input);
  }
}

export { CNAE_CATALOG_BR, findCnaePreset } from "@/modules/calculator/engines/br/cnae-catalog";

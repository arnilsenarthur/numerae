import type { PjInput, SalaryCalculationResult } from "@/modules/calculator/types";
import { findCnaePreset } from "@/modules/calculator/engines/br/cnae-catalog";

export function calculatePjBr(input: PjInput): SalaryCalculationResult {
  const gross = Math.max(0, input.grossRevenue);
  const rate = Math.min(100, Math.max(0, input.taxRatePercent));
  const tax = Math.round(gross * (rate / 100) * 100) / 100;
  const cnae = input.cnaeCode ? findCnaePreset(input.cnaeCode) : undefined;

  const regimeLabel =
    input.taxRegime === "manual"
      ? "Alíquota manual"
      : input.taxRegime === "presumido"
        ? "Lucro presumido (estimativa)"
        : "Simples Nacional (estimativa)";

  const deductions = [
    {
      id: "tax",
      label: `${regimeLabel} (${rate.toLocaleString("pt-BR")}%)`,
      amount: tax,
      hint: cnae
        ? `CNAE ${cnae.code} — ${cnae.description}`
        : "Alíquota efetiva informada",
    },
  ];

  return {
    gross,
    net: gross - tax,
    totalDeductions: tax,
    deductions,
    notes: [
      cnae ? `Anexo ${cnae.annex} do Simples — alíquota nominal de referência.` : undefined,
      "Não inclui pró-labore, INSS do sócio, contador ou ISS municipal adicional.",
      "Use como simulação. Regras variam por faturamento acumulado e município.",
    ].filter(Boolean) as string[],
  };
}

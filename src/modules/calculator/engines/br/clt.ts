import type { CltInput, SalaryCalculationResult } from "@/modules/calculator/types";

/** Tabelas INSS e IRRF — valores de referência 2025. Atualizar por ano/país. */

const INSS_BRACKETS = [
  { upTo: 1518, rate: 0.075 },
  { upTo: 2793.88, rate: 0.09 },
  { upTo: 4190.83, rate: 0.12 },
  { upTo: 8157.41, rate: 0.14 },
] as const;

const IRRF_BRACKETS = [
  { upTo: 2428.8, rate: 0, deduction: 0 },
  { upTo: 2826.65, rate: 0.075, deduction: 182.16 },
  { upTo: 3751.05, rate: 0.15, deduction: 394.16 },
  { upTo: 4664.68, rate: 0.225, deduction: 675.49 },
  { upTo: Infinity, rate: 0.275, deduction: 908.73 },
] as const;

const DEPENDENT_DEDUCTION = 189.59;

function calculateInss(gross: number): number {
  let total = 0;
  let previousLimit = 0;

  for (const bracket of INSS_BRACKETS) {
    if (gross <= previousLimit) break;

    const taxable = Math.min(gross, bracket.upTo) - previousLimit;
    if (taxable > 0) total += taxable * bracket.rate;
    previousLimit = bracket.upTo;
  }

  return Math.round(total * 100) / 100;
}

function calculateIrrf(taxableBase: number): number {
  if (taxableBase <= 0) return 0;

  for (const bracket of IRRF_BRACKETS) {
    if (taxableBase <= bracket.upTo) {
      const tax = taxableBase * bracket.rate - bracket.deduction;
      return Math.max(0, Math.round(tax * 100) / 100);
    }
  }

  return 0;
}

export function calculateCltBr(input: CltInput): SalaryCalculationResult {
  const { grossSalary, dependents = 0 } = input;
  const gross = Math.max(0, grossSalary);

  const inss = calculateInss(gross);
  const irrfBase = gross - inss - dependents * DEPENDENT_DEDUCTION;
  const irrf = calculateIrrf(irrfBase);
  const fgts = Math.round(gross * 0.08 * 100) / 100;

  const deductions = [
    { id: "inss", label: "INSS", amount: inss, hint: "Contribuição previdenciária" },
    { id: "irrf", label: "IRRF", amount: irrf, hint: "Imposto retido na fonte" },
  ];

  const net = gross - inss - irrf;

  return {
    gross,
    net,
    totalDeductions: inss + irrf,
    deductions,
    notes: [
      `FGTS (custo empresa, 8%): referência de ${fgts.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
      dependents > 0
        ? `${dependents} dependente(s) considerado(s) no IRRF.`
        : "Sem dependentes declarados no IRRF.",
      "Valores estimados com tabelas vigentes no Brasil. Consulte contador para decisões fiscais.",
    ],
  };
}

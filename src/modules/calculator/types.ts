export type DeductionLine = {
  id: string;
  label: string;
  amount: number;
  hint?: string;
  variant?: "default" | "employer" | "info";
};

export type SalaryCalculationResult = {
  gross: number;
  net: number;
  totalDeductions: number;
  deductions: DeductionLine[];
  notes?: string[];
};

export type EmploymentType = "clt" | "pj";

export type CltInput = {
  grossSalary: number;
  dependents?: number;
};

export type PjInput = {
  grossRevenue: number;
  taxRatePercent: number;
  taxRegime?: string;
  cnaeCode?: string;
};

export const MONEY_MAP_TEMPLATES = {
  PJ_USD_INCOME: "pj-usd-income",
} as const;

export type MoneyMapTemplateId =
  (typeof MONEY_MAP_TEMPLATES)[keyof typeof MONEY_MAP_TEMPLATES];

export type MoneyMapNodeType =
  | "INCOME"
  | "CONVERSION"
  | "TAX_PJ"
  | "EXPENSE"
  | "INVESTMENT"
  | "SPLIT";

export type MoneyPeriod = "monthly" | "annual" | "once";

export type IncomeNodeConfig = {
  amount: number;
  currency: "USD" | "BRL" | "EUR";
  period: MoneyPeriod;
};

export type ConversionNodeConfig = {
  institutionIds: string[];
  fromCurrency: "USD" | "BRL" | "EUR";
  toCurrency: "USD" | "BRL" | "EUR";
};

export type TaxPjNodeConfig = {
  cnpjId?: string | null;
  taxRatePercent: number;
  taxRegime?: "simples" | "presumido" | "manual";
  cnaeCode?: string | null;
};

export type ExpenseNodeConfig = {
  amount: number;
  currency: "USD" | "BRL" | "EUR";
  period: MoneyPeriod;
  label?: string;
};

export type InvestmentNodeConfig = {
  percentOfNet: number;
  label?: string;
};

export type MoneyMapNodeInput = {
  id?: string;
  type: MoneyMapNodeType;
  label?: string | null;
  sortOrder: number;
  config:
    | IncomeNodeConfig
    | ConversionNodeConfig
    | TaxPjNodeConfig
    | ExpenseNodeConfig
    | InvestmentNodeConfig
    | Record<string, unknown>;
};

export type MoneyMapInput = {
  name: string;
  templateId?: string | null;
  horizonMonths: number;
  nodes: MoneyMapNodeInput[];
};

export type RouteQuote = {
  institutionId: string;
  institutionName: string;
  institutionSlug: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  spreadPercent: number;
  effectiveRate: number;
  feeFixed: number | null;
  feePercent: number | null;
  stale: boolean;
};

export type MonthlyProjection = {
  month: number;
  grossInSource: number;
  grossBrl: number;
  taxBrl: number;
  expensesBrl: number;
  netBrl: number;
  investedBrl: number;
  cumulativeNetBrl: number;
};

export type RouteSimulation = {
  institutionId: string;
  institutionName: string;
  quote: RouteQuote;
  monthly: MonthlyProjection[];
  totals: {
    grossBrl: number;
    taxBrl: number;
    expensesBrl: number;
    netBrl: number;
    investedBrl: number;
  };
};

export type SimulationResult = {
  horizonMonths: number;
  incomeLabel: string;
  routes: RouteSimulation[];
  recommendation: {
    bestRouteInstitutionId: string;
    bestRouteLabel: string;
    summary: string;
    deltaVsWorstBrl: number;
  };
};

export const MONEY_MAP_NODE_LABELS: Record<MoneyMapNodeType, string> = {
  INCOME: "Entrada",
  CONVERSION: "Conversão",
  TAX_PJ: "Imposto PJ",
  EXPENSE: "Saída",
  INVESTMENT: "Investimento",
  SPLIT: "Divisão",
};

export const MONEY_MAP_TEMPLATES = {
  PJ_USD_INCOME: "pj-usd-income",
  USD_OPTIMIZE: "usd-optimize",
  MONTHLY_BUDGET: "monthly-budget",
  CLT_VS_PJ: "clt-vs-pj",
  INVESTMENT_GOAL: "investment-goal",
  FULL_PLAN: "full-plan",
} as const;

export type MoneyMapTemplateId =
  (typeof MONEY_MAP_TEMPLATES)[keyof typeof MONEY_MAP_TEMPLATES];

export type MoneyMapNodeType =
  | "INCOME"
  | "CONVERSION"
  | "TAX_PJ"
  | "PJ_TO_PF"
  | "MAX"
  | "MIN"
  | "SUM"
  | "EXPENSE"
  | "INVESTMENT"
  | "SPLIT"
  | "INTEREST"
  | "TIME";

export type MoneyPeriod = "monthly" | "annual" | "once";

export type ExpenseCategory =
  | "housing"
  | "food"
  | "transport"
  | "health"
  | "education"
  | "leisure"
  | "tax"
  | "business"
  | "investment"
  | "other";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  housing: "Moradia",
  food: "Alimentação",
  transport: "Transporte",
  health: "Saúde",
  education: "Educação",
  leisure: "Lazer",
  tax: "Impostos",
  business: "Empresa",
  investment: "Investimento",
  other: "Outros",
};

export type NodePosition = { x: number; y: number };

export type IncomeNodeConfig = {
  amount: number;
  currency: "USD" | "BRL" | "EUR";
  period: MoneyPeriod;
  category?: ExpenseCategory | "salary" | "business" | "investment" | "other";
  /** Mês (1–horizon) em que entra valor único */
  onceMonth?: number;
  position?: NodePosition;
};

export type ConversionNodeConfig = {
  institutionId: string;
  fromCurrency: "USD" | "BRL" | "EUR";
  toCurrency: "USD" | "BRL" | "EUR";
  position?: NodePosition;
  institutionIds?: string[];
};

export type TaxPjNodeConfig = {
  cnpjId?: string | null;
  companyId?: string | null;
  taxRatePercent: number;
  taxRegime?: "simples" | "presumido" | "manual";
  cnaeCode?: string | null;
  position?: NodePosition;
};

/** Saída de caixa — contador, aluguel, etc. */
export type ExpenseNodeConfig = {
  amount: number;
  currency: "USD" | "BRL" | "EUR";
  period: MoneyPeriod;
  category?: ExpenseCategory;
  onceMonth?: number;
  position?: NodePosition;
};

export type TimeNodeConfig = {
  /** Acumulador: quantos meses acumular o valor mensal recebido pela conexão */
  months: number;
  /** Taxa anual opcional nos aportes mensais (juros compostos) */
  annualRatePercent?: number;
  position?: NodePosition;
};

export type InterestNodeConfig = {
  annualRatePercent: number;
  months: number;
  mode?: "compound" | "simple" | "annuity";
  position?: NodePosition;
};

export type InvestmentNodeConfig = {
  percentOfNet: number;
  /** Rendimento anual estimado sobre a parcela investida */
  annualRatePercent?: number;
  /** Horizonte para projetar o acumulado investido */
  projectionMonths?: number;
  label?: string;
  position?: NodePosition;
};

export type SplitNodeConfig = {
  branchA: number;
  branchB: number;
  position?: NodePosition;
};

export type PjToPfNodeConfig = {
  /** full = receita bruta + otimiza Simples/Fator R; distribution = pós imposto PJ upstream */
  mode?: "full" | "distribution";
  companyId?: string | null;
  cnpjId?: string | null;
  proLaboreOverride?: number | null;
  payrollMonthly?: number;
  payrollChargesPercent?: number;
  revenue12Months?: number;
  dependents?: number;
  taxRatePercent?: number;
  taxRegime?: "simples" | "presumido" | "manual";
  cnaeCode?: string | null;
  position?: NodePosition;
};

export type MaxValueNodeConfig = {
  compareCurrency?: "BRL" | "USD" | "EUR";
  position?: NodePosition;
};

export type MaxValueNodeDetail = {
  winnerNodeId: string;
  winnerLabel: string;
  winnerAmount: number;
  winnerCurrency: string;
  winnerBrl: number;
  candidateCount: number;
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
    | TimeNodeConfig
    | InvestmentNodeConfig
    | SplitNodeConfig
    | PjToPfNodeConfig
    | MaxValueNodeConfig
    | InterestNodeConfig
    | Record<string, unknown>;
};

export type MoneyMapEdgeInput = {
  id?: string;
  fromNodeId: string;
  toNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
};

export type MoneyMapInput = {
  name: string;
  templateId?: string | null;
  horizonMonths: number;
  nodes: MoneyMapNodeInput[];
  edges: MoneyMapEdgeInput[];
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

export type CurrencyFlow = {
  income: number;
  expense: number;
  net: number;
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
  /** Valores nativos por moeda (não convertidos para BRL). */
  byCurrency: Record<string, CurrencyFlow>;
};

export type RouteSimulation = {
  pathId: string;
  pathLabel: string;
  pathSteps: { nodeId: string; type: MoneyMapNodeType; label: string; monthlyBrl: number }[];
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

export type TimeViewerResult = {
  nodeId: string;
  label: string;
  sourceNodeId: string;
  sourceLabel: string;
  months: number;
  monthlyNetBrl: number;
  cumulativeNetBrl: number;
};

export type PjToPfNodeDetail = {
  fatorR: number;
  fatorRMet: boolean;
  proLaboreGross: number;
  proLaboreNet: number;
  lucrosDistribuidos: number;
  pjTaxBrl: number;
  pfTaxBrl: number;
  annex: string;
  strategyLabel: string;
  taxSavingsBrl: number;
};

export type SimulationResult = {
  horizonMonths: number;
  incomeLabel: string;
  routes: RouteSimulation[];
  viewers: TimeViewerResult[];
  nodeOutputs?: Record<
    string,
    {
      amount: number;
      currency: string;
      period?: MoneyPeriod;
      handles?: Record<string, { amount: number; currency: string; period?: MoneyPeriod }>;
    }
  >;
  nodeDetails?: Record<string, PjToPfNodeDetail>;
  nodeMaxDetails?: Record<string, MaxValueNodeDetail>;
  nodeErrors?: Record<string, string>;
  analytics?: PlanAnalytics;
  recommendation: {
    bestRouteInstitutionId: string;
    bestRouteLabel: string;
    summary: string;
    deltaVsWorstBrl: number;
  };
};

export type PlanLineItem = {
  nodeId: string;
  label: string;
  category: string;
  kind: "income" | "expense" | "investment";
  amount: number;
  currency: string;
  period: MoneyPeriod;
  onceMonth?: number;
  /** Valor mensal na moeda original */
  monthlyNative: number;
  /** Valor mensal em BRL após tratamentos/conversão; null se ainda na moeda estrangeira */
  monthlyBrl: number | null;
  /** @deprecated use monthlyBrl */
  monthlyEquivalentBrl: number;
  converted: boolean;
};

export type PlanCategoryBreakdown = {
  category: string;
  label: string;
  incomeBrl: number;
  expenseBrl: number;
  netBrl: number;
};

export type PlanAnalytics = {
  horizonMonths: number;
  timeline: MonthlyProjection[];
  lineItems: PlanLineItem[];
  byCategory: PlanCategoryBreakdown[];
  /** Moedas presentes no plano (inclui BRL). */
  currencies: string[];
  totals: {
    grossBrl: number;
    taxBrl: number;
    expensesBrl: number;
    netBrl: number;
    investedBrl: number;
    cumulativeNetBrl: number;
  };
  accumulatedForGoals: number;
};

export const MONEY_MAP_NODE_LABELS: Record<MoneyMapNodeType, string> = {
  INCOME: "Entrada",
  CONVERSION: "Conversão",
  TAX_PJ: "Imposto PJ",
  PJ_TO_PF: "PJ → PF",
  MAX: "Máximo",
  MIN: "Mínimo",
  SUM: "Soma",
  EXPENSE: "Saída",
  INVESTMENT: "Investimento",
  SPLIT: "Divisão",
  INTEREST: "Juros",
  TIME: "Acumulador",
};

export const MONEY_MAP_NODE_COLORS: Record<MoneyMapNodeType, string> = {
  INCOME: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
  CONVERSION: "border-sky-400 bg-sky-50 dark:bg-sky-950/30",
  TAX_PJ: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",
  PJ_TO_PF: "border-teal-500 bg-teal-50 dark:bg-teal-950/40",
  MAX: "border-violet-500 bg-violet-50 dark:bg-violet-950/40",
  MIN: "border-violet-400 bg-violet-50 dark:bg-violet-950/30",
  SUM: "border-violet-600 bg-violet-50 dark:bg-violet-950/40",
  EXPENSE: "border-rose-400 bg-rose-50 dark:bg-rose-950/30",
  INVESTMENT: "border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40",
  SPLIT: "border-zinc-500 bg-zinc-50 dark:bg-zinc-900/40",
  INTEREST: "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40",
  TIME: "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
};

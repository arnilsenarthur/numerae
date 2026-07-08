export type MarketAssetKind =
  | "STOCK"
  | "ETF"
  | "FII"
  | "CRYPTO"
  | "INDEX"
  | "COMMODITY";

export type SerializedMarketAsset = {
  id: string;
  symbol: string;
  name: string;
  kind: MarketAssetKind;
  exchange: string | null;
  currencyCode: string;
  countryCode: string | null;
  logoUrl: string | null;
  active: boolean;
  price: number | null;
  priceUpdatedAt: string | null;
  priceTtlSeconds: number;
  changePercent: number | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedMarketQuote = {
  id: string;
  assetId: string;
  price: number;
  quotedAt: string;
};

export const MARKET_ASSET_KIND_LABELS: Record<MarketAssetKind, string> = {
  STOCK: "Ação",
  ETF: "ETF",
  FII: "FII",
  CRYPTO: "Cripto",
  INDEX: "Índice",
  COMMODITY: "Commodity",
};

export type RiskProfile = "conservative" | "moderate" | "aggressive";

export const RISK_PROFILES: {
  value: RiskProfile;
  label: string;
  description: string;
  annualRatePercent: number;
}[] = [
  {
    value: "conservative",
    label: "Conservador",
    description: "Renda fixa, CDI/Tesouro — menor risco, retorno estável.",
    annualRatePercent: 10,
  },
  {
    value: "moderate",
    label: "Moderado",
    description: "Misto renda fixa + ações/ETFs — equilíbrio risco-retorno.",
    annualRatePercent: 13,
  },
  {
    value: "aggressive",
    label: "Arrojado",
    description: "Maior parte em ações, ETFs e cripto — alto risco e potencial.",
    annualRatePercent: 16,
  },
];

export function riskProfileMeta(value: string) {
  return RISK_PROFILES.find((item) => item.value === value) ?? RISK_PROFILES[1]!;
}

export type InvestmentEntryKind = "DEPOSIT" | "WITHDRAWAL" | "BALANCE_UPDATE";

export const INVESTMENT_ENTRY_KIND_LABELS: Record<InvestmentEntryKind, string> = {
  DEPOSIT: "Aporte",
  WITHDRAWAL: "Retirada",
  BALANCE_UPDATE: "Atualização de saldo",
};

export const INVESTMENT_CATEGORY_OPTIONS = [
  { value: "FIXED_INCOME", label: "Renda fixa" },
  { value: "STOCK_BR", label: "Ações BR (B3)" },
  { value: "STOCK_US", label: "Ações EUA" },
  { value: "ETF", label: "ETF" },
  { value: "FII", label: "FII" },
  { value: "CRYPTO", label: "Cripto" },
  { value: "OTHER", label: "Outro" },
];

export const INVESTMENT_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  INVESTMENT_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

/** Tailwind stroke class for DonutChart segments */
export const INVESTMENT_CATEGORY_STROKE: Record<string, string> = {
  FIXED_INCOME: "stroke-emerald-500",
  STOCK_BR: "stroke-sky-500",
  STOCK_US: "stroke-blue-500",
  ETF: "stroke-violet-500",
  FII: "stroke-amber-500",
  CRYPTO: "stroke-rose-500",
  OTHER: "stroke-zinc-400",
};

/** Hex colors for inline styles (legend dots, etc.) */
export const INVESTMENT_CATEGORY_COLOR_HEX: Record<string, string> = {
  FIXED_INCOME: "#10b981",
  STOCK_BR: "#0ea5e9",
  STOCK_US: "#3b82f6",
  ETF: "#8b5cf6",
  FII: "#f59e0b",
  CRYPTO: "#f43f5e",
  OTHER: "#a1a1aa",
};

export type SerializedInvestmentEntry = {
  id: string;
  positionId: string;
  kind: InvestmentEntryKind;
  amount: number;
  balance: number | null;
  date: string;
  notes: string | null;
  createdAt: string;
};

export type SerializedInvestmentPosition = {
  id: string;
  userId: string;
  name: string;
  assetSymbol: string | null;
  category: string;
  currencyCode: string;
  institution: string | null;
  color: string | null;
  currentBalance: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  entries: SerializedInvestmentEntry[];
  totalDeposited: number;
  totalWithdrawn: number;
  /** null quando não há aportes registrados (não dá para calcular rendimento) */
  profit: number | null;
  profitPercent: number | null;
};

export type SerializedInvestmentPlan = {
  id: string;
  name: string;
  currencyCode: string;
  initialAmount: number;
  monthlyDeposit: number;
  horizonMonths: number;
  riskProfile: string;
  targetAmount: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

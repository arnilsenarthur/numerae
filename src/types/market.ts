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

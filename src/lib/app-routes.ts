/** English URL slugs for app sections (labels stay in Portuguese in the UI). */

import type { MarketAssetKind } from "@/types/market";

export const FINANCE_TABS = {
  overview: "overview",
  transactions: "transactions",
  recurring: "recurring",
  accounts: "accounts",
  goals: "goals",
} as const;

export type FinanceTabSlug = (typeof FINANCE_TABS)[keyof typeof FINANCE_TABS];

export const INVESTMENT_TABS = {
  positions: "positions",
  allocation: "allocation",
  projection: "projection",
} as const;

export type InvestmentTabSlug = (typeof INVESTMENT_TABS)[keyof typeof INVESTMENT_TABS];

export const MARKET_BASE = "/market" as const;

/** URL segment per asset kind — ex.: /market/share/AAPL */
export const MARKET_KIND_SLUGS = {
  STOCK: "share",
  ETF: "etf",
  FII: "fii",
  CRYPTO: "crypto",
  INDEX: "indices",
  COMMODITY: "commodity",
} as const;

export type MarketKindSlug = (typeof MARKET_KIND_SLUGS)[MarketAssetKind];

export const MARKET_KIND_SLUG_TO_KIND: Record<MarketKindSlug, MarketAssetKind> = {
  share: "STOCK",
  etf: "ETF",
  fii: "FII",
  crypto: "CRYPTO",
  indices: "INDEX",
  commodity: "COMMODITY",
};

export const MARKET_KIND_NAV: { slug: MarketKindSlug; label: string }[] = [
  { slug: "share", label: "Ações" },
  { slug: "etf", label: "ETF" },
  { slug: "fii", label: "FII" },
  { slug: "crypto", label: "Cripto" },
  { slug: "indices", label: "Índices" },
  { slug: "commodity", label: "Commodity" },
];

export const MARKET_DEFAULT_KIND_SLUG: MarketKindSlug = "share";

export function isMarketKindSlug(value: string): value is MarketKindSlug {
  return value in MARKET_KIND_SLUG_TO_KIND;
}

export function marketKindSlugForAsset(kind: MarketAssetKind): MarketKindSlug {
  return MARKET_KIND_SLUGS[kind];
}

export function marketKindPath(kind: MarketKindSlug = MARKET_DEFAULT_KIND_SLUG) {
  return `${MARKET_BASE}/${kind}`;
}

export function marketAssetPath(kind: MarketKindSlug, symbol: string) {
  return `${MARKET_BASE}/${kind}/${encodeURIComponent(symbol.toUpperCase())}`;
}

export const FINANCE_LEDGER_TABS = {
  history: "transactions",
  recurring: "recurring",
} as const;

export type FinanceLedgerTabSlug =
  (typeof FINANCE_LEDGER_TABS)[keyof typeof FINANCE_LEDGER_TABS];

export const FINANCE_LEDGER_TAB_LABELS: Record<FinanceLedgerTabSlug, string> = {
  transactions: "Lançamentos",
  recurring: "Recorrentes",
};

export const CALCULATOR_TABS = {
  exchange: "exchange",
  taxes: "taxes",
  salary: "salary",
  loan: "loan",
  fire: "fire",
} as const;

export type CalculatorTabSlug = (typeof CALCULATOR_TABS)[keyof typeof CALCULATOR_TABS];

const FINANCE_LEGACY: Record<string, FinanceTabSlug> = {
  resumo: "overview",
  lancamentos: "transactions",
  recorrentes: "recurring",
  contas: "accounts",
  metas: "goals",
};

const INVESTMENT_LEGACY: Record<string, InvestmentTabSlug> = {
  posicoes: "positions",
  alocacao: "allocation",
  projecao: "projection",
};

const CALCULATOR_LEGACY: Record<string, CalculatorTabSlug> = {
  cambio: "exchange",
  impostos: "taxes",
  salario: "salary",
  financiamento: "loan",
  independencia: "fire",
};

const SECTION_LEGACY: Record<string, Record<string, string>> = {
  finance: FINANCE_LEGACY,
  investments: INVESTMENT_LEGACY,
  calculator: CALCULATOR_LEGACY,
};

/** Map a tab slug (legacy PT or current EN) to the canonical English slug. */
export function resolveTabSlug(section: keyof typeof SECTION_LEGACY, slug: string): string {
  const legacy = SECTION_LEGACY[section];
  return legacy[slug] ?? slug;
}

/** Redirect legacy Portuguese tab URLs to English slugs. Returns null if no redirect needed. */
export function legacyTabRedirectPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const [section, tab, ...rest] = parts;

  // /finance/recurring e /finance/recorrentes — rota própria (não query em transactions)
  if (
    section === "finance" &&
    (tab === "recurring" || tab === "recorrentes")
  ) {
    return "/finance/recurring";
  }

  // Mercado saiu de /investments — redireciona para /market
  if (
    section === "investments" &&
    (tab === "market" || tab === "mercado")
  ) {
    const suffix = rest.length > 0 ? `/${rest.join("/")}` : "";
    return `${MARKET_BASE}${suffix}`;
  }

  const legacy = SECTION_LEGACY[section];
  if (!legacy?.[tab]) return null;

  const nextTab = legacy[tab];
  const suffix = rest.length > 0 ? `/${rest.join("/")}` : "";
  return `/${section}/${nextTab}${suffix}`;
}

export const FINANCE_TAB_LABELS: Record<FinanceTabSlug, string> = {
  overview: "Resumo",
  transactions: "Lançamentos",
  recurring: "Recorrentes",
  accounts: "Contas",
  goals: "Metas",
};

export const INVESTMENT_TAB_LABELS: Record<InvestmentTabSlug, string> = {
  positions: "Minhas posições",
  allocation: "Alocação sugerida",
  projection: "Projeção",
};

export const CALCULATOR_TAB_LABELS: Record<CalculatorTabSlug, string> = {
  exchange: "Câmbio",
  taxes: "Impostos PJ",
  salary: "Salário exterior",
  loan: "Financiamento",
  fire: "Independência FIRE",
};

export const FINANCE_DEFAULT_TAB: FinanceTabSlug = "overview";
export const INVESTMENT_DEFAULT_TAB: InvestmentTabSlug = "positions";
export const CALCULATOR_DEFAULT_TAB: CalculatorTabSlug = "exchange";

export function financeTabPath(tab: FinanceTabSlug = FINANCE_DEFAULT_TAB) {
  return `/finance/${tab}`;
}

export function financeLedgerTabPath(tab: FinanceLedgerTabSlug = FINANCE_LEDGER_TABS.history) {
  return `/finance/${tab}`;
}

export function investmentTabPath(tab: InvestmentTabSlug = INVESTMENT_DEFAULT_TAB) {
  return `/investments/${tab}`;
}

export function investmentPositionPath(positionId: string) {
  return `/investments/positions/${positionId}`;
}

export function calculatorTabPath(tab: CalculatorTabSlug = CALCULATOR_DEFAULT_TAB) {
  return `/calculator/${tab}`;
}

/** @deprecated Use marketKindPath() or marketAssetPath() */
export function marketPath(symbol?: string) {
  if (!symbol) return marketKindPath();
  return `${MARKET_BASE}/${encodeURIComponent(symbol)}`;
}

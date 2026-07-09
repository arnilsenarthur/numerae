import {
  CALCULATOR_TAB_LABELS,
  CALCULATOR_TABS,
  FINANCE_LEDGER_TAB_LABELS,
  FINANCE_LEDGER_TABS,
  FINANCE_TAB_LABELS,
  INVESTMENT_TAB_LABELS,
  INVESTMENT_TABS,
  MARKET_DEFAULT_KIND_SLUG,
  MARKET_KIND_NAV,
  calculatorTabPath,
  financeLedgerTabPath,
  financeTabPath,
  investmentTabPath,
  marketKindPath,
  type CalculatorTabSlug,
  type FinanceLedgerTabSlug,
  type FinanceTabSlug,
  type InvestmentTabSlug,
  type MarketKindSlug,
} from "@/lib/app-routes";
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs";

export const SECTION_LABELS = {
  cadastros: "Cadastros",
  financas: "Finanças",
} as const;

const financesCrumb: BreadcrumbItem = {
  label: SECTION_LABELS.financas,
  href: financeTabPath("overview"),
};

const cadastrosCrumb: BreadcrumbItem = {
  label: SECTION_LABELS.cadastros,
  href: "/companies",
};

export type PageHeaderMeta = {
  kicker: string;
  title: string;
  subtitle: string;
  breadcrumbs?: BreadcrumbItem[];
};

const financeSubtitles: Record<FinanceTabSlug, string> = {
  overview:
    "Saldos consolidados, gastos por categoria e evolução das suas contas no período.",
  transactions: "Registre entradas e saídas e consulte o histórico completo.",
  recurring: "Configure salários, assinaturas e outras movimentações automáticas.",
  accounts:
    "Bancos, carteiras e instituições em qualquer moeda — base para saldos e lançamentos.",
  goals: "Defina objetivos financeiros e acompanhe o progresso até cada meta.",
};

const ledgerSubtitles: Record<FinanceLedgerTabSlug, string> = {
  transactions: financeSubtitles.transactions,
  recurring: financeSubtitles.recurring,
};

export function financePageHeader(tab: FinanceTabSlug): PageHeaderMeta {
  const isLedger = tab === "transactions" || tab === "recurring";

  if (tab === "accounts") {
    return {
      kicker: SECTION_LABELS.cadastros,
      title: FINANCE_TAB_LABELS.accounts,
      subtitle: financeSubtitles.accounts,
      breadcrumbs: [cadastrosCrumb, { label: FINANCE_TAB_LABELS.accounts }],
    };
  }

  if (isLedger) {
    const title = FINANCE_LEDGER_TAB_LABELS[tab];
    return {
      kicker: SECTION_LABELS.financas,
      title,
      subtitle: ledgerSubtitles[tab],
      breadcrumbs: [
        financesCrumb,
        {
          label: FINANCE_TAB_LABELS.transactions,
          href: financeLedgerTabPath(FINANCE_LEDGER_TABS.history),
        },
        { label: title },
      ],
    };
  }

  return {
    kicker: SECTION_LABELS.financas,
    title: FINANCE_TAB_LABELS[tab],
    subtitle: financeSubtitles[tab],
    breadcrumbs: [
      financesCrumb,
      { label: FINANCE_TAB_LABELS[tab], href: financeTabPath(tab) },
    ],
  };
}

const investmentSubtitles: Record<InvestmentTabSlug, string> = {
  positions:
    "Registre posições reais, acompanhe aportes e veja o rendimento de cada investimento.",
  allocation:
    "Distribuição sugerida por perfil de risco, com metas mensais e indicação de ativos.",
  projection:
    "Simule o crescimento da carteira com aportes recorrentes e retorno esperado.",
};

export function investmentPageHeader(tab: InvestmentTabSlug): PageHeaderMeta {
  const title =
    tab === "positions" ? "Investimentos" : INVESTMENT_TAB_LABELS[tab];

  return {
    kicker: SECTION_LABELS.financas,
    title,
    subtitle: investmentSubtitles[tab],
    breadcrumbs: [
      financesCrumb,
      { label: title, href: investmentTabPath(tab) },
    ],
  };
}

export function investmentPositionPageHeader(positionName: string): PageHeaderMeta {
  return {
    kicker: SECTION_LABELS.financas,
    title: positionName,
    subtitle:
      "Aportes, retiradas, rendimento e histórico desta posição no seu portfólio.",
    breadcrumbs: [
      financesCrumb,
      { label: "Investimentos", href: investmentTabPath(INVESTMENT_TABS.positions) },
      { label: positionName },
    ],
  };
}

const calculatorSubtitles: Record<CalculatorTabSlug, string> = {
  exchange:
    "Converta moedas com taxas atualizadas e compare custos entre instituições.",
  taxes:
    "Compare MEI, Simples (Anexo III/V) e Lucro Presumido, com otimização de Fator R.",
  salary:
    "Encontre a melhor forma de receber PJ do exterior, com câmbio, IOF e imposto.",
  loan: "Simule SAC e Price: parcelas, juros totais e saldo devedor ao longo do tempo.",
  fire: "Calcule quanto acumular para independência financeira pela regra dos 25×.",
};

export const calculatorHomePageHeader: PageHeaderMeta = {
  kicker: SECTION_LABELS.financas,
  title: "Calculadoras",
  subtitle: "Câmbio, impostos, salário exterior, financiamento e independência financeira.",
  breadcrumbs: [financesCrumb, { label: "Calculadoras" }],
};

export function calculatorPageHeader(tab: CalculatorTabSlug): PageHeaderMeta {
  const title = CALCULATOR_TAB_LABELS[tab];

  return {
    kicker: SECTION_LABELS.financas,
    title,
    subtitle: calculatorSubtitles[tab],
    breadcrumbs: [
      financesCrumb,
      { label: "Calculadoras", href: "/calculator" },
      { label: title, href: calculatorTabPath(tab) },
    ],
  };
}

export const companiesPageHeader: PageHeaderMeta = {
  kicker: SECTION_LABELS.cadastros,
  title: "Empresas",
  subtitle:
    "Cadastre CNPJ, EIN, VAT e demais dados fiscais para impostos, PJ e simulações.",
  breadcrumbs: [cadastrosCrumb, { label: "Empresas" }],
};

const marketKindSubtitles: Record<MarketKindSlug, string> = {
  share: "Ações listadas em bolsas do mundo — cotações e histórico.",
  etf: "Fundos negociados em bolsa com diversificação por cesta de ativos.",
  fii: "Fundos imobiliários listados na B3 e acompanhamento de dividendos.",
  crypto: "Criptomoedas e tokens com preço em tempo quase real.",
  indices: "Índices de referência de mercado e benchmarks.",
  commodity: "Commodities e ativos físicos negociados em bolsa.",
};

export function marketPageHeader(
  kindSlug: MarketKindSlug,
  assetSymbol?: string | null,
): PageHeaderMeta {
  const kindLabel =
    MARKET_KIND_NAV.find((item) => item.slug === kindSlug)?.label ?? "Mercado";

  if (assetSymbol) {
    return {
      kicker: SECTION_LABELS.financas,
      title: assetSymbol.toUpperCase(),
      subtitle: `Detalhes, cotação e histórico de ${assetSymbol.toUpperCase()}.`,
      breadcrumbs: [
        financesCrumb,
        { label: "Mercado", href: marketKindPath(MARKET_DEFAULT_KIND_SLUG) },
        { label: kindLabel, href: marketKindPath(kindSlug) },
        { label: assetSymbol.toUpperCase() },
      ],
    };
  }

  return {
    kicker: SECTION_LABELS.financas,
    title: kindLabel,
    subtitle: marketKindSubtitles[kindSlug],
    breadcrumbs: [
      financesCrumb,
      { label: "Mercado", href: marketKindPath(MARKET_DEFAULT_KIND_SLUG) },
      { label: kindLabel, href: marketKindPath(kindSlug) },
    ],
  };
}

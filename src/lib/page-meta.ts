import {
  CALCULATOR_TABS,
  FINANCE_LEDGER_TABS,
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
import type { TranslateFn } from "@/i18n/translate";

export type PageHeaderMeta = {
  kicker: string;
  title: string;
  subtitle: string;
  breadcrumbs?: BreadcrumbItem[];
};

function financesCrumb(t: TranslateFn): BreadcrumbItem {
  return {
    label: t("section.group.finance"),
    href: financeTabPath("overview"),
  };
}

function cadastrosCrumb(t: TranslateFn): BreadcrumbItem {
  return {
    label: t("section.group.registrations"),
    href: "/companies",
  };
}

export function financePageHeader(tab: FinanceTabSlug, t: TranslateFn): PageHeaderMeta {
  const isLedger =
    tab === "transactions" || tab === "recurring" || tab === "subscriptions";

  if (tab === "budgets" || tab === "reports") {
    return {
      kicker: t("section.group.finance"),
      title: t(`section.finance.${tab}.title`),
      subtitle: t(`section.finance.${tab}.subtitle`),
      breadcrumbs: [
        financesCrumb(t),
        { label: t(`section.finance.${tab}.title`), href: financeTabPath(tab) },
      ],
    };
  }

  if (tab === "accounts") {
    return {
      kicker: t("section.group.registrations"),
      title: t("section.finance.accounts.title"),
      subtitle: t("section.finance.accounts.subtitle"),
      breadcrumbs: [cadastrosCrumb(t), { label: t("section.finance.accounts.title") }],
    };
  }

  if (isLedger) {
    const title = t(`section.finance.${tab}.title`);
    return {
      kicker: t("section.group.finance"),
      title,
      subtitle: t(`section.finance.${tab}.subtitle`),
      breadcrumbs: [
        financesCrumb(t),
        {
          label: t("section.finance.transactions.title"),
          href: financeLedgerTabPath(FINANCE_LEDGER_TABS.history),
        },
        { label: title },
      ],
    };
  }

  return {
    kicker: t("section.group.finance"),
    title: t(`section.finance.${tab}.title`),
    subtitle: t(`section.finance.${tab}.subtitle`),
    breadcrumbs: [
      financesCrumb(t),
      { label: t(`section.finance.${tab}.title`), href: financeTabPath(tab) },
    ],
  };
}

export function investmentPageHeader(tab: InvestmentTabSlug, t: TranslateFn): PageHeaderMeta {
  const title = t(`section.investments.${tab}.title`);

  return {
    kicker: t("section.group.finance"),
    title,
    subtitle: t(`section.investments.${tab}.subtitle`),
    breadcrumbs: [financesCrumb(t), { label: title, href: investmentTabPath(tab) }],
  };
}

export function investmentPositionPageHeader(positionName: string, t: TranslateFn): PageHeaderMeta {
  return {
    kicker: t("section.group.finance"),
    title: positionName,
    subtitle: t("section.investments.positionDetail.subtitle"),
    breadcrumbs: [
      financesCrumb(t),
      {
        label: t("section.investments.positions.title"),
        href: investmentTabPath(INVESTMENT_TABS.positions),
      },
      { label: positionName },
    ],
  };
}

export function calculatorHomePageHeader(t: TranslateFn): PageHeaderMeta {
  return {
    kicker: t("section.group.finance"),
    title: t("section.calculator.home.title"),
    subtitle: t("section.calculator.home.subtitle"),
    breadcrumbs: [financesCrumb(t), { label: t("section.calculator.home.title") }],
  };
}

export function calculatorPageHeader(tab: CalculatorTabSlug, t: TranslateFn): PageHeaderMeta {
  const title = t(`section.calculator.${tab}.title`);

  return {
    kicker: t("section.group.finance"),
    title,
    subtitle: t(`section.calculator.${tab}.subtitle`),
    breadcrumbs: [
      financesCrumb(t),
      { label: t("section.calculator.home.title"), href: "/calculator" },
      { label: title, href: calculatorTabPath(tab) },
    ],
  };
}

export function companiesPageHeader(t: TranslateFn): PageHeaderMeta {
  return {
    kicker: t("section.group.registrations"),
    title: t("section.companies.title"),
    subtitle: t("section.companies.subtitle"),
    breadcrumbs: [cadastrosCrumb(t), { label: t("section.companies.title") }],
  };
}

export function marketPageHeader(
  kindSlug: MarketKindSlug,
  t: TranslateFn,
  assetSymbol?: string | null,
): PageHeaderMeta {
  const kindLabel = t(`section.market.kind.${kindSlug}`);

  if (assetSymbol) {
    const symbol = assetSymbol.toUpperCase();
    return {
      kicker: t("section.group.finance"),
      title: symbol,
      subtitle: t("section.market.assetDetail", { symbol }),
      breadcrumbs: [
        financesCrumb(t),
        { label: t("section.market.title"), href: marketKindPath(MARKET_DEFAULT_KIND_SLUG) },
        { label: kindLabel, href: marketKindPath(kindSlug) },
        { label: symbol },
      ],
    };
  }

  return {
    kicker: t("section.group.finance"),
    title: kindLabel,
    subtitle: t(`section.market.kindSubtitle.${kindSlug}`),
    breadcrumbs: [
      financesCrumb(t),
      { label: t("section.market.title"), href: marketKindPath(MARKET_DEFAULT_KIND_SLUG) },
      { label: kindLabel, href: marketKindPath(kindSlug) },
    ],
  };
}
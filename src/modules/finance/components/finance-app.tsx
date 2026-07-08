"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FinanceOverviewSkeleton,
  GoalListSkeleton,
  TableRowsSkeleton,
  CardGridSkeleton,
} from "@/components/ui/panel-skeleton";
import { FinanceAccounts } from "@/modules/finance/components/finance-accounts";
import { FinanceGoals } from "@/modules/finance/components/finance-goals";
import { FinanceOverview } from "@/modules/finance/components/finance-overview";
import { FinanceRecurring } from "@/modules/finance/components/finance-recurring";
import { FinanceTransactions } from "@/modules/finance/components/finance-transactions";
import { useFinanceData } from "@/modules/finance/hooks/use-finance-data";
import { useCatalog } from "@/hooks/use-catalog";
import { useUrlTab } from "@/hooks/use-url-tab";
import {
  FINANCE_DEFAULT_TAB,
  FINANCE_LEDGER_TAB_LABELS,
  FINANCE_LEDGER_TABS,
  FINANCE_TABS,
  type FinanceLedgerTabSlug,
  type FinanceTabSlug,
} from "@/lib/app-routes";
import { financePageHeader } from "@/lib/page-meta";

type FinanceTab = FinanceTabSlug;

const VALID_TABS = Object.values(FINANCE_TABS) as FinanceTab[];
const LEDGER_TABS = Object.values(FINANCE_LEDGER_TABS) as FinanceLedgerTabSlug[];

type PeriodPreset = "month" | "3months" | "year" | "all";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "month", label: "Este mês" },
  { value: "3months", label: "Últimos 3 meses" },
  { value: "year", label: "Este ano" },
  { value: "all", label: "Tudo" },
];

function periodRange(preset: PeriodPreset): { from: string | null; to: string | null } {
  const now = new Date();
  switch (preset) {
    case "month":
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString(),
        to: null,
      };
    case "3months":
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2, 1)).toISOString(),
        to: null,
      };
    case "year":
      return {
        from: new Date(Date.UTC(now.getFullYear(), 0, 1)).toISOString(),
        to: null,
      };
    case "all":
      return { from: null, to: null };
  }
}

export function FinanceApp({ initialTab }: { initialTab?: string | null }) {
  const [tab, setTab] = useUrlTab<FinanceTab>({
    basePath: "/finance",
    validTabs: VALID_TABS,
    defaultTab: FINANCE_DEFAULT_TAB,
    initialTab,
  });
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const catalog = useCatalog();
  const currentRange = useMemo(() => periodRange(preset), [preset]);
  const finance = useFinanceData(currentRange);

  const availableCurrencies = useMemo(() => {
    const seen = new Set<string>();
    const list: { value: string; label: string }[] = [];
    for (const acc of finance.accounts) {
      if (!seen.has(acc.currencyCode)) {
        seen.add(acc.currencyCode);
        list.push({ value: acc.currencyCode, label: acc.currencyCode });
      }
    }
    return list;
  }, [finance.accounts]);

  const displayCurrency = useMemo(() => {
    if (selectedCurrency && availableCurrencies.some((c) => c.value === selectedCurrency)) {
      return selectedCurrency;
    }
    if (finance.summary && finance.summary.totals.length > 0) {
      return [...finance.summary.totals].sort(
        (a, b) => b.income + b.expense - (a.income + a.expense),
      )[0]!.currencyCode;
    }
    return finance.accounts[0]?.currencyCode ?? "BRL";
  }, [selectedCurrency, availableCurrencies, finance.summary, finance.accounts]);

  const initialLoading = finance.loading && finance.accounts.length === 0;
  const isLedgerTab = tab === "transactions" || tab === "recurring";
  const page = financePageHeader(tab);

  function financeTabSkeleton() {
    switch (tab) {
      case "transactions":
      case "recurring":
        return <TableRowsSkeleton rows={8} />;
      case "goals":
        return <GoalListSkeleton />;
      case "accounts":
        return <CardGridSkeleton count={3} columns="sm:grid-cols-2 lg:grid-cols-3" />;
      default:
        return <FinanceOverviewSkeleton />;
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <PageHeader
        meta={page}
        actions={
          tab === "overview" ? (
            <div className="flex flex-wrap items-center gap-2">
              {availableCurrencies.length > 1 ? (
                <div className="w-28">
                  <Select
                    options={availableCurrencies}
                    value={displayCurrency}
                    onChange={(value) => setSelectedCurrency(value)}
                    size="sm"
                  />
                </div>
              ) : null}
              <div className="w-44">
                <Select
                  options={PERIOD_OPTIONS}
                  value={preset}
                  onChange={(value) => setPreset(value as PeriodPreset)}
                />
              </div>
            </div>
          ) : undefined
        }
      />

      {isLedgerTab ? (
        <Tabs
          key={tab}
          defaultValue={tab}
          onValueChange={(value) => setTab(value as FinanceTab)}
        >
          <TabsList className="h-auto flex-wrap gap-1 bg-zinc-50 p-1 dark:bg-zinc-900/50">
            {LEDGER_TABS.map((id) => (
              <TabsTrigger key={id} value={id} className="text-xs">
                {FINANCE_LEDGER_TAB_LABELS[id]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      ) : null}

      {finance.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {finance.error}
        </div>
      ) : null}

      {initialLoading ? (
        financeTabSkeleton()
      ) : tab === "overview" ? (
        <FinanceOverview
          summary={finance.summary}
          accounts={finance.accounts}
          currency={displayCurrency}
        />
      ) : tab === "transactions" ? (
        <FinanceTransactions
          transactions={finance.transactions}
          accounts={finance.accounts}
          onChanged={() => void finance.reload()}
        />
      ) : tab === "recurring" ? (
        <FinanceRecurring accounts={finance.accounts} onChanged={() => void finance.reload()} />
      ) : tab === "accounts" ? (
        <FinanceAccounts
          accounts={finance.accounts}
          catalog={catalog}
          onChanged={() => void finance.reload()}
        />
      ) : (
        <FinanceGoals />
      )}
    </div>
  );
}

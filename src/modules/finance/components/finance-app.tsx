"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
import { IconPlus } from "@/components/ui/icons";
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
  { value: "month", label: "Mês" },
  { value: "3months", label: "3 meses" },
  { value: "year", label: "Ano" },
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

  // Count for recurring (fetches own data internally)
  const [recurringCount, setRecurringCount] = useState<number | null>(null);

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
  const noAccounts = finance.accounts.length === 0;

  // Trigger counters — increment to open create modal in the tab component
  const [accountCreateSeq, setAccountCreateSeq] = useState(0);
  const [goalsCreateSeq, setGoalsCreateSeq] = useState(0);
  const [txCreateTrigger, setTxCreateTrigger] = useState<{
    seq: number;
    kind: "INCOME" | "EXPENSE" | "TRANSFER";
  } | null>(null);
  const [recCreateTrigger, setRecCreateTrigger] = useState<{
    seq: number;
    kind: "INCOME" | "EXPENSE";
  } | null>(null);

  function countText(): string | null {
    switch (tab) {
      case "accounts": {
        const n = finance.accounts.length;
        return initialLoading ? null : `${n} conta${n !== 1 ? "s" : ""}`;
      }
      case "transactions": {
        const n = finance.transactions.length;
        return initialLoading ? null : `${n} lançamento${n !== 1 ? "s" : ""}`;
      }
      case "recurring":
        return recurringCount === null ? null : `${recurringCount} recorrência${recurringCount !== 1 ? "s" : ""}`;
      // goals manages its own count+toggle inside the component
      default:
        return null;
    }
  }

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

  function tabToolbar() {
    if (tab === "accounts") {
      return (
        <Button type="button" size="sm" onClick={() => setAccountCreateSeq((s) => s + 1)}>
          <IconPlus size="sm" /> Nova conta
        </Button>
      );
    }
    if (tab === "goals") {
      return (
        <Button type="button" size="sm" onClick={() => setGoalsCreateSeq((s) => s + 1)}>
          <IconPlus size="sm" /> Nova meta
        </Button>
      );
    }
    if (tab === "transactions") {
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={noAccounts}
            onClick={() => setTxCreateTrigger((t) => ({ seq: (t?.seq ?? 0) + 1, kind: "INCOME" }))}
          >
            <IconPlus size="sm" /> Entrada
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={noAccounts}
            onClick={() => setTxCreateTrigger((t) => ({ seq: (t?.seq ?? 0) + 1, kind: "EXPENSE" }))}
          >
            <IconPlus size="sm" /> Saída
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={noAccounts || finance.accounts.length < 2}
            onClick={() =>
              setTxCreateTrigger((t) => ({ seq: (t?.seq ?? 0) + 1, kind: "TRANSFER" }))
            }
          >
            <IconPlus size="sm" /> Transferência
          </Button>
        </div>
      );
    }
    if (tab === "recurring") {
      return (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={noAccounts}
            onClick={() =>
              setRecCreateTrigger((t) => ({ seq: (t?.seq ?? 0) + 1, kind: "INCOME" }))
            }
          >
            <IconPlus size="sm" /> Entrada recorrente
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={noAccounts}
            onClick={() =>
              setRecCreateTrigger((t) => ({ seq: (t?.seq ?? 0) + 1, kind: "EXPENSE" }))
            }
          >
            <IconPlus size="sm" /> Saída recorrente
          </Button>
        </div>
      );
    }
    return null;
  }

  const toolbar = tabToolbar();
  const label = countText();

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader meta={page} />

      {isLedgerTab ? (
        <Tabs
          key={tab}
          defaultValue={tab}
          onValueChange={(value) => setTab(value as FinanceTab)}
        >
          <TabsList>
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

      {/* Toolbar: always visible below tabs, before skeleton/content */}
      {tab === "overview" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ButtonGroup>
            {PERIOD_OPTIONS.map((opt) => (
              <ButtonGroupItem
                key={opt.value}
                active={preset === opt.value}
                onClick={() => setPreset(opt.value)}
              >
                {opt.label}
              </ButtonGroupItem>
            ))}
          </ButtonGroup>
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
        </div>
      ) : toolbar ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">{label ?? "\u00a0"}</p>
          {toolbar}
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
          openCreateTrigger={txCreateTrigger}
        />
      ) : tab === "recurring" ? (
        <FinanceRecurring
          accounts={finance.accounts}
          onChanged={() => void finance.reload()}
          openCreateTrigger={recCreateTrigger}
          onCountChange={setRecurringCount}
        />
      ) : tab === "accounts" ? (
        <FinanceAccounts
          accounts={finance.accounts}
          catalog={catalog}
          onChanged={() => void finance.reload()}
          openCreateSeq={accountCreateSeq}
        />
      ) : (
        <FinanceGoals openCreateSeq={goalsCreateSeq} />
      )}
    </div>
  );
}

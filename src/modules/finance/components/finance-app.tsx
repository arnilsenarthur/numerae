"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
import { IconPlus, IconDownload } from "@/components/ui/icons";
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
import { FinanceBudgets } from "@/modules/finance/components/finance-budgets";
import { FinanceGoals } from "@/modules/finance/components/finance-goals";
import { FinanceOverview } from "@/modules/finance/components/finance-overview";
import { FinanceRecurring } from "@/modules/finance/components/finance-recurring";
import { FinanceReports } from "@/modules/finance/components/finance-reports";
import { FinanceSubscriptions } from "@/modules/finance/components/finance-subscriptions";
import { FinanceTransactions } from "@/modules/finance/components/finance-transactions";
import { ImportModal } from "@/modules/finance/components/import-modal";
import { useFinanceData } from "@/modules/finance/hooks/use-finance-data";
import { useUrlTab } from "@/hooks/use-url-tab";
import { useUrlQueryEnum, useUrlQueryPatch } from "@/hooks/use-url-query-state";
import { useSearchParams } from "next/navigation";
import { resolveDefaultAccountId } from "@/types/finance";
import {
  FINANCE_DEFAULT_PERIOD,
  FINANCE_PERIOD_CODES,
  financePeriodRange,
  normalizeFinancePeriod,
  periodLabelKey,
  type FinancePeriod,
} from "@/lib/finance-period";
import {
  FINANCE_DEFAULT_TAB,
  FINANCE_LEDGER_TABS,
  FINANCE_TABS,
  type FinanceLedgerTabSlug,
  type FinanceTabSlug,
} from "@/lib/app-routes";
import { financePageHeader } from "@/lib/page-meta";
import { useT } from "@/i18n/locale-provider";

type FinanceTab = FinanceTabSlug;

const VALID_TABS = Object.values(FINANCE_TABS) as FinanceTab[];
const LEDGER_TABS = Object.values(FINANCE_LEDGER_TABS) as FinanceLedgerTabSlug[];

export function FinanceApp({ initialTab }: { initialTab?: string | null }) {
  const t = useT();
  const [tab, setTab] = useUrlTab<FinanceTab>({
    basePath: "/finance",
    validTabs: VALID_TABS,
    defaultTab: FINANCE_DEFAULT_TAB,
    initialTab,
  });
  const [preset, setPreset] = useUrlQueryEnum<FinancePeriod>({
    key: "period",
    validValues: ["M", "3M", "Y", "all"] as const,
    defaultValue: FINANCE_DEFAULT_PERIOD,
    normalize: (raw) => normalizeFinancePeriod(raw, FINANCE_DEFAULT_PERIOD),
  });
  const searchParams = useSearchParams();
  const patchQuery = useUrlQueryPatch();
  const currentRange = useMemo(() => financePeriodRange(preset), [preset]);
  const finance = useFinanceData(currentRange);

  // Count for recurring (fetches own data internally)
  const [recurringCount, setRecurringCount] = useState<number | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

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

  const urlCurrency = searchParams.get("currency");
  const selectedCurrency =
    urlCurrency && availableCurrencies.some((c) => c.value === urlCurrency)
      ? urlCurrency
      : null;

  function setSelectedCurrency(value: string | null) {
    patchQuery({ currency: value });
  }

  const displayCurrency = useMemo(() => {
    if (selectedCurrency && availableCurrencies.some((c) => c.value === selectedCurrency)) {
      return selectedCurrency;
    }
    if (finance.summary && finance.summary.totals.length > 0) {
      return [...finance.summary.totals].sort(
        (a, b) => b.income + b.expense - (a.income + a.expense),
      )[0]!.currencyCode;
    }
    const defaultAccount = finance.accounts.find(
      (account) => account.id === resolveDefaultAccountId(finance.accounts),
    );
    return defaultAccount?.currencyCode ?? "BRL";
  }, [selectedCurrency, availableCurrencies, finance.summary, finance.accounts]);

  const initialLoading = finance.loading && finance.accounts.length === 0;
  const isLedgerTab =
    tab === "transactions" || tab === "recurring" || tab === "subscriptions";
  const isStandaloneTab = tab === "budgets" || tab === "reports";
  const page = financePageHeader(tab, t);
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
        return initialLoading
          ? null
          : t(
              n !== 1
                ? "finance.pages.app.accountCountPlural"
                : "finance.pages.app.accountCount",
              { count: n },
            );
      }
      case "transactions": {
        const n = finance.transactions.length;
        return initialLoading
          ? null
          : t(
              n !== 1
                ? "finance.pages.app.transactionCountPlural"
                : "finance.pages.app.transactionCount",
              { count: n },
            );
      }
      case "recurring":
        return recurringCount === null
          ? null
          : t(
              recurringCount !== 1
                ? "finance.pages.app.recurringCountPlural"
                : "finance.pages.app.recurringCount",
              { count: recurringCount },
            );
      case "subscriptions":
        return null;
      default:
        return null;
    }
  }

  function financeTabSkeleton() {
    switch (tab) {
      case "transactions":
      case "recurring":
        return <TableRowsSkeleton rows={8} />;
      case "subscriptions":
        return <CardGridSkeleton count={4} columns="sm:grid-cols-2 lg:grid-cols-3" />;
      case "goals":
        return <GoalListSkeleton />;
      case "accounts":
        return <CardGridSkeleton count={3} columns="sm:grid-cols-2 lg:grid-cols-3" />;
      case "budgets":
      case "subscriptions":
      case "reports":
        return <CardGridSkeleton count={4} columns="sm:grid-cols-2 lg:grid-cols-4" />;
      default:
        return <FinanceOverviewSkeleton />;
    }
  }

  function tabToolbar() {
    if (tab === "accounts") {
      return (
        <Button type="button" size="sm" onClick={() => setAccountCreateSeq((s) => s + 1)}>
          <IconPlus size="sm" /> {t("finance.pages.app.newAccount")}
        </Button>
      );
    }
    if (tab === "goals") {
      return (
        <Button type="button" size="sm" onClick={() => setGoalsCreateSeq((s) => s + 1)}>
          <IconPlus size="sm" /> {t("finance.pages.app.newGoal")}
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
            <IconPlus size="sm" /> {t("finance.pages.app.income")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={noAccounts}
            onClick={() => setTxCreateTrigger((t) => ({ seq: (t?.seq ?? 0) + 1, kind: "EXPENSE" }))}
          >
            <IconPlus size="sm" /> {t("finance.pages.app.expense")}
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
            <IconPlus size="sm" /> {t("finance.pages.app.transfer")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={noAccounts}
            onClick={() => setImportModalOpen(true)}
          >
            <IconDownload size="sm" /> {t("finance.pages.app.importCsv")}
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
            <IconPlus size="sm" /> {t("finance.pages.app.recurringIncome")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={noAccounts}
            onClick={() =>
              setRecCreateTrigger((t) => ({ seq: (t?.seq ?? 0) + 1, kind: "EXPENSE" }))
            }
          >
            <IconPlus size="sm" /> {t("finance.pages.app.recurringExpense")}
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
                {t(`section.finance.${id}.title`)}
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
      {isStandaloneTab ? null : tab === "overview" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ButtonGroup>
            {FINANCE_PERIOD_CODES.map((code) => (
              <ButtonGroupItem
                key={code}
                active={preset === code}
                onClick={() => setPreset(code)}
              >
                {t(periodLabelKey(code))}
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
          onChanged={() => void finance.reload()}
          openCreateSeq={accountCreateSeq}
        />
      ) : tab === "budgets" ? (
        <FinanceBudgets />
      ) : tab === "subscriptions" ? (
        <FinanceSubscriptions />
      ) : tab === "reports" ? (
        <FinanceReports />
      ) : (
        <FinanceGoals openCreateSeq={goalsCreateSeq} />
      )}

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        accounts={finance.accounts}
        onImported={() => {
          setImportModalOpen(false);
          void finance.reload();
        }}
      />
    </div>
  );
}

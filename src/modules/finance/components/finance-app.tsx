"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader } from "@/components/ui/loader";
import { FinanceAccounts } from "@/modules/finance/components/finance-accounts";
import { FinanceOverview } from "@/modules/finance/components/finance-overview";
import { FinanceRecurring } from "@/modules/finance/components/finance-recurring";
import { FinanceTransactions } from "@/modules/finance/components/finance-transactions";
import { useFinanceData } from "@/modules/finance/hooks/use-finance-data";
import { useMoneyMapCatalog } from "@/modules/money-map/hooks/use-money-map-catalog";

type FinanceTab = "resumo" | "lancamentos" | "recorrentes" | "contas";

const TABS: { id: FinanceTab; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "lancamentos", label: "Lançamentos" },
  { id: "recorrentes", label: "Recorrentes" },
  { id: "contas", label: "Contas" },
];

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

export function FinanceApp() {
  const [tab, setTab] = useState<FinanceTab>("resumo");
  const [preset, setPreset] = useState<PeriodPreset>("month");
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const catalog = useMoneyMapCatalog();
  const currentRange = useMemo(() => periodRange(preset), [preset]);
  const finance = useFinanceData(currentRange);

  // Derive available currencies from accounts
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

  // Pick display currency: user selection, dominant by volume, or first account
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-emerald-600">Finanças</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Controle financeiro
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Contas, lançamentos e relatórios — em qualquer moeda e país.
          </p>
        </div>
        {tab === "resumo" ? (
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
        ) : null}
      </div>

      <Tabs
        key={tab}
        defaultValue={tab}
        onValueChange={(value) => setTab(value as FinanceTab)}
      >
        <TabsList className="h-auto flex-wrap gap-1 bg-zinc-50 p-1 dark:bg-zinc-900/50">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="text-xs">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {finance.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {finance.error}
        </div>
      ) : null}

      {finance.loading && finance.accounts.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader />
        </div>
      ) : tab === "resumo" ? (
        <FinanceOverview
          summary={finance.summary}
          accounts={finance.accounts}
          currency={displayCurrency}
        />
      ) : tab === "lancamentos" ? (
        <FinanceTransactions
          transactions={finance.transactions}
          accounts={finance.accounts}
          onChanged={() => void finance.reload()}
        />
      ) : tab === "recorrentes" ? (
        <FinanceRecurring
          accounts={finance.accounts}
          onChanged={() => void finance.reload()}
        />
      ) : (
        <FinanceAccounts
          accounts={finance.accounts}
          catalog={catalog}
          onChanged={() => void finance.reload()}
        />
      )}
    </div>
  );
}

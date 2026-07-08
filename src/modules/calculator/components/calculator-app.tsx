"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { useUrlTab } from "@/hooks/use-url-tab";
import {
  CALCULATOR_TAB_LABELS,
  CALCULATOR_TABS,
  type CalculatorTabSlug,
} from "@/lib/app-routes";
import { calculatorPageHeader } from "@/lib/page-meta";
import { CurrencyConverter } from "@/modules/calculator/components/currency-converter";
import { TaxCalculator } from "@/modules/calculator/components/tax-calculator";
import { SalaryOptimizer } from "@/modules/calculator/components/salary-optimizer";
import { LoanCalculator } from "@/modules/calculator/components/loan-calculator";
import { FireCalculator } from "@/modules/calculator/components/fire-calculator";

const VALID_TABS = Object.values(CALCULATOR_TABS) as CalculatorTabSlug[];

export function CalculatorApp({ initialTab }: { initialTab?: string | null }) {
  const [tab, setTab] = useUrlTab<CalculatorTabSlug>({
    basePath: "/calculator",
    validTabs: VALID_TABS,
    defaultTab: "exchange",
    initialTab,
  });

  const page = calculatorPageHeader(tab);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <PageHeader meta={page} />

      <Tabs
        key={tab}
        defaultValue={tab}
        onValueChange={(value) => setTab(value as CalculatorTabSlug)}
      >
        <TabsList className="h-auto flex-wrap gap-1 bg-zinc-50 p-1 dark:bg-zinc-900/50">
          {VALID_TABS.map((id) => (
            <TabsTrigger key={id} value={id} className="text-xs">
              {CALCULATOR_TAB_LABELS[id]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === "exchange" ? (
        <CurrencyConverter />
      ) : tab === "taxes" ? (
        <TaxCalculator />
      ) : tab === "salary" ? (
        <SalaryOptimizer />
      ) : tab === "loan" ? (
        <LoanCalculator />
      ) : (
        <FireCalculator />
      )}
    </div>
  );
}

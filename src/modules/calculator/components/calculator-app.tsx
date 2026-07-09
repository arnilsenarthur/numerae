"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { useUrlTab } from "@/hooks/use-url-tab";
import {
  CALCULATOR_TABS,
  type CalculatorTabSlug,
} from "@/lib/app-routes";
import { calculatorPageHeader } from "@/lib/page-meta";
import { useT } from "@/i18n/locale-provider";
import { CurrencyConverter } from "@/modules/calculator/components/currency-converter";
import { TaxCalculator } from "@/modules/calculator/components/tax-calculator";
import { SalaryOptimizer } from "@/modules/calculator/components/salary-optimizer";
import { LoanCalculator } from "@/modules/calculator/components/loan-calculator";
import { FireCalculator } from "@/modules/calculator/components/fire-calculator";

const VALID_TABS = Object.values(CALCULATOR_TABS) as CalculatorTabSlug[];

export function CalculatorApp({ initialTab }: { initialTab?: string | null }) {
  const t = useT();
  const [tab, setTab] = useUrlTab<CalculatorTabSlug>({
    basePath: "/calculator",
    validTabs: VALID_TABS,
    defaultTab: "exchange",
    initialTab,
  });

  const page = calculatorPageHeader(tab, t);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader meta={page} />

      <Tabs
        key={tab}
        defaultValue={tab}
        onValueChange={(value) => setTab(value as CalculatorTabSlug)}
      >
        <TabsList>
          {VALID_TABS.map((id) => (
            <TabsTrigger key={id} value={id} className="text-xs">
              {t(`section.calculator.${id}.title`)}
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

"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, cardClickable } from "@/components/ui/card";
import {
  IconExchange,
  IconPercent,
  IconSalary,
  IconLoan,
  IconTarget,
} from "@/components/ui/icons";
import { CALCULATOR_TABS, calculatorTabPath } from "@/lib/app-routes";
import { calculatorHomePageHeader } from "@/lib/page-meta";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const CALCULATOR_DESC_KEYS: Record<
  (typeof CALCULATOR_TABS)[keyof typeof CALCULATOR_TABS],
  "exchangeDesc" | "taxesDesc" | "salaryDesc" | "loanDesc" | "fireDesc"
> = {
  exchange: "exchangeDesc",
  taxes: "taxesDesc",
  salary: "salaryDesc",
  loan: "loanDesc",
  fire: "fireDesc",
};

const CALCULATOR_CARDS: {
  tab: (typeof CALCULATOR_TABS)[keyof typeof CALCULATOR_TABS];
  icon: ReactNode;
}[] = [
  { tab: "exchange", icon: <IconExchange size="md" /> },
  { tab: "taxes", icon: <IconPercent size="md" /> },
  { tab: "salary", icon: <IconSalary size="md" /> },
  { tab: "loan", icon: <IconLoan size="md" /> },
  { tab: "fire", icon: <IconTarget size="md" /> },
];

export function CalculatorHome() {
  const t = useT();
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader meta={calculatorHomePageHeader(t)} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CALCULATOR_CARDS.map(({ tab, icon }) => (
          <Link key={tab} href={calculatorTabPath(tab)} className="block">
            <Card className={cn("h-full transition-shadow", cardClickable)}>
              <CardContent className="flex flex-col gap-2.5 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {icon}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {t(`section.calculator.${tab}.title`)}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {t(`calculator.pages.home.${CALCULATOR_DESC_KEYS[tab]}`)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

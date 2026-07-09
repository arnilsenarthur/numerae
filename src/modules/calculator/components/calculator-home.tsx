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
import { CALCULATOR_TAB_LABELS, CALCULATOR_TABS, calculatorTabPath } from "@/lib/app-routes";
import { calculatorHomePageHeader } from "@/lib/page-meta";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

const CALCULATOR_CARDS: {
  tab: (typeof CALCULATOR_TABS)[keyof typeof CALCULATOR_TABS];
  icon: ReactNode;
  description: string;
}[] = [
  {
    tab: "exchange",
    icon: <IconExchange size="md" />,
    description: "Converta moedas e compare taxas entre instituições.",
  },
  {
    tab: "taxes",
    icon: <IconPercent size="md" />,
    description: "Compare MEI, Simples e Presumido com Fator R.",
  },
  {
    tab: "salary",
    icon: <IconSalary size="md" />,
    description: "Otimize recebimento PJ do exterior com câmbio e impostos.",
  },
  {
    tab: "loan",
    icon: <IconLoan size="md" />,
    description: "Simule SAC e Price com parcelas, juros e saldo.",
  },
  {
    tab: "fire",
    icon: <IconTarget size="md" />,
    description: "Estime independência financeira pela regra dos 25x.",
  },
];

export function CalculatorHome() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader meta={calculatorHomePageHeader} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CALCULATOR_CARDS.map(({ tab, icon, description }) => (
          <Link key={tab} href={calculatorTabPath(tab)} className="block">
            <Card className={cn("h-full transition-shadow", cardClickable)}>
              <CardContent className="flex flex-col gap-2.5 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {icon}
                </div>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {CALCULATOR_TAB_LABELS[tab]}
                  </p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

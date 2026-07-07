"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CurrencyConverter } from "@/modules/calculator/components/currency-converter";
import { TaxCalculator } from "@/modules/calculator/components/tax-calculator";
import { SalaryOptimizer } from "@/modules/calculator/components/salary-optimizer";
import { LoanCalculator } from "@/modules/calculator/components/loan-calculator";
import { FireCalculator } from "@/modules/calculator/components/fire-calculator";

type CalcTab = "cambio" | "impostos" | "salario" | "financiamento" | "fire";

const TABS: { id: CalcTab; label: string; description: string }[] = [
  { id: "cambio", label: "Câmbio", description: "Conversão de moedas em tempo real com comparativo por instituição." },
  { id: "impostos", label: "Impostos PJ", description: "Compare MEI, Simples (Anexo III/V) e Lucro Presumido — com otimização de Fator R." },
  { id: "salario", label: "Salário do exterior", description: "Melhor instituição para receber PJ do exterior, com câmbio + IOF + imposto." },
  { id: "financiamento", label: "Financiamento", description: "Simule SAC vs Price: parcelas, juros totais e saldo devedor ao longo do tempo." },
  { id: "fire", label: "Independência FIRE", description: "Calcule quanto precisa acumular para se aposentar (regra dos 25×)." },
];

export function CalculatorApp() {
  const [tab, setTab] = useState<CalcTab>("cambio");
  const activeTab = TABS.find((t) => t.id === tab)!;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div>
        <p className="text-sm text-sky-600">Ferramentas</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Calculadoras</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Câmbio, impostos, financiamento, salário e planejamento de independência financeira — tudo em um lugar.
        </p>
      </div>

      <Tabs
        key={tab}
        defaultValue={tab}
        onValueChange={(value) => setTab(value as CalcTab)}
      >
        <TabsList className="h-auto flex-wrap gap-1 bg-zinc-50 p-1 dark:bg-zinc-900/50">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="text-xs">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <p className="text-xs text-zinc-500">{activeTab.description}</p>

      {tab === "cambio" ? (
        <CurrencyConverter />
      ) : tab === "impostos" ? (
        <TaxCalculator />
      ) : tab === "salario" ? (
        <SalaryOptimizer />
      ) : tab === "financiamento" ? (
        <LoanCalculator />
      ) : (
        <FireCalculator />
      )}
    </div>
  );
}

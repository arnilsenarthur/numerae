"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvestmentPlansPanel } from "@/modules/investments/components/investment-plans-panel";
import { MarketPanel } from "@/modules/investments/components/market-panel";
import { PortfolioPanel } from "@/modules/investments/components/portfolio-panel";

type InvestmentsTab = "carteira" | "projecao" | "mercado";

const TABS: { id: InvestmentsTab; label: string; description: string }[] = [
  { id: "carteira", label: "Carteira", description: "Alocação por perfil e sugestões de ativos" },
  { id: "projecao", label: "Projeção", description: "Planos salvos com simulação de crescimento" },
  { id: "mercado", label: "Mercado", description: "Cotações de ações, ETFs, FIIs e cripto" },
];

export function InvestmentsApp() {
  const [tab, setTab] = useState<InvestmentsTab>("carteira");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div>
        <p className="text-sm text-emerald-600">Investimentos</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Planejamento de investimentos
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Aloque seu aporte mensal por classe de ativo, simule projeções e acompanhe o mercado.
        </p>
      </div>

      <Tabs
        key={tab}
        defaultValue={tab}
        onValueChange={(value) => setTab(value as InvestmentsTab)}
      >
        <TabsList className="h-auto flex-wrap gap-1 bg-zinc-50 p-1 dark:bg-zinc-900/50">
          {TABS.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="text-xs">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {TABS.find((t) => t.id === tab)?.description ? (
        <p className="text-xs text-zinc-500">{TABS.find((t) => t.id === tab)!.description}</p>
      ) : null}

      {tab === "carteira" ? (
        <PortfolioPanel />
      ) : tab === "projecao" ? (
        <InvestmentPlansPanel />
      ) : (
        <MarketPanel />
      )}
    </div>
  );
}

"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PlanTab = "resumo" | "movimentos" | "metas" | "calculadoras";

const TABS: { id: PlanTab; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "movimentos", label: "Movimentos" },
  { id: "metas", label: "Metas" },
  { id: "calculadoras", label: "Calculadoras" },
];

export function PlanTabs({
  active,
  onChange,
}: {
  active: PlanTab;
  onChange: (tab: PlanTab) => void;
}) {
  return (
    <Tabs key={active} defaultValue={active} onValueChange={(value) => onChange(value as PlanTab)}>
      <TabsList className="h-auto flex-wrap gap-1 bg-zinc-50 p-1 dark:bg-zinc-900/50">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

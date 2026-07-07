"use client";

import { useSearchParams } from "next/navigation";
import { MoneyMapApp } from "@/modules/money-map/components/money-map-app";
import type { PlanTab } from "@/modules/money-map/components/plan/plan-tabs";

const PLAN_TABS: PlanTab[] = ["resumo", "movimentos", "metas", "calculadoras"];

export function MoneyMapAppClient() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const initialTab = PLAN_TABS.includes(tab as PlanTab) ? (tab as PlanTab) : undefined;

  return <MoneyMapApp initialTab={initialTab} />;
}

import type { MoneyMapEdgeInput, MoneyMapNodeInput } from "@/modules/money-map/engines/types";

export type PlanWizardKind = "blank" | "calculator";

export type PlanWizardInput = {
  kind: PlanWizardKind;
  name?: string;
  horizonMonths?: number;
};

export type BuiltPlan = {
  name: string;
  templateId: string;
  horizonMonths: number;
  viewMode: "simple" | "advanced";
  nodes: MoneyMapNodeInput[];
  edges: MoneyMapEdgeInput[];
};

export function buildPlanFromWizard(input: PlanWizardInput): BuiltPlan {
  const months = input.horizonMonths ?? 12;
  return {
    name: input.name?.trim() || "Meu plano",
    templateId: "",
    horizonMonths: months,
    viewMode: "simple",
    nodes: [],
    edges: [],
  };
}

export const PLAN_WIZARD_OPTIONS: {
  kind: PlanWizardKind;
  title: string;
  description: string;
}[] = [
  {
    kind: "blank",
    title: "Plano em branco",
    description: "Comece vazio — você adiciona movimentos e cenários quando quiser.",
  },
];

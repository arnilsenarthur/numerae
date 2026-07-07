"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { IconBank, IconExchange, IconPercent } from "@/components/ui/icons";
import type { SerializedMoneyMapNode } from "@/lib/money-map-serializer";
import { TREATMENT_PRESETS, type TreatmentPresetId } from "@/modules/money-map/plan/entry-types";

type PresetCard = {
  id: TreatmentPresetId;
  title: string;
  description: string;
  icon: ReactNode;
};

const PRESET_CARDS: PresetCard[] = [
  {
    id: "compare-conversion",
    title: "Comparar conversão",
    description: "Adiciona conversão com instituições que você escolhe.",
    icon: <IconExchange className="h-5 w-5 text-sky-600" />,
  },
  {
    id: "tax-only",
    title: "Imposto PJ",
    description: "Aplica imposto sobre o valor da entrada.",
    icon: <IconPercent className="h-5 w-5 text-violet-600" />,
  },
  {
    id: "tax-and-invest",
    title: "Imposto + investimento",
    description: "Encadeia imposto e investimento do restante.",
    icon: <IconBank className="h-5 w-5 text-zinc-600" />,
  },
];

type PlanCalculatorsProps = {
  entries: SerializedMoneyMapNode[];
  onApplyPreset: (entryId: string, presetId: TreatmentPresetId) => void;
};

function isIncomeEntry(node: SerializedMoneyMapNode) {
  return node.type === "INCOME" && node.config.movement !== false;
}

export function PlanCalculators({ entries, onApplyPreset }: PlanCalculatorsProps) {
  const incomes = entries.filter(isIncomeEntry);
  const [entryId, setEntryId] = useState(incomes[0]?.id ?? "");

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Atalhos que adicionam tratamentos lineares numa entrada — sem grafo, só lista ordenada. Depois
        ajuste valores e instituições em Movimentos → Tratamentos.
      </p>

      {incomes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Cadastre uma entrada na aba Movimentos para usar os atalhos.
        </p>
      ) : (
        <div className="max-w-md">
          <Label>Aplicar em qual entrada?</Label>
          <select
            className="mt-1 flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
          >
            {incomes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label ?? "Entrada"}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {PRESET_CARDS.map((card) => {
          const preset = TREATMENT_PRESETS.find((item) => item.id === card.id);
          return (
            <Card key={card.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  {card.icon}
                  <CardTitle className="text-base">{card.title}</CardTitle>
                </div>
                <CardDescription>{preset?.description ?? card.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!entryId}
                  onClick={() => entryId && onApplyPreset(entryId, card.id)}
                >
                  Adicionar tratamentos
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

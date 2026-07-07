"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buildPlanFromWizard,
  type BuiltPlan,
} from "@/modules/money-map/plan/build-plan-from-wizard";

type PlanWizardProps = {
  saving?: boolean;
  onComplete: (plan: BuiltPlan) => void;
  onCancel?: () => void;
};

export function PlanWizard({ saving, onComplete, onCancel }: PlanWizardProps) {
  const [name, setName] = useState("");
  const [horizonMonths, setHorizonMonths] = useState("12");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-2">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Novo plano</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Sem valores pré-preenchidos. Depois cadastre entradas e saídas; tratamentos lineares ficam em
          cada entrada.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meu plano" />
        </div>
        <div>
          <Label>Horizonte da projeção (meses)</Label>
          <NumberInput
            value={horizonMonths}
            min={1}
            max={120}
            onChange={(e) => setHorizonMonths(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={() =>
            onComplete(
              buildPlanFromWizard({
                kind: "blank",
                name: name.trim() || undefined,
                horizonMonths: Number(horizonMonths) || 12,
              }),
            )
          }
        >
          {saving ? "Criando…" : "Criar plano"}
        </Button>
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input, NumberInput } from "@/components/ui/input";
import {
  EXPENSE_CATEGORY_OPTIONS,
  INCOME_CATEGORY_OPTIONS,
  PERIOD_OPTIONS,
} from "@/modules/money-map/lib/node-definitions";
import type { MapSnapshot } from "@/modules/money-map/hooks/use-money-map-history";
import type { MoneyMapNodeType } from "@/modules/money-map/engines/types";

type PlanSimpleEditorProps = {
  snapshot: MapSnapshot;
  onPatchNode: (nodeId: string, patch: Record<string, unknown>, label?: string) => void;
};

const EDITABLE_TYPES: MoneyMapNodeType[] = [
  "INCOME",
  "EXPENSE",
  "INVESTMENT",
  "TIME",
  "INTEREST",
  "SPLIT",
  "TAX_PJ",
];

export function PlanSimpleEditor({ snapshot, onPatchNode }: PlanSimpleEditorProps) {
  const editableNodes = useMemo(
    () =>
      snapshot.nodes.filter((node) =>
        EDITABLE_TYPES.includes(node.type as MoneyMapNodeType),
      ),
    [snapshot.nodes],
  );

  if (editableNodes.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Este plano usa blocos avançados. Edite na aba Avançado ou crie um plano pelo assistente.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-500">
        Ajuste entradas, saídas, investimentos e horizonte. A simulação atualiza automaticamente.
      </p>

      {editableNodes.map((node) => (
        <section
          key={node.id}
          className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">{node.label ?? node.type}</p>
            <span className="text-xs uppercase tracking-wide text-zinc-400">{node.type}</span>
          </div>

          {(node.type === "INCOME" || node.type === "EXPENSE") && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Valor</Label>
                  <NumberInput
                    value={String(node.config.amount ?? 0)}
                    onChange={(e) =>
                      onPatchNode(node.id, { amount: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label>Moeda</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={String(node.config.currency ?? "BRL")}
                    onChange={(e) => onPatchNode(node.id, { currency: e.target.value })}
                  >
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label>Período</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={String(node.config.period ?? "monthly")}
                    onChange={(e) => onPatchNode(node.id, { period: e.target.value })}
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    value={String(node.config.category ?? "other")}
                    onChange={(e) => onPatchNode(node.id, { category: e.target.value })}
                  >
                    {(node.type === "INCOME" ? INCOME_CATEGORY_OPTIONS : EXPENSE_CATEGORY_OPTIONS).map(
                      (option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                {node.config.period === "once" ? (
                  <div>
                    <Label>Mês da despesa/receita</Label>
                    <NumberInput
                      value={String(node.config.onceMonth ?? 1)}
                      onChange={(e) =>
                        onPatchNode(node.id, { onceMonth: Number(e.target.value) || 1 })
                      }
                    />
                  </div>
                ) : null}
              </div>
              <div>
                <Label>Nome do bloco</Label>
                <Input
                  value={node.label ?? ""}
                  onChange={(e) => onPatchNode(node.id, {}, e.target.value)}
                />
              </div>
            </>
          )}

          {node.type === "INVESTMENT" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>% a investir</Label>
                <NumberInput
                  value={String(node.config.percentOfNet ?? 0)}
                  onChange={(e) =>
                    onPatchNode(node.id, { percentOfNet: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Rendimento %/ano</Label>
                <NumberInput
                  value={String(node.config.annualRatePercent ?? 0)}
                  onChange={(e) =>
                    onPatchNode(node.id, { annualRatePercent: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Horizonte (meses)</Label>
                <NumberInput
                  value={String(node.config.projectionMonths ?? 12)}
                  onChange={(e) =>
                    onPatchNode(node.id, { projectionMonths: Number(e.target.value) || 12 })
                  }
                />
              </div>
            </div>
          )}

          {node.type === "TIME" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Meses</Label>
                <NumberInput
                  value={String(node.config.months ?? 12)}
                  onChange={(e) => {
                    const months = Number(e.target.value) || 12;
                    onPatchNode(node.id, { months }, `${months} meses`);
                  }}
                />
              </div>
              <div>
                <Label>Juros %/ano</Label>
                <NumberInput
                  value={String(node.config.annualRatePercent ?? 0)}
                  onChange={(e) =>
                    onPatchNode(node.id, { annualRatePercent: Number(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
          )}

          {node.type === "INTEREST" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Taxa %/ano</Label>
                <NumberInput
                  value={String(node.config.annualRatePercent ?? 0)}
                  onChange={(e) =>
                    onPatchNode(node.id, { annualRatePercent: Number(e.target.value) || 0 })
                  }
                />
              </div>
              <div>
                <Label>Meses</Label>
                <NumberInput
                  value={String(node.config.months ?? 12)}
                  onChange={(e) => onPatchNode(node.id, { months: Number(e.target.value) || 12 })}
                />
              </div>
            </div>
          )}

          {node.type === "SPLIT" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Ramo A (%)</Label>
                <NumberInput
                  value={String(node.config.branchA ?? 50)}
                  onChange={(e) => onPatchNode(node.id, { branchA: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Ramo B (%)</Label>
                <NumberInput
                  value={String(node.config.branchB ?? 50)}
                  onChange={(e) => onPatchNode(node.id, { branchB: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}

          {node.type === "TAX_PJ" && (
            <div>
              <Label>Alíquota % (Simples/manual)</Label>
              <NumberInput
                value={String(node.config.taxRatePercent ?? 6)}
                onChange={(e) =>
                  onPatchNode(node.id, { taxRatePercent: Number(e.target.value) || 0 })
                }
              />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchJson } from "@/lib/fetch-json";
import { formatMoney } from "@/lib/format-money";
import type { SerializedFinancialGoal } from "@/lib/goal-serializer";

type PlanGoalsProps = {
  moneyMapId: string | null;
  simulatedAccumulated?: number;
};

export function PlanGoals({ moneyMapId, simulatedAccumulated }: PlanGoalsProps) {
  const [goals, setGoals] = useState<SerializedFinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const loadGoals = useCallback(async () => {
    if (!moneyMapId) {
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const query = new URLSearchParams({ moneyMapId });
    const { response, data } = await fetchJson<{ goals?: SerializedFinancialGoal[] }>(
      `/api/goals?${query}`,
    );
    setLoading(false);
    if (response.ok && data?.goals) setGoals(data.goals);
  }, [moneyMapId]);

  useEffect(() => {
    void loadGoals();
  }, [loadGoals]);

  async function createGoal() {
    if (!moneyMapId || !title.trim() || !targetAmount) return;
    setSaving(true);
    const { response, data } = await fetchJson<{ goal?: SerializedFinancialGoal }>("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        targetAmount: Number(targetAmount),
        moneyMapId,
        category: "other",
      }),
    });
    setSaving(false);
    if (response.ok && data?.goal) {
      setGoals((prev) => [...prev, data.goal!]);
      setTitle("");
      setTargetAmount("");
    }
  }

  async function removeGoal(id: string) {
    await fetchJson(`/api/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  }

  if (!moneyMapId) {
    return <p className="text-sm text-zinc-500">Crie um plano para definir metas.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-500">
        Metas ligadas a este plano. O progresso na aba Resumo usa o acumulado da simulação.
      </p>

      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-medium">Nova meta</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Reserva de emergência" />
          </div>
          <div>
            <Label>Valor alvo (BRL)</Label>
            <NumberInput value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button type="button" disabled={saving} onClick={() => void createGoal()}>
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Carregando metas…</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma meta ainda.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((goal) => {
              const progressAmount =
                simulatedAccumulated != null
                  ? Math.min(goal.targetAmount, simulatedAccumulated)
                  : goal.currentAmount;
              const progress =
                goal.targetAmount > 0 ? (progressAmount / goal.targetAmount) * 100 : 0;
              return (
                <li
                  key={goal.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{goal.title}</p>
                    <p className="text-sm tabular-nums text-zinc-500">
                      {formatMoney(progressAmount)} / {formatMoney(goal.targetAmount)}
                      {simulatedAccumulated != null ? (
                        <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">
                          (simulação)
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>
                  <Button type="button" variant="secondary" size="sm" onClick={() => void removeGoal(goal.id)}>
                    Remover
                  </Button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconPlus, IconTarget } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import type { SerializedFinancialGoal } from "@/lib/goal-serializer";
import type { SerializedMoneyMap, SerializedMoneyMapEdge, SerializedMoneyMapNode } from "@/lib/money-map-serializer";
import { PlanCalculators } from "@/modules/money-map/components/plan/plan-calculators";
import { PlanEntries } from "@/modules/money-map/components/plan/plan-entries";
import { PlanGoals } from "@/modules/money-map/components/plan/plan-goals";
import { PlanScenarios } from "@/modules/money-map/components/plan/plan-scenarios";
import { PlanSummary } from "@/modules/money-map/components/plan/plan-summary";
import { PlanTabs, type PlanTab } from "@/modules/money-map/components/plan/plan-tabs";
import { PlanWizard } from "@/modules/money-map/components/plan/plan-wizard";
import type { SimulationResult, RouteQuote } from "@/modules/money-map/engines/types";
import type { BuiltPlan } from "@/modules/money-map/plan/build-plan-from-wizard";
import { defaultEntryConfig, type ConversionTreatment, type PlanTreatment } from "@/modules/money-map/plan/entry-types";
import { applyTreatmentPreset, type TreatmentPresetId } from "@/modules/money-map/plan/entry-types";
import { useMoneyMapHistory, type MapSnapshot } from "@/modules/money-map/hooks/use-money-map-history";
import { useMoneyMapCatalog } from "@/modules/money-map/hooks/use-money-map-catalog";

function filterEntryNodes(nodes: SerializedMoneyMapNode[]) {
  return nodes.filter(
    (node) =>
      (node.type === "INCOME" || node.type === "EXPENSE") && node.config.movement !== false,
  );
}

function sanitizeSnapshot(snapshot: MapSnapshot): MapSnapshot {
  return {
    nodes: filterEntryNodes(snapshot.nodes),
    edges: [],
  };
}

export function MoneyMapApp({
  mapId,
  initialTab,
}: {
  mapId?: string;
  initialTab?: PlanTab;
}) {
  const [maps, setMaps] = useState<SerializedMoneyMap[]>([]);
  const [activeMap, setActiveMap] = useState<SerializedMoneyMap | null>(null);
  const history = useMoneyMapHistory({ nodes: [], edges: [] });
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [routeQuotes, setRouteQuotes] = useState<RouteQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planTab, setPlanTab] = useState<PlanTab>(initialTab ?? "resumo");
  const [showWizard, setShowWizard] = useState(false);
  const [goals, setGoals] = useState<SerializedFinancialGoal[]>([]);

  const { snapshot, reset, setSnapshot, pushPast, update, undo, redo, canUndo, canRedo } = history;
  const catalog = useMoneyMapCatalog();

  const applyMap = useCallback(
    (map: SerializedMoneyMap) => {
      setActiveMap(map);
      reset(sanitizeSnapshot({ nodes: map.nodes, edges: [] }));
      setSimulation(null);
    },
    [reset],
  );

  useEffect(() => {
    async function loadMaps() {
      setLoading(true);
      setError(null);
      const { response, data } = await fetchJson<{ maps?: SerializedMoneyMap[]; error?: string }>(
        "/api/money-maps",
      );
      setLoading(false);

      if (!response.ok) {
        setError(data?.error ?? "Erro ao carregar planos.");
        return;
      }

      const list = data?.maps ?? [];
      setMaps(list);

      if (mapId) {
        const found = list.find((item) => item.id === mapId);
        if (found) applyMap(found);
        else {
          const { response: oneRes, data: oneData } = await fetchJson<{ map?: SerializedMoneyMap }>(
            `/api/money-maps/${mapId}`,
          );
          if (oneRes.ok && oneData?.map) applyMap(oneData.map);
        }
      } else if (list[0]) {
        applyMap(list[0]);
      } else {
        setShowWizard(true);
      }
    }

    void loadMaps();
  }, [applyMap, mapId]);

  useEffect(() => {
    async function loadGoals() {
      if (!activeMap?.id) {
        setGoals([]);
        return;
      }
      const query = new URLSearchParams({ moneyMapId: activeMap.id });
      const { response, data } = await fetchJson<{ goals?: SerializedFinancialGoal[] }>(
        `/api/goals?${query}`,
      );
      if (response.ok && data?.goals) setGoals(data.goals);
    }
    void loadGoals();
  }, [activeMap?.id, planTab]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      }
      if ((event.key === "z" && event.shiftKey) || event.key === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [redo, undo]);

  function addEntry(kind: "INCOME" | "EXPENSE") {
    const preset = defaultEntryConfig(kind);
    const id = crypto.randomUUID();
    const serialized: SerializedMoneyMapNode = {
      id,
      type: kind,
      label: preset.label,
      sortOrder: snapshot.nodes.length,
      config: {
        amount: preset.amount,
        currency: preset.currency,
        period: preset.period,
        category: preset.category,
        source: preset.source,
        movement: true,
        treatments: [],
      },
    };

    update((current) => ({
      nodes: [...current.nodes, serialized],
      edges: [],
    }));
    setPlanTab("movimentos");
  }

  function deleteEntry(nodeId: string) {
    update((current) => ({
      nodes: current.nodes.filter((node) => node.id !== nodeId),
      edges: [],
    }));
  }

  function normalizeTreatments(
    treatments: PlanTreatment[],
    entryCurrency: string,
  ): PlanTreatment[] {
    return treatments.map((treatment) => {
      if (treatment.type !== "conversion") return treatment;
      return {
        ...treatment,
        fromCurrency: entryCurrency as ConversionTreatment["fromCurrency"],
      };
    });
  }

  async function persistSnapshot(nodes: SerializedMoneyMapNode[]) {
    if (!activeMap) return false;

    setSaving(true);
    setError(null);

    const entryNodes = filterEntryNodes(nodes);
    const payload = {
      name: activeMap.name,
      nodes: entryNodes.map((node, index) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        sortOrder: index,
        config: node.config,
      })),
      edges: [],
    };

    const { response, data } = await fetchJson<{ map?: SerializedMoneyMap; error?: string }>(
      `/api/money-maps/${activeMap.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    setSaving(false);

    if (!response.ok || !data?.map) {
      setError(data?.error ?? "Erro ao salvar.");
      return false;
    }

    setActiveMap(data.map);
    setMaps((prev) => prev.map((item) => (item.id === data.map!.id ? data.map! : item)));
    return true;
  }

  async function saveEntry(
    nodeId: string,
    payload: {
      patch: Record<string, unknown>;
      label?: string;
      treatments?: PlanTreatment[];
    },
  ) {
    const node = snapshot.nodes.find((item) => item.id === nodeId);
    const entryCurrency = String(payload.patch.currency ?? node?.config.currency ?? "BRL");
    const treatmentsPatch =
      node?.type === "INCOME" && payload.treatments
        ? { treatments: normalizeTreatments(payload.treatments, entryCurrency) }
        : {};

    const nextNodes = snapshot.nodes.map((item) =>
      item.id === nodeId
        ? {
            ...item,
            label: payload.label ?? item.label,
            config: { ...item.config, ...payload.patch, ...treatmentsPatch },
          }
        : item,
    );

    update(() => ({ nodes: nextNodes, edges: [] }));
    await persistSnapshot(nextNodes);
  }

  function applyCalculatorPreset(entryId: string, presetId: TreatmentPresetId) {
    update((current) => ({
      nodes: current.nodes.map((node) => {
        if (node.id !== entryId || node.type !== "INCOME") return node;
        const existing = Array.isArray(node.config.treatments) ? node.config.treatments : [];
        return {
          ...node,
          config: {
            ...node.config,
            treatments: applyTreatmentPreset(existing as Parameters<typeof applyTreatmentPreset>[0], presetId),
          },
        };
      }),
      edges: [],
    }));
    setPlanTab("movimentos");
  }

  const runSimulation = useCallback(
    async (
      forMap?: SerializedMoneyMap,
      overrideNodes?: SerializedMoneyMapNode[],
    ) => {
      const map = forMap ?? activeMap;
      if (!map) return;

      const simNodes = filterEntryNodes(overrideNodes ?? snapshot.nodes);

      setSimulating(true);
      setError(null);

      const payload = {
        mapId: map.id,
        nodes: simNodes.map((node, index) => ({
          id: node.id,
          type: node.type,
          label: node.label,
          sortOrder: index,
          config: node.config,
        })),
        edges: [] as SerializedMoneyMapEdge[],
      };

      const { response, data } = await fetchJson<{
        simulation?: SimulationResult;
        quotes?: RouteQuote[];
        error?: string;
      }>("/api/money-maps/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setSimulating(false);

      if (!response.ok || !data?.simulation) {
        setError(data?.error ?? "Erro na simulação.");
        return;
      }

      setSimulation(data.simulation);
      setRouteQuotes(data.quotes ?? []);
    },
    [activeMap, snapshot.nodes],
  );

  const snapshotSignature = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  useEffect(() => {
    if (!activeMap) return;
    const timer = window.setTimeout(() => {
      void runSimulation();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [activeMap, runSimulation, snapshotSignature]);

  async function createPlanFromWizard(built: BuiltPlan) {
    setSaving(true);
    setError(null);

    const { response, data } = await fetchJson<{ map?: SerializedMoneyMap; error?: string }>(
      "/api/money-maps",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: built.name,
          templateId: built.templateId || null,
          horizonMonths: built.horizonMonths,
          viewMode: built.viewMode,
          nodes: built.nodes,
          edges: [],
        }),
      },
    );

    setSaving(false);

    if (!response.ok || !data?.map) {
      setError(data?.error ?? "Erro ao criar plano.");
      return;
    }

    setMaps((prev) => [data.map!, ...prev]);
    applyMap(data.map);
    setShowWizard(false);
    setPlanTab("movimentos");
  }

  async function saveMap() {
    if (!activeMap) return;
    await persistSnapshot(snapshot.nodes);
  }

  const hasTreatments = snapshot.nodes.some(
    (node) => Array.isArray(node.config.treatments) && node.config.treatments.length > 0,
  );

  if (loading) {
    return <p className="py-12 text-sm text-zinc-500">Carregando planos…</p>;
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[560px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Plano financeiro</h2>
          {activeMap ? <span className="text-sm text-zinc-500">{activeMap.name}</span> : null}
          {simulating ? <span className="text-xs text-zinc-500">Calculando…</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {activeMap ? (
            <>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowWizard(true)}>
                Novo plano
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => undo()} disabled={!canUndo}>
                Desfazer
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => redo()} disabled={!canRedo}>
                Refazer
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void saveMap()} disabled={saving}>
                {saving ? "Salvando…" : "Salvar"}
              </Button>
            </>
          ) : (
            <Button type="button" onClick={() => setShowWizard(true)} disabled={saving}>
              <IconPlus size="sm" />
              Criar plano
            </Button>
          )}
        </div>
      </div>

      {maps.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {maps.map((map) => (
            <Link key={map.id} href={`/money-map/${map.id}`}>
              <Badge variant={activeMap?.id === map.id ? "success" : "outline"}>{map.name}</Badge>
            </Link>
          ))}
        </div>
      ) : null}

      {error || catalog.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error ?? catalog.error}
        </div>
      ) : null}

      {showWizard ? (
        <div className="flex flex-1 items-start justify-center overflow-y-auto rounded-xl border border-zinc-200 bg-white py-6 dark:border-zinc-800 dark:bg-zinc-950">
          <PlanWizard
            saving={saving}
            onComplete={(built) => void createPlanFromWizard(built)}
            onCancel={activeMap ? () => setShowWizard(false) : undefined}
          />
        </div>
      ) : !activeMap ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
          <IconTarget className="h-10 w-10 text-emerald-600" />
          <p className="max-w-sm text-center text-sm text-zinc-500">
            Cadastre entradas e saídas, projete o futuro e acompanhe o realizado quando conectar o Open
            Finance.
          </p>
          <Button type="button" onClick={() => setShowWizard(true)} disabled={saving}>
            Começar
          </Button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <PlanTabs active={planTab} onChange={setPlanTab} />

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            {planTab === "resumo" ? (
              <PlanSummary
                simulation={simulation}
                simulating={simulating}
                goals={goals}
                hasTreatments={hasTreatments}
              />
            ) : null}

            {planTab === "movimentos" ? (
              <PlanEntries
                nodes={snapshot.nodes}
                catalog={catalog}
                quotes={routeQuotes}
                saving={saving}
                onAdd={addEntry}
                onSaveEntry={saveEntry}
                onDelete={deleteEntry}
              />
            ) : null}

            {planTab === "metas" ? (
              <PlanGoals
                moneyMapId={activeMap.id}
                simulatedAccumulated={simulation?.analytics?.accumulatedForGoals}
              />
            ) : null}

            {planTab === "calculadoras" ? (
              <div className="space-y-6">
                <PlanCalculators
                  entries={snapshot.nodes}
                  onApplyPreset={applyCalculatorPreset}
                />
                {simulation && simulation.routes.length > 1 ? (
                  <div className="border-t border-zinc-200 pt-6 dark:border-zinc-800">
                    <p className="mb-3 text-sm font-medium">Comparativo de rotas</p>
                    <PlanScenarios simulation={simulation} />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

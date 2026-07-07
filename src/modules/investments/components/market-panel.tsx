"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { Select } from "@/components/ui/select";
import { Sparkline } from "@/components/ui/chart";
import { IconChart } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { formatLastUpdated } from "@/lib/spoilable-field";
import {
  MARKET_ASSET_KIND_LABELS,
  type SerializedMarketAsset,
  type SerializedMarketQuote,
} from "@/types/market";

const KIND_FILTER_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  ...Object.entries(MARKET_ASSET_KIND_LABELS).map(([value, label]) => ({ value, label })),
];

export function MarketPanel() {
  const [assets, setAssets] = useState<SerializedMarketAsset[]>([]);
  const [history, setHistory] = useState<Record<string, SerializedMarketQuote[]>>({});
  const [kindFilter, setKindFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({ history: "true", days: "90" });
      if (kindFilter) query.set("kind", kindFilter);
      const { response, data } = await fetchJson<{
        assets?: SerializedMarketAsset[];
        history?: Record<string, SerializedMarketQuote[]>;
        error?: string;
      }>(`/api/market?${query.toString()}`);
      if (cancelled) return;
      setLoading(false);
      if (!response.ok) {
        setError(data?.error ?? "Erro ao carregar mercado.");
        return;
      }
      setAssets(data?.assets ?? []);
      setHistory(data?.history ?? {});
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [kindFilter]);

  const lastUpdate = useMemo(() => {
    const dates = assets
      .map((asset) => asset.priceUpdatedAt)
      .filter((value): value is string => Boolean(value))
      .sort();
    return dates.at(-1) ?? null;
  }, [assets]);

  const columns = useMemo<DataTableColumn<SerializedMarketAsset>[]>(
    () => [
      {
        id: "symbol",
        header: "Ativo",
        sortable: true,
        sortValue: (row) => row.symbol,
        cell: (row) => (
          <div>
            <span className="font-medium">{row.symbol}</span>
            <span className="ml-2 text-xs text-zinc-500">{row.name}</span>
          </div>
        ),
      },
      {
        id: "kind",
        header: "Tipo",
        cell: (row) => (
          <Badge variant="outline" className="text-[10px]">
            {MARKET_ASSET_KIND_LABELS[row.kind]}
          </Badge>
        ),
      },
      {
        id: "price",
        header: "Preço",
        align: "right",
        sortable: true,
        sortValue: (row) => row.price ?? 0,
        cell: (row) =>
          row.price !== null ? (
            <Money value={row.price} currency={row.currencyCode} size="sm" />
          ) : (
            <span className="text-xs text-zinc-400">—</span>
          ),
      },
      {
        id: "change",
        header: "Variação",
        align: "right",
        sortable: true,
        sortValue: (row) => row.changePercent ?? 0,
        cell: (row) =>
          row.changePercent !== null ? (
            <span
              className={
                row.changePercent >= 0
                  ? "text-sm font-medium text-emerald-600 dark:text-emerald-400"
                  : "text-sm font-medium text-red-600 dark:text-red-400"
              }
            >
              {row.changePercent >= 0 ? "+" : ""}
              {row.changePercent.toFixed(2)}%
            </span>
          ) : (
            <span className="text-xs text-zinc-400">—</span>
          ),
      },
      {
        id: "trend",
        header: "90 dias",
        cell: (row) => {
          const quotes = history[row.id] ?? [];
          if (quotes.length < 2) {
            return <span className="text-xs text-zinc-400">Sem histórico</span>;
          }
          return (
            <div className="w-28">
              <Sparkline points={quotes.map((quote) => quote.price)} />
            </div>
          );
        },
      },
    ],
    [history],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xs flex-1">
          <Select
            options={KIND_FILTER_OPTIONS}
            value={kindFilter}
            onChange={setKindFilter}
            placeholder="Todos os tipos"
          />
        </div>
        {lastUpdate ? (
          <p className="text-xs text-zinc-500">{formatLastUpdated(lastUpdate)}</p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500">Carregando mercado…</p>
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<IconChart className="h-10 w-10 text-zinc-400" />}
          title="Nenhum ativo acompanhado"
          description="Os ativos disponíveis são cadastrados pelo administrador e atualizados automaticamente."
        />
      ) : (
        <DataTable
          data={assets}
          columns={columns}
          getRowKey={(row) => row.id}
          pageSize={10}
          searchPlaceholder="Buscar ativo…"
          emptyMessage="Nenhum ativo encontrado."
        />
      )}
    </div>
  );
}

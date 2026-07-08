"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { TableRowsSkeleton } from "@/components/ui/panel-skeleton";
import { Money } from "@/components/ui/money";
import { LineChart, Sparkline } from "@/components/ui/chart";
import { IconChart } from "@/components/ui/icons";
import {
  MARKET_KIND_SLUG_TO_KIND,
  marketAssetPath,
  marketKindPath,
  marketKindSlugForAsset,
  type MarketKindSlug,
} from "@/lib/app-routes";
import { fetchJson } from "@/lib/fetch-json";
import { formatMoney } from "@/lib/format-money";
import { formatLastUpdated } from "@/lib/spoilable-field";
import {
  MARKET_ASSET_KIND_LABELS,
  type SerializedMarketAsset,
  type SerializedMarketQuote,
} from "@/types/market";

function formatQuoteDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function AssetDetailPanel({
  asset,
  quotes,
}: {
  asset: SerializedMarketAsset;
  quotes: SerializedMarketQuote[];
}) {
  const chartData = useMemo(() => {
    if (quotes.length === 0) return [];
    const sorted = [...quotes].sort(
      (a, b) => new Date(a.quotedAt).getTime() - new Date(b.quotedAt).getTime(),
    );
    const step = Math.max(1, Math.floor(sorted.length / 60));
    const sampled = sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1);
    return sampled.map((q) => ({
      label: formatQuoteDate(q.quotedAt),
      value: q.price,
    }));
  }, [quotes]);

  const first = quotes.length > 0 ? Math.min(...quotes.map((q) => q.price)) : null;
  const last = quotes.length > 0 ? (quotes.at(-1)?.price ?? null) : null;
  const rangeReturn =
    first && last && first > 0 ? ((last - first) / first) * 100 : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {asset.logoUrl ? (
            <img
              src={asset.logoUrl}
              alt={asset.symbol}
              className="h-9 w-9 rounded-lg object-contain"
            />
          ) : null}
          <div>
            <p className="text-sm text-zinc-500">{asset.name}</p>
            <Badge variant="outline" className="mt-1 text-[10px]">
              {MARKET_ASSET_KIND_LABELS[asset.kind]}
            </Badge>
          </div>
        </div>
        <div className="text-right">
          {asset.price !== null ? (
            <Money value={asset.price} currency={asset.currencyCode} size="lg" />
          ) : null}
          {asset.changePercent !== null ? (
            <p
              className={`text-sm font-medium ${asset.changePercent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {asset.changePercent >= 0 ? "+" : ""}
              {asset.changePercent.toFixed(2)}% hoje
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Tipo</p>
            <Badge variant="outline">{MARKET_ASSET_KIND_LABELS[asset.kind]}</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Moeda / País</p>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {asset.currencyCode}
              {asset.countryCode ? ` · ${asset.countryCode}` : ""}
            </p>
          </CardContent>
        </Card>
        {rangeReturn !== null ? (
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-zinc-500">Retorno no período</p>
              <p
                className={`text-sm font-bold ${rangeReturn >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {rangeReturn >= 0 ? "+" : ""}
                {rangeReturn.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {chartData.length >= 2 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Histórico de preço — {quotes.length} cotações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={chartData}
              formatValue={(v) => formatMoney(v, { currency: asset.currencyCode })}
              showArea
              showGrid
              fullWidth
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-sm text-zinc-500">
            Sem histórico disponível para este ativo.
          </CardContent>
        </Card>
      )}

      {asset.priceUpdatedAt ? (
        <p className="text-xs text-zinc-400">{formatLastUpdated(asset.priceUpdatedAt)}</p>
      ) : null}
    </div>
  );
}

export function MarketPanel({
  kindSlug,
  assetSymbol,
  legacySymbol,
}: {
  kindSlug: MarketKindSlug;
  assetSymbol?: string | null;
  legacySymbol?: string | null;
}) {
  const router = useRouter();
  const assetKind = MARKET_KIND_SLUG_TO_KIND[kindSlug];
  const [assets, setAssets] = useState<SerializedMarketAsset[]>([]);
  const [history, setHistory] = useState<Record<string, SerializedMarketQuote[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({ history: "true", days: "90" });
      if (!legacySymbol) query.set("kind", assetKind);
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
      const list = data?.assets ?? [];
      setAssets(list);
      setHistory(data?.history ?? {});

      if (legacySymbol) {
        const match = list.find(
          (a) => a.symbol.toUpperCase() === legacySymbol.toUpperCase(),
        );
        if (match) {
          router.replace(marketAssetPath(marketKindSlugForAsset(match.kind), match.symbol));
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [assetKind, legacySymbol, router]);

  const selectedAsset = useMemo(() => {
    if (!assetSymbol) return null;
    return (
      assets.find((a) => a.symbol.toUpperCase() === assetSymbol.toUpperCase()) ?? null
    );
  }, [assetSymbol, assets]);

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
          <div className="flex items-center gap-2">
            {row.logoUrl ? (
              <img
                src={row.logoUrl}
                alt={row.symbol}
                className="h-6 w-6 rounded object-contain"
              />
            ) : null}
            <div>
              <span className="font-medium">{row.symbol}</span>
              <span className="ml-2 text-xs text-zinc-500">{row.name}</span>
            </div>
          </div>
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
        header: "Variação hoje",
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
        id: "history_return",
        header: "Retorno 90d",
        align: "right",
        sortable: true,
        sortValue: (row) => {
          const quotes = history[row.id] ?? [];
          if (quotes.length < 2) return 0;
          const sorted = [...quotes].sort(
            (a, b) => new Date(a.quotedAt).getTime() - new Date(b.quotedAt).getTime(),
          );
          const first = sorted[0]!.price;
          const last = sorted.at(-1)!.price;
          return first > 0 ? ((last - first) / first) * 100 : 0;
        },
        cell: (row) => {
          const quotes = history[row.id] ?? [];
          if (quotes.length < 2) return <span className="text-xs text-zinc-400">—</span>;
          const sorted = [...quotes].sort(
            (a, b) => new Date(a.quotedAt).getTime() - new Date(b.quotedAt).getTime(),
          );
          const first = sorted[0]!.price;
          const last = sorted.at(-1)!.price;
          const ret = first > 0 ? ((last - first) / first) * 100 : 0;
          return (
            <span
              className={
                ret >= 0
                  ? "text-sm font-medium text-emerald-600 dark:text-emerald-400"
                  : "text-sm font-medium text-red-600 dark:text-red-400"
              }
            >
              {ret >= 0 ? "+" : ""}
              {ret.toFixed(2)}%
            </span>
          );
        },
      },
      {
        id: "trend",
        header: "90 dias",
        cell: (row) => {
          const quotes = history[row.id] ?? [];
          if (quotes.length < 2) {
            return <span className="text-xs text-zinc-400">Sem histórico</span>;
          }
          const sorted = [...quotes].sort(
            (a, b) => new Date(a.quotedAt).getTime() - new Date(b.quotedAt).getTime(),
          );
          return (
            <div className="w-28">
              <Sparkline
                points={sorted.map((quote) => quote.price)}
                labels={sorted.map((quote) => formatQuoteDate(quote.quotedAt))}
                formatValue={(v) => formatMoney(v, { currency: row.currencyCode })}
              />
            </div>
          );
        },
      },
    ],
    [history],
  );

  function openAsset(asset: SerializedMarketAsset) {
    router.push(marketAssetPath(marketKindSlugForAsset(asset.kind), asset.symbol));
  }

  if (assetSymbol && selectedAsset) {
    return (
      <AssetDetailPanel
        asset={selectedAsset}
        quotes={history[selectedAsset.id] ?? []}
      />
    );
  }

  if (assetSymbol && loading) {
    return <TableRowsSkeleton rows={4} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
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
        <TableRowsSkeleton rows={6} />
      ) : assets.length === 0 ? (
        <EmptyState
          icon={<IconChart className="h-10 w-10 text-zinc-400" />}
          title="Nenhum ativo nesta categoria"
          description="Os ativos disponíveis são cadastrados pelo administrador e atualizados automaticamente."
        />
      ) : (
        <>
          <DataTable
            data={assets}
            columns={columns}
            getRowKey={(row) => row.id}
            pageSize={10}
            searchPlaceholder="Buscar ativo…"
            emptyMessage="Nenhum ativo encontrado."
            onRowClick={(row) => openAsset(row)}
          />
          <p className="text-xs text-zinc-400">Clique em um ativo para ver o gráfico completo.</p>
        </>
      )}
    </div>
  );
}

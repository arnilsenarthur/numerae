"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
  marketKindSlugForAsset,
  type MarketKindSlug,
} from "@/lib/app-routes";
import { fetchJson } from "@/lib/fetch-json";
import { formatMoney } from "@/lib/format-money";
import {
  MARKET_PERIOD_LABEL,
  normalizeMarketPeriod,
  type MarketHistoryPeriod,
} from "@/lib/market-period";
import { formatLastUpdated } from "@/lib/spoilable-field";
import {
  MARKET_ASSET_KIND_LABELS,
  type SerializedMarketAsset,
  type SerializedMarketQuote,
} from "@/types/market";

type HistoryPeriod = MarketHistoryPeriod;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const PERIOD_CONFIG: Record<HistoryPeriod, { rangeMs: number; stepMs: number }> = {
  "1D": { rangeMs: DAY_MS, stepMs: 20 * 60 * 1000 },
  "1W": { rangeMs: 7 * DAY_MS, stepMs: 2 * HOUR_MS },
  "1M": { rangeMs: 30 * DAY_MS, stepMs: 12 * HOUR_MS },
  "3M": { rangeMs: 90 * DAY_MS, stepMs: DAY_MS },
  "1A": { rangeMs: 365 * DAY_MS, stepMs: 7 * DAY_MS },
};

function formatQuoteLabel(iso: string, period: HistoryPeriod) {
  const date = new Date(iso);
  if (period === "1D" || period === "1W") {
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function quotesForPeriod(quotes: SerializedMarketQuote[], period: HistoryPeriod) {
  const sorted = [...quotes].sort(
    (a, b) => new Date(a.quotedAt).getTime() - new Date(b.quotedAt).getTime(),
  );
  if (sorted.length === 0) return sorted;
  const now = Date.now();
  const config = PERIOD_CONFIG[period];
  const start = now - config.rangeMs;
  return sorted.filter((quote) => {
    const quotedAt = new Date(quote.quotedAt).getTime();
    return quotedAt >= start && quotedAt <= now;
  });
}

function resampleByStep(quotes: SerializedMarketQuote[], stepMs: number) {
  if (quotes.length <= 2) return quotes;
  const sorted = [...quotes].sort(
    (a, b) => new Date(a.quotedAt).getTime() - new Date(b.quotedAt).getTime(),
  );
  const sampled: SerializedMarketQuote[] = [sorted[0]!];
  let lastTime = new Date(sorted[0]!.quotedAt).getTime();
  for (let index = 1; index < sorted.length - 1; index += 1) {
    const point = sorted[index]!;
    const pointTime = new Date(point.quotedAt).getTime();
    if (pointTime - lastTime >= stepMs) {
      sampled.push(point);
      lastTime = pointTime;
    }
  }
  const last = sorted[sorted.length - 1]!;
  if (sampled[sampled.length - 1]!.id !== last.id) sampled.push(last);
  return sampled;
}

function AssetDetailPanel({
  asset,
  quotes,
  period,
}: {
  asset: SerializedMarketAsset;
  quotes: SerializedMarketQuote[];
  period: HistoryPeriod;
}) {
  const scopedQuotes = useMemo(
    () => resampleByStep(quotesForPeriod(quotes, period), PERIOD_CONFIG[period].stepMs),
    [quotes, period],
  );

  const chartData = useMemo(() => {
    if (scopedQuotes.length === 0) return [];
    const sorted = scopedQuotes;
    const step = Math.max(1, Math.floor(sorted.length / 60));
    const sampled = sorted.filter((_, i) => i % step === 0 || i === sorted.length - 1);
    return sampled.map((q) => ({
      label: formatQuoteLabel(q.quotedAt, period),
      value: q.price,
    }));
  }, [period, scopedQuotes]);

  const first = scopedQuotes.length > 0 ? Math.min(...scopedQuotes.map((q) => q.price)) : null;
  const last = scopedQuotes.length > 0 ? (scopedQuotes.at(-1)?.price ?? null) : null;
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
              Histórico de preço ({MARKET_PERIOD_LABEL[period]}) — {scopedQuotes.length}/{quotes.length} cotações
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
            Sem histórico suficiente no período selecionado.
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
  onLastUpdate,
}: {
  kindSlug: MarketKindSlug;
  assetSymbol?: string | null;
  legacySymbol?: string | null;
  onLastUpdate?: (iso: string | null) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const assetKind = MARKET_KIND_SLUG_TO_KIND[kindSlug];
  const [assets, setAssets] = useState<SerializedMarketAsset[]>([]);
  const [history, setHistory] = useState<Record<string, SerializedMarketQuote[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const period = useMemo(
    () => normalizeMarketPeriod(searchParams.get("period")),
    [searchParams],
  );
  const periodHistory = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(history).map(([assetId, quotes]) => [
          assetId,
          quotesForPeriod(quotes, period),
        ]),
      ),
    [history, period],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({ history: "true" });
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
          const next = new URLSearchParams(searchParams.toString());
          next.set("period", period);
          router.replace(
            `${marketAssetPath(marketKindSlugForAsset(match.kind), match.symbol)}?${next.toString()}`,
          );
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [assetKind, assetSymbol, legacySymbol, period, router, searchParams]);

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

  useEffect(() => {
    onLastUpdate?.(lastUpdate);
  }, [lastUpdate, onLastUpdate]);

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
        header: `Retorno ${MARKET_PERIOD_LABEL[period]}`,
        align: "right",
        sortable: true,
        sortValue: (row) => {
          const quotes = periodHistory[row.id] ?? [];
          if (quotes.length < 2) return 0;
          const first = quotes[0]!.price;
          const last = quotes.at(-1)!.price;
          return first > 0 ? ((last - first) / first) * 100 : 0;
        },
        cell: (row) => {
          const quotes = periodHistory[row.id] ?? [];
          if (quotes.length < 2) return <span className="text-xs text-zinc-400">—</span>;
          const first = quotes[0]!.price;
          const last = quotes.at(-1)!.price;
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
        header: MARKET_PERIOD_LABEL[period],
        cell: (row) => {
          const quotes = periodHistory[row.id] ?? [];
          if (quotes.length < 2) {
            return <span className="text-xs text-zinc-400">Sem histórico</span>;
          }
          const sparkQuotes = resampleByStep(quotes, PERIOD_CONFIG[period].stepMs * 4);
          return (
            <div className="w-28">
              {/**
               * Sparkline keeps 25% of the line-chart precision for readability.
               */}
              <Sparkline
                points={sparkQuotes.map((quote) => quote.price)}
                labels={sparkQuotes.map((quote) => formatQuoteLabel(quote.quotedAt, period))}
                formatValue={(v) => formatMoney(v, { currency: row.currencyCode })}
              />
            </div>
          );
        },
      },
    ],
    [period, periodHistory],
  );

  function openAsset(asset: SerializedMarketAsset) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("period", period);
    router.push(
      `${marketAssetPath(marketKindSlugForAsset(asset.kind), asset.symbol)}?${next.toString()}`,
    );
  }

  if (assetSymbol && loading) {
    return <TableRowsSkeleton rows={4} />;
  }

  return (
    <div className="space-y-4">
      {assetSymbol && selectedAsset ? (
        <AssetDetailPanel
          asset={selectedAsset}
          quotes={history[selectedAsset.id] ?? []}
          period={period}
        />
      ) : null}

      {!assetSymbol ? (
        <>
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {loading ? (
            <TableRowsSkeleton rows={6} />
          ) : assets.length === 0 ? (
            <EmptyState
              icon={<IconChart className="h-6 w-6" />}
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
        </>
      ) : null}
    </div>
  );
}

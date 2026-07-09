"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MARKET_DEFAULT_KIND_SLUG,
  MARKET_KIND_NAV,
  marketKindPath,
  type MarketKindSlug,
} from "@/lib/app-routes";
import {
  MARKET_PERIOD_OPTIONS,
  normalizeMarketPeriod,
  type MarketHistoryPeriod,
} from "@/lib/market-period";
import { marketPageHeader } from "@/lib/page-meta";
import { formatLastUpdated } from "@/lib/spoilable-field";
import { MarketPanel } from "@/modules/investments/components/market-panel";

export function MarketApp({
  kindSlug = MARKET_DEFAULT_KIND_SLUG,
  assetSymbol,
  legacySymbol,
}: {
  kindSlug?: MarketKindSlug;
  assetSymbol?: string | null;
  legacySymbol?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const page = marketPageHeader(kindSlug, assetSymbol);

  const period = useMemo(
    () => normalizeMarketPeriod(searchParams.get("period")),
    [searchParams],
  );

  useEffect(() => {
    if (searchParams.get("period")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("period", period);
    router.replace(`${pathname}?${next.toString()}`);
  }, [pathname, period, router, searchParams]);

  function setPeriod(nextPeriod: MarketHistoryPeriod) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("period", nextPeriod);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function pushKindWithCurrentQuery(nextKind: MarketKindSlug) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("period", period);
    router.push(`${marketKindPath(nextKind)}?${next.toString()}`);
  }

  function goToList() {
    const next = new URLSearchParams(searchParams.toString());
    next.set("period", period);
    router.push(`${marketKindPath(kindSlug)}?${next.toString()}`);
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader meta={page} />

      <Tabs
        key={kindSlug}
        defaultValue={kindSlug}
        onValueChange={(value) => pushKindWithCurrentQuery(value as MarketKindSlug)}
      >
        <TabsList>
          {MARKET_KIND_NAV.map((item) => (
            <TabsTrigger key={item.slug} value={item.slug}>
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonGroup>
          {MARKET_PERIOD_OPTIONS.map((item) => (
            <ButtonGroupItem
              key={item.value}
              active={period === item.value}
              onClick={() => setPeriod(item.value)}
            >
              {item.label}
            </ButtonGroupItem>
          ))}
        </ButtonGroup>
        <div className="flex items-center gap-2">
          {assetSymbol ? (
            <Button type="button" variant="ghost" size="sm" onClick={goToList}>
              Voltar para lista
            </Button>
          ) : null}
          {lastUpdate ? (
            <p className="text-xs text-zinc-500">{formatLastUpdated(lastUpdate)}</p>
          ) : null}
        </div>
      </div>

      <MarketPanel
        kindSlug={kindSlug}
        assetSymbol={assetSymbol}
        legacySymbol={legacySymbol}
        onLastUpdate={setLastUpdate}
      />
    </div>
  );
}

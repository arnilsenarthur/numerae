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
  MARKET_DEFAULT_PERIOD,
  MARKET_PERIOD_CODES,
  normalizeMarketPeriod,
  periodLabelKey,
  type MarketHistoryPeriod,
} from "@/lib/market-period";
import { marketPageHeader } from "@/lib/page-meta";
import { formatLastUpdated } from "@/lib/spoilable-field";
import { useT } from "@/i18n/locale-provider";
import { MarketPanel } from "@/modules/investments/components/market-panel";
import type { SerializedMarketAsset } from "@/types/market";

export function MarketApp({
  kindSlug = MARKET_DEFAULT_KIND_SLUG,
  assetSymbol,
  legacySymbol,
}: {
  kindSlug?: MarketKindSlug;
  assetSymbol?: string | null;
  legacySymbol?: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [detailAsset, setDetailAsset] = useState<SerializedMarketAsset | null>(null);
  const page = useMemo(
    () => marketPageHeader(kindSlug, t, assetSymbol, detailAsset),
    [kindSlug, t, assetSymbol, detailAsset],
  );

  const period = useMemo(
    () => normalizeMarketPeriod(searchParams.get("period")),
    [searchParams],
  );

  useEffect(() => {
    if (searchParams.get("period")) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set("period", MARKET_DEFAULT_PERIOD);
    router.replace(`${pathname}?${next.toString()}`);
  }, [pathname, router, searchParams]);

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
              {t(`section.market.kind.${item.slug}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonGroup>
          {MARKET_PERIOD_CODES.map((code) => (
            <ButtonGroupItem
              key={code}
              active={period === code}
              onClick={() => setPeriod(code)}
            >
              {t(periodLabelKey(code))}
            </ButtonGroupItem>
          ))}
        </ButtonGroup>
        <div className="flex items-center gap-2">
          {assetSymbol ? (
            <Button type="button" variant="ghost" size="sm" onClick={goToList}>
              {t("market.backToList")}
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
        onDetailAsset={setDetailAsset}
      />
    </div>
  );
}

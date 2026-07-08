"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MARKET_DEFAULT_KIND_SLUG,
  MARKET_KIND_NAV,
  marketKindPath,
  type MarketKindSlug,
} from "@/lib/app-routes";
import { marketPageHeader } from "@/lib/page-meta";
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
  const page = marketPageHeader(kindSlug, assetSymbol);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader meta={page} />

      <Tabs
        key={kindSlug}
        defaultValue={kindSlug}
        onValueChange={(value) => router.push(marketKindPath(value as MarketKindSlug))}
      >
        <TabsList className="h-auto flex-wrap gap-1 bg-zinc-50 p-1 dark:bg-zinc-900/50">
          {MARKET_KIND_NAV.map((item) => (
            <TabsTrigger key={item.slug} value={item.slug} className="text-xs">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <MarketPanel
        kindSlug={kindSlug}
        assetSymbol={assetSymbol}
        legacySymbol={legacySymbol}
      />
    </div>
  );
}

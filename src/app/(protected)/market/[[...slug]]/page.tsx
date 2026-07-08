import { redirect } from "next/navigation";
import { MarketApp } from "@/modules/market/components/market-app";
import {
  isMarketKindSlug,
  MARKET_DEFAULT_KIND_SLUG,
  type MarketKindSlug,
} from "@/lib/app-routes";

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;

  if (!slug || slug.length === 0) {
    redirect(`/market/${MARKET_DEFAULT_KIND_SLUG}`);
  }

  if (!isMarketKindSlug(slug[0]!)) {
    return <MarketApp legacySymbol={slug[0]!} />;
  }

  const kindSlug = slug[0] as MarketKindSlug;
  const assetSymbol = slug[1] ?? null;
  return <MarketApp kindSlug={kindSlug} assetSymbol={assetSymbol} />;
}

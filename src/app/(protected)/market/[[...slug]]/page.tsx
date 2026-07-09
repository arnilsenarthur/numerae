import { redirect } from "next/navigation";
import { MarketApp } from "@/modules/market/components/market-app";
import {
  isMarketKindSlug,
  MARKET_DEFAULT_KIND_SLUG,
  type MarketKindSlug,
} from "@/lib/app-routes";

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const queryObject = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(queryObject)) {
    if (Array.isArray(value)) {
      for (const item of value) query.append(key, item);
    } else if (typeof value === "string") {
      query.set(key, value);
    }
  }
  const querySuffix = query.toString() ? `?${query.toString()}` : "";

  if (!slug || slug.length === 0) {
    redirect(`/market/${MARKET_DEFAULT_KIND_SLUG}${querySuffix}`);
  }

  // "index" is reserved by Next.js routing (/market/index → /market). Canonical slug is "indices".
  if (slug[0] === "index" || slug[0] === "indice") {
    const suffix = slug[1] ? `/${slug[1]}` : "";
    redirect(`/market/indices${suffix}${querySuffix}`);
  }

  if (!isMarketKindSlug(slug[0]!)) {
    return <MarketApp legacySymbol={slug[0]!} />;
  }

  const kindSlug = slug[0] as MarketKindSlug;
  const assetSymbol = slug[1] ?? null;
  return <MarketApp kindSlug={kindSlug} assetSymbol={assetSymbol} />;
}

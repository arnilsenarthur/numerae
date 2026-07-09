import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  serializeCurrencyForMarket,
  serializeCurrencyQuote,
} from "@/lib/currency-market";
import { prisma } from "@/lib/db";
import { serializeMarketAsset, serializeMarketQuote } from "@/lib/market-serializer";

function computeChangePercent(quotes: { price: number }[]): number | null {
  if (quotes.length < 2) return null;
  const first = quotes[0]!.price;
  const last = quotes.at(-1)!.price;
  if (first <= 0) return null;
  return ((last - first) / first) * 100;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") ?? undefined;
  const withHistory = searchParams.get("history") === "true";
  const daysParam = searchParams.get("days");
  const historyDays = daysParam
    ? Math.min(Math.max(Number(daysParam) || 90, 1), 3650)
    : null;

  try {
    if (kind === "CURRENCY") {
      const currencies = await prisma.currency.findMany({
        where: { active: true },
        orderBy: [{ countryCode: "asc" }, { code: "asc" }],
      });

      let quotesByAsset: Record<string, ReturnType<typeof serializeCurrencyQuote>[]> = {};

      if (withHistory && currencies.length > 0) {
        const since = historyDays
          ? new Date(Date.now() - historyDays * 24 * 3600 * 1000)
          : null;
        const quotes = await prisma.currencyQuote.findMany({
          where: {
            currencyId: { in: currencies.map((item) => item.id) },
            ...(since ? { quotedAt: { gte: since } } : {}),
          },
          orderBy: { quotedAt: "asc" },
        });

        for (const quote of quotes) {
          const serialized = serializeCurrencyQuote(quote);
          (quotesByAsset[quote.currencyId] ??= []).push(serialized);
        }
      }

      const assets = currencies.map((currency) => {
        const historyQuotes = (quotesByAsset[currency.id] ?? []).map((quote) => ({
          price: quote.price,
        }));
        const dayChange =
          historyQuotes.length >= 2
            ? computeChangePercent(historyQuotes.slice(-2))
            : null;
        return serializeCurrencyForMarket(currency, dayChange);
      });

      return NextResponse.json({
        assets,
        ...(withHistory ? { history: quotesByAsset } : {}),
      });
    }

    const assets = await prisma.marketAsset.findMany({
      where: {
        active: true,
        ...(kind ? { kind: kind as never } : {}),
      },
      orderBy: [{ kind: "asc" }, { symbol: "asc" }],
    });

    let quotesByAsset: Record<string, ReturnType<typeof serializeMarketQuote>[]> = {};

    if (withHistory && assets.length > 0) {
      const since = historyDays
        ? new Date(Date.now() - historyDays * 24 * 3600 * 1000)
        : null;
      const quotes = await prisma.marketQuote.findMany({
        where: {
          assetId: { in: assets.map((a) => a.id) },
          ...(since ? { quotedAt: { gte: since } } : {}),
        },
        orderBy: { quotedAt: "asc" },
      });
      quotesByAsset = {};
      for (const quote of quotes) {
        (quotesByAsset[quote.assetId] ??= []).push(serializeMarketQuote(quote));
      }
    }

    return NextResponse.json({
      assets: assets.map(serializeMarketAsset),
      ...(withHistory ? { history: quotesByAsset } : {}),
    });
  } catch (error) {
    console.error("[GET /api/market]", error);
    return NextResponse.json({ error: "Erro ao carregar mercado." }, { status: 500 });
  }
}

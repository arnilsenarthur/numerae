import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMarketAsset, serializeMarketQuote } from "@/lib/market-serializer";

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
      let quotes = await prisma.marketQuote.findMany({
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

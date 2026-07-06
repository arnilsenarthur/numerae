import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoneyMap } from "@/lib/money-map-serializer";
import { moneyMapSimulateSchema } from "@/lib/validators-money-map";
import type { ConversionNodeConfig, MoneyMapNodeInput } from "@/modules/money-map/engines/types";
import { simulateMoneyMap } from "@/modules/money-map/engines/simulation";
import { loadRouteQuotes } from "@/modules/money-map/lib/quotes";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = await request.json();
  const parsed = moneyMapSimulateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  try {
    let horizonMonths = parsed.data.horizonMonths ?? 12;
    let nodes: MoneyMapNodeInput[] = parsed.data.nodes ?? [];

    if (parsed.data.mapId) {
      const map = await prisma.moneyMap.findFirst({
        where: { id: parsed.data.mapId, userId: session.user.id, active: true },
        include: { nodes: { orderBy: { sortOrder: "asc" } } },
      });

      if (!map) {
        return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
      }

      horizonMonths = parsed.data.horizonMonths ?? map.horizonMonths;
      if (!parsed.data.nodes) {
        nodes = map.nodes.map((node) => ({
          id: node.id,
          type: node.type as MoneyMapNodeInput["type"],
          label: node.label,
          sortOrder: node.sortOrder,
          config: node.config as MoneyMapNodeInput["config"],
        }));
      }
    }

    const conversionNode = nodes.find((node) => node.type === "CONVERSION");
    const conversion = (conversionNode?.config ?? {}) as ConversionNodeConfig;

    const quotes = await loadRouteQuotes({
      institutionIds: conversion.institutionIds ?? [],
      fromCurrency: conversion.fromCurrency ?? "USD",
      toCurrency: conversion.toCurrency ?? "BRL",
    });

    const simulation = simulateMoneyMap({
      horizonMonths,
      nodes,
      quotes,
    });

    return NextResponse.json({ simulation });
  } catch (error) {
    console.error("[POST /api/money-maps/simulate]", error);
    return NextResponse.json({ error: "Erro ao simular mapa." }, { status: 500 });
  }
}

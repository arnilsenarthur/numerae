import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { moneyMapSimulateSchema } from "@/lib/validators-money-map";
import { simulateMoneyMap } from "@/modules/money-map/engines/simulation";
import type { MoneyMapEdgeInput, MoneyMapNodeInput } from "@/modules/money-map/engines/types";
import { loadQuotesForNodes } from "@/modules/money-map/lib/load-quotes-for-nodes";

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
    let edges: MoneyMapEdgeInput[] = parsed.data.edges ?? [];

    if (parsed.data.mapId) {
      const map = await prisma.moneyMap.findFirst({
        where: { id: parsed.data.mapId, userId: session.user.id, active: true },
        include: {
          nodes: { orderBy: { sortOrder: "asc" } },
          edges: true,
        },
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

      if (!parsed.data.edges) {
        edges = map.edges.map((edge) => ({
          id: edge.id,
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
          sourceHandle: edge.sourceHandle ?? "out-valor",
          targetHandle: edge.targetHandle ?? "in-valor",
        }));
      }
    }

    const quotes = await loadQuotesForNodes(nodes);

    const simulation = simulateMoneyMap({
      horizonMonths,
      nodes,
      quotes,
    });

    return NextResponse.json({ simulation, quotes });
  } catch (error) {
    console.error("[POST /api/money-maps/simulate]", error);
    return NextResponse.json({ error: "Erro ao simular mapa." }, { status: 500 });
  }
}

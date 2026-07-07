import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoneyMap } from "@/lib/money-map-serializer";
import { moneyMapCreateSchema } from "@/lib/validators-money-map";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const maps = await prisma.moneyMap.findMany({
    where: { userId: session.user.id, active: true },
    orderBy: { updatedAt: "desc" },
    include: {
      nodes: { orderBy: { sortOrder: "asc" } },
      edges: true,
    },
  });

  return NextResponse.json({ maps: maps.map(serializeMoneyMap) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = moneyMapCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const template =
      parsed.data.nodes.length > 0
        ? { nodes: parsed.data.nodes, edges: parsed.data.edges ?? [] }
        : { nodes: [], edges: [] };

    const record = await prisma.moneyMap.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        templateId: parsed.data.templateId ?? null,
        horizonMonths: parsed.data.horizonMonths,
        viewMode: parsed.data.viewMode ?? "simple",
        nodes: {
          create: template.nodes.map((node) => ({
            ...(node.id ? { id: node.id } : {}),
            type: node.type,
            label: node.label ?? null,
            sortOrder: node.sortOrder,
            config: node.config as Prisma.InputJsonValue,
          })),
        },
      },
      include: { nodes: { orderBy: { sortOrder: "asc" } }, edges: true },
    });

    if (template.edges.length > 0) {
      await prisma.moneyMapEdge.createMany({
        data: template.edges.map((edge) => ({
          mapId: record.id,
          fromNodeId: edge.fromNodeId,
          toNodeId: edge.toNodeId,
          sourceHandle: edge.sourceHandle ?? "out-valor",
          targetHandle: edge.targetHandle ?? "in-valor",
        })),
      });
    }

    const full = await prisma.moneyMap.findUniqueOrThrow({
      where: { id: record.id },
      include: { nodes: { orderBy: { sortOrder: "asc" } }, edges: true },
    });

    return NextResponse.json({ map: serializeMoneyMap(full) });
  } catch (error) {
    console.error("[POST /api/money-maps]", error);
    return NextResponse.json({ error: "Erro ao criar mapa." }, { status: 500 });
  }
}

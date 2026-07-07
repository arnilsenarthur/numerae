import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoneyMap } from "@/lib/money-map-serializer";
import { moneyMapUpdateSchema } from "@/lib/validators-money-map";

type RouteContext = { params: Promise<{ id: string }> };

async function getUserMap(id: string, userId: string) {
  return prisma.moneyMap.findFirst({
    where: { id, userId, active: true },
    include: {
      nodes: { orderBy: { sortOrder: "asc" } },
      edges: true,
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const map = await getUserMap(id, session.user.id);

  if (!map) {
    return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ map: serializeMoneyMap(map) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getUserMap(id, session.user.id);

  if (!existing) {
    return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = moneyMapUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  try {
    if (parsed.data.nodes) {
      await prisma.moneyMapEdge.deleteMany({ where: { mapId: id } });
      await prisma.moneyMapNode.deleteMany({ where: { mapId: id } });
      await prisma.moneyMapNode.createMany({
        data: parsed.data.nodes.map((node) => ({
          ...(node.id ? { id: node.id } : {}),
          mapId: id,
          type: node.type,
          label: node.label ?? null,
          sortOrder: node.sortOrder,
          config: node.config as Prisma.InputJsonValue,
        })),
      });

      if (parsed.data.edges) {
        await prisma.moneyMapEdge.createMany({
          data: parsed.data.edges.map((edge) => ({
            mapId: id,
            fromNodeId: edge.fromNodeId,
            toNodeId: edge.toNodeId,
            sourceHandle: edge.sourceHandle ?? "out-valor",
            targetHandle: edge.targetHandle ?? "in-valor",
          })),
        });
      }
    }

    const record = await prisma.moneyMap.update({
      where: { id },
      data: {
        name: parsed.data.name,
        templateId: parsed.data.templateId,
        horizonMonths: parsed.data.horizonMonths,
      },
      include: {
        nodes: { orderBy: { sortOrder: "asc" } },
        edges: true,
      },
    });

    return NextResponse.json({ map: serializeMoneyMap(record) });
  } catch (error) {
    console.error("[PATCH /api/money-maps/[id]]", error);
    return NextResponse.json({ error: "Erro ao salvar mapa." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getUserMap(id, session.user.id);

  if (!existing) {
    return NextResponse.json({ error: "Mapa não encontrado." }, { status: 404 });
  }

  await prisma.moneyMap.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}

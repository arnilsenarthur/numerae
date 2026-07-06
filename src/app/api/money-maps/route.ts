import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeMoneyMap } from "@/lib/money-map-serializer";
import { moneyMapCreateSchema } from "@/lib/validators-money-map";
import { createTemplateNodes } from "@/modules/money-map/engines/simulation";
import { MONEY_MAP_TEMPLATES } from "@/modules/money-map/engines/types";

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

    const templateId = parsed.data.templateId ?? null;
    const nodes =
      parsed.data.nodes.length > 0
        ? parsed.data.nodes
        : templateId
          ? createTemplateNodes(templateId)
          : createTemplateNodes(MONEY_MAP_TEMPLATES.PJ_USD_INCOME);

    const record = await prisma.moneyMap.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        templateId,
        horizonMonths: parsed.data.horizonMonths,
        nodes: {
          create: nodes.map((node) => ({
            type: node.type,
            label: node.label ?? null,
            sortOrder: node.sortOrder,
            config: node.config as Prisma.InputJsonValue,
          })),
        },
      },
      include: { nodes: { orderBy: { sortOrder: "asc" } } },
    });

    return NextResponse.json({ map: serializeMoneyMap(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao criar mapa." }, { status: 500 });
  }
}

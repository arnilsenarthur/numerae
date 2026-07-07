import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeGoal } from "@/lib/goal-serializer";
import { createGoalSchema } from "@/lib/validators-goal";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const moneyMapId = searchParams.get("moneyMapId")?.trim();

  try {
    const goals = await prisma.financialGoal.findMany({
      where: {
        userId: session.user.id,
        active: true,
        ...(moneyMapId ? { moneyMapId } : {}),
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ goals: goals.map(serializeGoal) });
  } catch (error) {
    console.error("[GET /api/goals]", error);
    return NextResponse.json({ error: "Erro ao carregar metas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createGoalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    if (parsed.data.moneyMapId) {
      const map = await prisma.moneyMap.findFirst({
        where: { id: parsed.data.moneyMapId, userId: session.user.id },
      });
      if (!map) {
        return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
      }
    }

    const record = await prisma.financialGoal.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title,
        targetAmount: parsed.data.targetAmount,
        currentAmount: parsed.data.currentAmount ?? 0,
        currency: parsed.data.currency,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        category: parsed.data.category,
        moneyMapId: parsed.data.moneyMapId ?? null,
      },
    });

    return NextResponse.json({ goal: serializeGoal(record) });
  } catch (error) {
    console.error("[POST /api/goals]", error);
    return NextResponse.json({ error: "Erro ao criar meta." }, { status: 500 });
  }
}

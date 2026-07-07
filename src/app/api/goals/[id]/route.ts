import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeGoal } from "@/lib/goal-serializer";
import { updateGoalSchema } from "@/lib/validators-goal";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.financialGoal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Meta não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);

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

    const record = await prisma.financialGoal.update({
      where: { id },
      data: {
        ...(parsed.data.title != null ? { title: parsed.data.title } : {}),
        ...(parsed.data.targetAmount != null ? { targetAmount: parsed.data.targetAmount } : {}),
        ...(parsed.data.currentAmount != null ? { currentAmount: parsed.data.currentAmount } : {}),
        ...(parsed.data.currency != null ? { currency: parsed.data.currency } : {}),
        ...(parsed.data.category != null ? { category: parsed.data.category } : {}),
        ...(parsed.data.active != null ? { active: parsed.data.active } : {}),
        ...(parsed.data.moneyMapId !== undefined ? { moneyMapId: parsed.data.moneyMapId } : {}),
        ...(parsed.data.deadline !== undefined
          ? { deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null }
          : {}),
      },
    });

    return NextResponse.json({ goal: serializeGoal(record) });
  } catch (error) {
    console.error("[PATCH /api/goals/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar meta." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.financialGoal.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Meta não encontrada." }, { status: 404 });
    }

    await prisma.financialGoal.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/goals/[id]]", error);
    return NextResponse.json({ error: "Erro ao remover meta." }, { status: 500 });
  }
}

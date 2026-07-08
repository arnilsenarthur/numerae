import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeGoal } from "@/lib/goal-serializer";

const updateGoalSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  currency: z.string().min(1).max(8).optional(),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
  category: z.string().max(50).optional(),
  notes: z.string().max(500).nullable().optional(),
  icon: z.string().trim().max(32).optional().nullable(),
  achieved: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

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

    const record = await prisma.financialGoal.update({
      where: { id },
      data: {
        ...(parsed.data.title !== undefined && { title: parsed.data.title }),
        ...(parsed.data.targetAmount !== undefined && { targetAmount: parsed.data.targetAmount }),
        ...(parsed.data.currentAmount !== undefined && {
          currentAmount: parsed.data.currentAmount,
        }),
        ...(parsed.data.currency !== undefined && { currency: parsed.data.currency }),
        ...(parsed.data.deadline !== undefined && {
          deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        }),
        ...(parsed.data.category !== undefined && { category: parsed.data.category }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        ...(parsed.data.icon !== undefined && { icon: parsed.data.icon }),
        ...(parsed.data.achieved !== undefined && { achieved: parsed.data.achieved }),
      },
    });

    return NextResponse.json({ goal: serializeGoal(record) });
  } catch (error) {
    console.error("[PATCH /api/goals/:id]", error);
    return NextResponse.json({ error: "Erro ao atualizar meta." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.financialGoal.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Meta não encontrada." }, { status: 404 });
    }

    await prisma.financialGoal.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/goals/:id]", error);
    return NextResponse.json({ error: "Erro ao excluir meta." }, { status: 500 });
  }
}

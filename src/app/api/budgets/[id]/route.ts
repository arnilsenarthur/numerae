import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateBudgetSchema } from "@/lib/validators-budget";
import type { SerializedBudget } from "@/types/budget";

type RouteContext = { params: Promise<{ id: string }> };

function serializeBudget(
  record: {
    id: string;
    userId: string;
    category: string;
    amount: { toNumber(): number };
    currencyCode: string;
    month: number;
    year: number;
    createdAt: Date;
    updatedAt: Date;
  },
): SerializedBudget {
  return {
    id: record.id,
    userId: record.userId,
    category: record.category,
    amount: record.amount.toNumber(),
    currencyCode: record.currencyCode,
    month: record.month,
    year: record.year,
    spent: 0,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateBudgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const existing = await prisma.budget.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }

    const record = await prisma.budget.update({
      where: { id },
      data: {
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
        ...(parsed.data.currencyCode !== undefined ? { currencyCode: parsed.data.currencyCode } : {}),
        ...(parsed.data.month !== undefined ? { month: parsed.data.month } : {}),
        ...(parsed.data.year !== undefined ? { year: parsed.data.year } : {}),
      },
    });

    return NextResponse.json({ budget: serializeBudget(record) });
  } catch (error) {
    console.error("[PATCH /api/budgets/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar orçamento." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.budget.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }

    await prisma.budget.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/budgets/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir orçamento." }, { status: 500 });
  }
}

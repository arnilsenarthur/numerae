import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeRecurring } from "@/lib/finance-serializer";
import { updateRecurringSchema } from "@/lib/validators-finance";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Recorrência não encontrada." }, { status: 404 });
    }

    const body: unknown = await request.json();
    const parsed = updateRecurringSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(data.accountId !== undefined ? { accountId: data.accountId } : {}),
        ...(data.kind !== undefined ? { kind: data.kind } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.recurrence !== undefined ? { recurrence: data.recurrence } : {}),
        ...(data.dayOfPeriod !== undefined ? { dayOfPeriod: data.dayOfPeriod } : {}),
        ...(data.nextDueAt !== undefined ? { nextDueAt: data.nextDueAt } : {}),
        ...(data.endAt !== undefined ? { endAt: data.endAt } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.counterAccountId !== undefined ? { counterAccountId: data.counterAccountId } : {}),
        ...(data.counterAmount !== undefined ? { counterAmount: data.counterAmount } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
      include: { account: { select: { name: true } } },
    });

    return NextResponse.json({ recurring: serializeRecurring(updated) });
  } catch (error) {
    console.error("[PATCH /api/recurring/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar recorrência." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.recurringTransaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Recorrência não encontrada." }, { status: 404 });
    }

    await prisma.recurringTransaction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/recurring/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir recorrência." }, { status: 500 });
  }
}

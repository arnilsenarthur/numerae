import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/finance-serializer";
import { updateTransactionSchema } from "@/lib/validators-finance";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }

    let currencyCode: string | undefined;
    if (parsed.data.accountId && parsed.data.accountId !== existing.accountId) {
      const account = await prisma.financialAccount.findFirst({
        where: { id: parsed.data.accountId, userId: session.user.id },
      });
      if (!account) {
        return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
      }
      currencyCode = account.currencyCode;
    }

    const record = await prisma.transaction.update({
      where: { id },
      data: {
        ...(parsed.data.accountId !== undefined ? { accountId: parsed.data.accountId } : {}),
        ...(currencyCode ? { currencyCode } : {}),
        ...(parsed.data.kind !== undefined ? { kind: parsed.data.kind } : {}),
        ...(parsed.data.amount !== undefined ? { amount: parsed.data.amount } : {}),
        ...(parsed.data.category !== undefined ? { category: parsed.data.category } : {}),
        ...(parsed.data.description !== undefined
          ? { description: parsed.data.description }
          : {}),
        ...(parsed.data.icon !== undefined ? { icon: parsed.data.icon ?? null } : {}),
        ...(parsed.data.date !== undefined ? { date: parsed.data.date } : {}),
        ...(parsed.data.counterAccountId !== undefined
          ? { counterAccountId: parsed.data.counterAccountId || null }
          : {}),
        ...(parsed.data.counterAmount !== undefined
          ? { counterAmount: parsed.data.counterAmount }
          : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes ?? null } : {}),
      },
      include: { account: { select: { name: true } } },
    });

    return NextResponse.json({ transaction: serializeTransaction(record) });
  } catch (error) {
    console.error("[PATCH /api/transactions/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar lançamento." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/transactions/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir lançamento." }, { status: 500 });
  }
}

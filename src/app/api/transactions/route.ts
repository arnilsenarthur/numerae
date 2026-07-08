import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/finance-serializer";
import { createTransactionSchema } from "@/lib/validators-finance";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("accountId") ?? undefined;
  const kind = searchParams.get("kind") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        ...(accountId ? { accountId } : {}),
        ...(kind === "INCOME" || kind === "EXPENSE" || kind === "TRANSFER"
          ? { kind }
          : {}),
        ...(category ? { category } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: { account: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json({ transactions: transactions.map(serializeTransaction) });
  } catch (error) {
    console.error("[GET /api/transactions]", error);
    return NextResponse.json({ error: "Erro ao carregar lançamentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createTransactionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const account = await prisma.financialAccount.findFirst({
      where: { id: parsed.data.accountId, userId: session.user.id },
    });
    if (!account) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    if (parsed.data.kind === "TRANSFER" && parsed.data.counterAccountId) {
      const counter = await prisma.financialAccount.findFirst({
        where: { id: parsed.data.counterAccountId, userId: session.user.id },
      });
      if (!counter) {
        return NextResponse.json(
          { error: "Conta de destino não encontrada." },
          { status: 404 },
        );
      }
    }

    const record = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        accountId: parsed.data.accountId,
        kind: parsed.data.kind,
        amount: parsed.data.amount,
        currencyCode: account.currencyCode,
        category: parsed.data.kind === "TRANSFER" ? "transfer" : parsed.data.category,
        description: parsed.data.description,
        icon: parsed.data.icon ?? null,
        date: parsed.data.date,
        counterAccountId:
          parsed.data.kind === "TRANSFER" ? parsed.data.counterAccountId : null,
        counterAmount:
          parsed.data.kind === "TRANSFER"
            ? parsed.data.counterAmount ?? parsed.data.amount
            : null,
        planEntryId: parsed.data.planEntryId ?? null,
        notes: parsed.data.notes ?? null,
      },
      include: { account: { select: { name: true } } },
    });

    return NextResponse.json({ transaction: serializeTransaction(record) });
  } catch (error) {
    console.error("[POST /api/transactions]", error);
    return NextResponse.json({ error: "Erro ao criar lançamento." }, { status: 500 });
  }
}

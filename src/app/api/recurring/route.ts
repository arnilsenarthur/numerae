import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeRecurring } from "@/lib/finance-serializer";
import { createRecurringSchema } from "@/lib/validators-finance";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("includeInactive") === "true";

  try {
    const records = await prisma.recurringTransaction.findMany({
      where: {
        userId: session.user.id,
        ...(includeInactive ? {} : { active: true }),
      },
      include: { account: { select: { name: true } } },
      orderBy: { nextDueAt: "asc" },
    });

    return NextResponse.json({ recurring: records.map(serializeRecurring) });
  } catch (error) {
    console.error("[GET /api/recurring]", error);
    return NextResponse.json({ error: "Erro ao carregar recorrências." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body: unknown = await request.json();
    const parsed = createRecurringSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Verify account belongs to user
    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, userId: session.user.id },
      select: { currencyCode: true },
    });
    if (!account) {
      return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    }

    const record = await prisma.recurringTransaction.create({
      data: {
        userId: session.user.id,
        accountId: data.accountId,
        kind: data.kind,
        amount: data.amount,
        currencyCode: account.currencyCode,
        category: data.category,
        description: data.description,
        icon: data.icon ?? null,
        recurrence: data.recurrence,
        dayOfPeriod: data.dayOfPeriod,
        nextDueAt: data.nextDueAt,
        endAt: data.endAt ?? null,
        counterAccountId: data.counterAccountId ?? null,
        counterAmount: data.counterAmount ?? null,
        notes: data.notes ?? null,
      },
      include: { account: { select: { name: true } } },
    });

    return NextResponse.json({ recurring: serializeRecurring(record) }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/recurring]", error);
    return NextResponse.json({ error: "Erro ao criar recorrência." }, { status: 500 });
  }
}

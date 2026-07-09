import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createBudgetSchema } from "@/lib/validators-budget";
import type { SerializedBudget } from "@/types/budget";

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
  spent = 0,
): SerializedBudget {
  return {
    id: record.id,
    userId: record.userId,
    category: record.category,
    amount: record.amount.toNumber(),
    currencyCode: record.currencyCode,
    month: record.month,
    year: record.year,
    spent,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const year = Number(searchParams.get("year") ?? now.getFullYear());

  try {
    const budgets = await prisma.budget.findMany({
      where: { userId: session.user.id, month, year },
      orderBy: { category: "asc" },
    });

    // Get spending per category for the period
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));

    const spending = await prisma.transaction.groupBy({
      by: ["category"],
      where: {
        userId: session.user.id,
        kind: "EXPENSE",
        date: { gte: from, lt: to },
      },
      _sum: { amount: true },
    });

    const spendMap = new Map<string, number>(
      spending.map((s) => [s.category, s._sum.amount?.toNumber() ?? 0]),
    );

    return NextResponse.json({
      budgets: budgets.map((b) => serializeBudget(b, spendMap.get(b.category) ?? 0)),
    });
  } catch (error) {
    console.error("[GET /api/budgets]", error);
    return NextResponse.json({ error: "Erro ao carregar orçamentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createBudgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const { category, amount, currencyCode, month, year } = parsed.data;

    const record = await prisma.budget.upsert({
      where: {
        userId_category_currencyCode_month_year: {
          userId: session.user.id,
          category,
          currencyCode,
          month,
          year,
        },
      },
      create: { userId: session.user.id, category, amount, currencyCode, month, year },
      update: { amount },
    });

    return NextResponse.json({ budget: serializeBudget(record) }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/budgets]", error);
    return NextResponse.json({ error: "Erro ao criar orçamento." }, { status: 500 });
  }
}

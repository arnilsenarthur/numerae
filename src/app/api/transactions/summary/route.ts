import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Relatório agregado de lançamentos:
 * - totais por tipo (entrada/saída) no período
 * - quebra por categoria
 * - série mensal (entradas vs saídas)
 * Todos os valores na moeda original da conta — o front agrupa por moeda.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const accountId = searchParams.get("accountId") ?? undefined;

  const where = {
    userId: session.user.id,
    kind: { not: "TRANSFER" as const },
    ...(accountId ? { accountId } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  try {
    const transactions = await prisma.transaction.findMany({
      where,
      select: {
        kind: true,
        amount: true,
        currencyCode: true,
        category: true,
        date: true,
      },
      orderBy: { date: "asc" },
    });

    type Totals = { income: number; expense: number };
    const byCurrency = new Map<string, Totals>();
    const byCategory = new Map<string, { currencyCode: string; total: number; kind: string }>();
    const byMonth = new Map<string, Map<string, Totals>>();

    for (const tx of transactions) {
      const amount = tx.amount.toNumber();
      const currency = tx.currencyCode;

      let totals = byCurrency.get(currency);
      if (!totals) {
        totals = { income: 0, expense: 0 };
        byCurrency.set(currency, totals);
      }
      if (tx.kind === "INCOME") totals.income += amount;
      else totals.expense += amount;

      const categoryKey = `${tx.category}::${currency}`;
      const cat = byCategory.get(categoryKey);
      if (cat) cat.total += amount;
      else byCategory.set(categoryKey, { currencyCode: currency, total: amount, kind: tx.kind });

      const monthKey = `${tx.date.getUTCFullYear()}-${String(tx.date.getUTCMonth() + 1).padStart(2, "0")}`;
      let monthMap = byMonth.get(monthKey);
      if (!monthMap) {
        monthMap = new Map();
        byMonth.set(monthKey, monthMap);
      }
      let monthTotals = monthMap.get(currency);
      if (!monthTotals) {
        monthTotals = { income: 0, expense: 0 };
        monthMap.set(currency, monthTotals);
      }
      if (tx.kind === "INCOME") monthTotals.income += amount;
      else monthTotals.expense += amount;
    }

    return NextResponse.json({
      totals: [...byCurrency.entries()].map(([currencyCode, totals]) => ({
        currencyCode,
        income: totals.income,
        expense: totals.expense,
        net: totals.income - totals.expense,
      })),
      categories: [...byCategory.entries()].map(([key, value]) => ({
        category: key.split("::")[0],
        currencyCode: value.currencyCode,
        kind: value.kind,
        total: value.total,
      })),
      monthly: [...byMonth.entries()].map(([month, currencies]) => ({
        month,
        series: [...currencies.entries()].map(([currencyCode, totals]) => ({
          currencyCode,
          income: totals.income,
          expense: totals.expense,
        })),
      })),
      count: transactions.length,
    });
  } catch (error) {
    console.error("[GET /api/transactions/summary]", error);
    return NextResponse.json({ error: "Erro ao gerar relatório." }, { status: 500 });
  }
}

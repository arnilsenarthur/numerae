import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "json";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date(Date.UTC(new Date().getFullYear(), 0, 1));
  const to = toParam ? new Date(toParam) : new Date();

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        date: { gte: from, lte: to },
        kind: { in: ["INCOME", "EXPENSE"] },
      },
      orderBy: { date: "asc" },
    });

    if (format === "csv") {
      const header = "Data,Descrição,Categoria,Tipo,Valor,Moeda\n";
      const rows = transactions
        .map((t) => {
          const date = t.date.toISOString().split("T")[0];
          const desc = `"${t.description.replace(/"/g, '""')}"`;
          const cat = t.category;
          const kind = t.kind === "INCOME" ? "Entrada" : "Saída";
          const amount = t.amount.toNumber().toFixed(2);
          const currency = t.currencyCode;
          return `${date},${desc},${cat},${kind},${amount},${currency}`;
        })
        .join("\n");

      const csv = header + rows;
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="relatorio-${from.toISOString().split("T")[0]}-${to.toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON aggregation
    let totalIncome = 0;
    let totalExpense = 0;
    const byCategory = new Map<string, { income: number; expense: number }>();
    const byMonth = new Map<string, { income: number; expense: number }>();

    for (const tx of transactions) {
      const amount = tx.amount.toNumber();
      if (tx.kind === "INCOME") totalIncome += amount;
      else totalExpense += amount;

      const cat = tx.category;
      const existing = byCategory.get(cat) ?? { income: 0, expense: 0 };
      if (tx.kind === "INCOME") existing.income += amount;
      else existing.expense += amount;
      byCategory.set(cat, existing);

      const monthKey = tx.date.toISOString().substring(0, 7);
      const em = byMonth.get(monthKey) ?? { income: 0, expense: 0 };
      if (tx.kind === "INCOME") em.income += amount;
      else em.expense += amount;
      byMonth.set(monthKey, em);
    }

    const topExpenseCategories = [...byCategory.entries()]
      .map(([category, totals]) => ({ category, ...totals }))
      .sort((a, b) => b.expense - a.expense)
      .slice(0, 10);

    const monthly = [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, totals]) => ({ month, ...totals }));

    const biggestExpense = transactions
      .filter((t) => t.kind === "EXPENSE")
      .sort((a, b) => b.amount.toNumber() - a.amount.toNumber())[0];

    return NextResponse.json({
      from: from.toISOString(),
      to: to.toISOString(),
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      biggestExpense: biggestExpense
        ? {
            amount: biggestExpense.amount.toNumber(),
            description: biggestExpense.description,
            category: biggestExpense.category,
            date: biggestExpense.date.toISOString(),
          }
        : null,
      topExpenseCategories,
      monthly,
    });
  } catch (error) {
    console.error("[GET /api/reports]", error);
    return NextResponse.json({ error: "Erro ao gerar relatório." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeTransaction } from "@/lib/finance-serializer";
import { createTransactionSchema } from "@/lib/validators-finance";
import type { TransactionKind } from "@/types/finance";

function parseKindFilter(kind: string | undefined): TransactionKind | undefined {
  if (kind === "INCOME" || kind === "EXPENSE" || kind === "TRANSFER") return kind;
  return undefined;
}

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
  const includeSummary = searchParams.get("summary") === "true";

  const kindFilter = parseKindFilter(kind);

  const dateFilter =
    from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {};

  const baseWhere = {
    userId: session.user.id,
    ...(accountId ? { accountId } : {}),
    ...(kindFilter ? { kind: kindFilter } : {}),
    ...(category ? { category } : {}),
    ...dateFilter,
  };

  try {
    // When summary is requested, fetch all rows (for accurate aggregation) with a
    // higher cap, then return the most-recent `limit` rows for the display list.
    const fetchAll = includeSummary;
    const rows = await prisma.transaction.findMany({
      where: baseWhere,
      include: { account: { select: { name: true } } },
      orderBy: { date: "desc" },
      ...(fetchAll ? { take: 2000 } : { take: limit }),
    });

    // Display list: top `limit` rows (already ordered desc by date)
    const displayRows = fetchAll ? rows.slice(0, limit) : rows;

    if (!includeSummary) {
      return NextResponse.json({ transactions: displayRows.map(serializeTransaction) });
    }

    // Compute summary from all rows (server-side, no extra DB query)
    type Totals = { income: number; expense: number };
    const byCurrency = new Map<string, Totals>();
    const byCategory = new Map<string, { currencyCode: string; total: number; kind: string }>();
    const byMonth = new Map<string, Map<string, Totals>>();
    let summaryCount = 0;

    for (const tx of rows) {
      if (tx.kind === "TRANSFER") continue; // exclude transfers from summary
      summaryCount++;
      const amount = tx.amount.toNumber();
      const currency = tx.currencyCode;

      let totals = byCurrency.get(currency);
      if (!totals) { totals = { income: 0, expense: 0 }; byCurrency.set(currency, totals); }
      if (tx.kind === "INCOME") totals.income += amount; else totals.expense += amount;

      const catKey = `${tx.category}::${currency}`;
      const cat = byCategory.get(catKey);
      if (cat) cat.total += amount;
      else byCategory.set(catKey, { currencyCode: currency, total: amount, kind: tx.kind });

      const monthKey = `${tx.date.getUTCFullYear()}-${String(tx.date.getUTCMonth() + 1).padStart(2, "0")}`;
      let monthMap = byMonth.get(monthKey);
      if (!monthMap) { monthMap = new Map(); byMonth.set(monthKey, monthMap); }
      let mt = monthMap.get(currency);
      if (!mt) { mt = { income: 0, expense: 0 }; monthMap.set(currency, mt); }
      if (tx.kind === "INCOME") mt.income += amount; else mt.expense += amount;
    }

    return NextResponse.json({
      transactions: displayRows.map(serializeTransaction),
      summary: {
        totals: [...byCurrency.entries()].map(([currencyCode, t]) => ({
          currencyCode, income: t.income, expense: t.expense, net: t.income - t.expense,
        })),
        categories: [...byCategory.entries()].map(([key, v]) => ({
          category: key.split("::")[0], currencyCode: v.currencyCode, kind: v.kind, total: v.total,
        })),
        monthly: [...byMonth.entries()].map(([month, currencies]) => ({
          month,
          series: [...currencies.entries()].map(([currencyCode, t]) => ({
            currencyCode, income: t.income, expense: t.expense,
          })),
        })),
        count: summaryCount,
      },
    });
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

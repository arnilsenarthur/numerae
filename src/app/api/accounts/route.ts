import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeAccountBalance, serializeAccount } from "@/lib/finance-serializer";
import { createAccountSchema } from "@/lib/validators-finance";

const INSTITUTION_ACCOUNT_SELECT = {
  name: true,
  logoUrl: true,
  type: true,
  brandColor: true,
} as const;

async function loadBalances(userId: string) {
  const grouped = await prisma.transaction.groupBy({
    by: ["accountId", "kind"],
    where: { userId },
    _sum: { amount: true },
  });

  const transfersIn = await prisma.transaction.groupBy({
    by: ["counterAccountId"],
    where: { userId, kind: "TRANSFER", counterAccountId: { not: null } },
    _sum: { counterAmount: true, amount: true },
  });

  const byAccount = new Map<
    string,
    { income: number; expense: number; transferOut: number; transferIn: number }
  >();

  function entry(accountId: string) {
    let value = byAccount.get(accountId);
    if (!value) {
      value = { income: 0, expense: 0, transferOut: 0, transferIn: 0 };
      byAccount.set(accountId, value);
    }
    return value;
  }

  for (const row of grouped) {
    const sum = row._sum.amount?.toNumber() ?? 0;
    const target = entry(row.accountId);
    if (row.kind === "INCOME") target.income += sum;
    else if (row.kind === "EXPENSE") target.expense += sum;
    else if (row.kind === "TRANSFER") target.transferOut += sum;
  }

  for (const row of transfersIn) {
    if (!row.counterAccountId) continue;
    const received = row._sum.counterAmount?.toNumber() ?? row._sum.amount?.toNumber() ?? 0;
    entry(row.counterAccountId).transferIn += received;
  }

  return byAccount;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("archived") === "true";

  try {
    const [accounts, balances] = await Promise.all([
      prisma.financialAccount.findMany({
        where: {
          userId: session.user.id,
          ...(includeArchived ? {} : { archived: false }),
        },
        include: { institution: { select: INSTITUTION_ACCOUNT_SELECT } },
        orderBy: [{ archived: "asc" }, { name: "asc" }],
      }),
      loadBalances(session.user.id),
    ]);

    return NextResponse.json({
      accounts: accounts.map((account) => {
        const sums = balances.get(account.id);
        const balance = computeAccountBalance({
          initialBalance: account.initialBalance.toNumber(),
          income: sums?.income ?? 0,
          expense: sums?.expense ?? 0,
          transferOut: sums?.transferOut ?? 0,
          transferIn: sums?.transferIn ?? 0,
        });
        return serializeAccount(account, balance);
      }),
    });
  } catch (error) {
    console.error("[GET /api/accounts]", error);
    return NextResponse.json({ error: "Erro ao carregar contas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const record = await prisma.financialAccount.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        kind: parsed.data.kind,
        currencyCode: parsed.data.currencyCode,
        countryCode: parsed.data.countryCode,
        institutionId: parsed.data.institutionId || null,
        initialBalance: parsed.data.initialBalance,
        color: parsed.data.color ?? null,
        icon: parsed.data.icon ?? null,
      },
      include: { institution: { select: INSTITUTION_ACCOUNT_SELECT } },
    });

    return NextResponse.json({ account: serializeAccount(record) });
  } catch (error) {
    console.error("[POST /api/accounts]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Sessão inválida. Faça logout e entre novamente." },
        { status: 401 },
      );
    }
    return NextResponse.json({ error: "Erro ao criar conta." }, { status: 500 });
  }
}

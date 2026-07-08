import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeInvestmentPosition } from "@/lib/market-serializer";
import { z } from "zod";

const createPositionSchema = z.object({
  name: z.string().min(1).max(100),
  assetSymbol: z.string().max(20).nullable().optional(),
  category: z.string().default("OTHER"),
  currencyCode: z.string().length(3).default("BRL"),
  institution: z.string().max(100).nullable().optional(),
  color: z.string().nullable().optional(),
  currentBalance: z.number().min(0).default(0),
  /** Total já aportado — cria um lançamento DEPOSIT inicial para o cálculo de rendimento */
  initialDeposit: z.number().min(0).nullable().optional(),
  initialDepositDate: z.string().nullable().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const positions = await prisma.investmentPosition.findMany({
      where: { userId: session.user.id, archived: false },
      include: { entries: { orderBy: { date: "asc" } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      positions: positions.map(serializeInvestmentPosition),
    });
  } catch (error) {
    console.error("[GET /api/positions]", error);
    return NextResponse.json({ error: "Erro ao carregar posições." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const body = await request.json();
    const parsed = createPositionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }
    const initialDeposit = parsed.data.initialDeposit ?? 0;
    const record = await prisma.investmentPosition.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        assetSymbol: parsed.data.assetSymbol ?? null,
        category: parsed.data.category,
        currencyCode: parsed.data.currencyCode,
        institution: parsed.data.institution ?? null,
        color: parsed.data.color ?? null,
        currentBalance: parsed.data.currentBalance,
        entries: initialDeposit > 0
          ? {
              create: {
                kind: "DEPOSIT",
                amount: initialDeposit,
                balance: null,
                date: parsed.data.initialDepositDate
                  ? new Date(parsed.data.initialDepositDate)
                  : new Date(),
                notes: "Aporte inicial",
              },
            }
          : undefined,
      },
      include: { entries: true },
    });
    return NextResponse.json({ position: serializeInvestmentPosition(record) });
  } catch (error) {
    console.error("[POST /api/positions]", error);
    return NextResponse.json({ error: "Erro ao criar posição." }, { status: 500 });
  }
}

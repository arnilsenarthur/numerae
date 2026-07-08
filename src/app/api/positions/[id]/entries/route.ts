import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeInvestmentPosition } from "@/lib/market-serializer";
import { z } from "zod";

const createEntrySchema = z.object({
  kind: z.enum(["DEPOSIT", "WITHDRAWAL", "BALANCE_UPDATE"]),
  amount: z.number().min(0),
  balance: z.number().min(0).nullable().optional(),
  date: z.string(),
  notes: z.string().max(500).nullable().optional(),
  updateCurrentBalance: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const existing = await prisma.investmentPosition.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const { kind, amount, balance, date, notes, updateCurrentBalance } = parsed.data;

    await prisma.investmentEntry.create({
      data: {
        positionId: id,
        kind,
        amount,
        balance: balance ?? null,
        date: new Date(date),
        notes: notes ?? null,
      },
    });

    // Update currentBalance if requested or if it's a balance update
    const newBalance = balance ?? null;
    if (updateCurrentBalance && newBalance !== null) {
      await prisma.investmentPosition.update({
        where: { id },
        data: { currentBalance: newBalance },
      });
    }

    const record = await prisma.investmentPosition.findUnique({
      where: { id },
      include: { entries: { orderBy: { date: "asc" } } },
    });

    return NextResponse.json({ position: serializeInvestmentPosition(record!) });
  } catch (error) {
    console.error("[POST /api/positions/[id]/entries]", error);
    return NextResponse.json({ error: "Erro ao adicionar entrada." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeInvestmentPosition } from "@/lib/market-serializer";
import { z } from "zod";

const updatePositionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  assetSymbol: z.string().max(20).nullable().optional(),
  category: z.string().optional(),
  currencyCode: z.string().length(3).optional(),
  institution: z.string().max(100).nullable().optional(),
  color: z.string().nullable().optional(),
  currentBalance: z.number().min(0).optional(),
  archived: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const record = await prisma.investmentPosition.findUnique({
      where: { id },
      include: { entries: { orderBy: { date: "asc" } } },
    });
    if (!record || record.userId !== session.user.id) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ position: serializeInvestmentPosition(record) });
  } catch (error) {
    console.error("[GET /api/positions/[id]]", error);
    return NextResponse.json({ error: "Erro ao carregar posição." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
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
    const parsed = updatePositionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }
    const record = await prisma.investmentPosition.update({
      where: { id },
      data: parsed.data,
      include: { entries: { orderBy: { date: "asc" } } },
    });
    return NextResponse.json({ position: serializeInvestmentPosition(record) });
  } catch (error) {
    console.error("[PATCH /api/positions/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar posição." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
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
    await prisma.investmentPosition.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/positions/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir posição." }, { status: 500 });
  }
}

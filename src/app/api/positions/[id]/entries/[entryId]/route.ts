import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeInvestmentPosition } from "@/lib/market-serializer";

type Params = { params: Promise<{ id: string; entryId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id, entryId } = await params;
  try {
    const position = await prisma.investmentPosition.findUnique({ where: { id } });
    if (!position || position.userId !== session.user.id) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    const entry = await prisma.investmentEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.positionId !== id) {
      return NextResponse.json({ error: "Entrada não encontrada." }, { status: 404 });
    }
    await prisma.investmentEntry.delete({ where: { id: entryId } });

    const record = await prisma.investmentPosition.findUnique({
      where: { id },
      include: { entries: { orderBy: { date: "asc" } } },
    });
    return NextResponse.json({ position: serializeInvestmentPosition(record!) });
  } catch (error) {
    console.error("[DELETE /api/positions/[id]/entries/[entryId]]", error);
    return NextResponse.json({ error: "Erro ao remover entrada." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeInvestmentPlan } from "@/lib/market-serializer";
import { updateInvestmentPlanSchema } from "@/lib/validators-finance";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = updateInvestmentPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const existing = await prisma.investmentPlan.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
    }

    const record = await prisma.investmentPlan.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.currencyCode !== undefined
          ? { currencyCode: parsed.data.currencyCode }
          : {}),
        ...(parsed.data.initialAmount !== undefined
          ? { initialAmount: parsed.data.initialAmount }
          : {}),
        ...(parsed.data.monthlyDeposit !== undefined
          ? { monthlyDeposit: parsed.data.monthlyDeposit }
          : {}),
        ...(parsed.data.horizonMonths !== undefined
          ? { horizonMonths: parsed.data.horizonMonths }
          : {}),
        ...(parsed.data.riskProfile !== undefined
          ? { riskProfile: parsed.data.riskProfile }
          : {}),
        ...(parsed.data.targetAmount !== undefined
          ? { targetAmount: parsed.data.targetAmount }
          : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    });

    return NextResponse.json({ plan: serializeInvestmentPlan(record) });
  } catch (error) {
    console.error("[PATCH /api/investment-plans/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar plano." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.investmentPlan.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Plano não encontrado." }, { status: 404 });
    }

    await prisma.investmentPlan.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/investment-plans/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir plano." }, { status: 500 });
  }
}

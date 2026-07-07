import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeInvestmentPlan } from "@/lib/market-serializer";
import { createInvestmentPlanSchema } from "@/lib/validators-finance";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const plans = await prisma.investmentPlan.findMany({
      where: { userId: session.user.id, active: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ plans: plans.map(serializeInvestmentPlan) });
  } catch (error) {
    console.error("[GET /api/investment-plans]", error);
    return NextResponse.json({ error: "Erro ao carregar planos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createInvestmentPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const record = await prisma.investmentPlan.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        currencyCode: parsed.data.currencyCode,
        initialAmount: parsed.data.initialAmount,
        monthlyDeposit: parsed.data.monthlyDeposit,
        horizonMonths: parsed.data.horizonMonths,
        riskProfile: parsed.data.riskProfile,
        targetAmount: parsed.data.targetAmount ?? null,
      },
    });

    return NextResponse.json({ plan: serializeInvestmentPlan(record) });
  } catch (error) {
    console.error("[POST /api/investment-plans]", error);
    return NextResponse.json({ error: "Erro ao criar plano." }, { status: 500 });
  }
}

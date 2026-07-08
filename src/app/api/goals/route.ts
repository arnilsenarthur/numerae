import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { serializeGoal } from "@/lib/goal-serializer";

const createGoalSchema = z.object({
  title: z.string().min(1, "Título obrigatório.").max(100),
  targetAmount: z.number().positive("Valor alvo deve ser positivo."),
  currentAmount: z.number().min(0).optional().default(0),
  currency: z.string().min(1).max(8).optional().default("BRL"),
  deadline: z.string().datetime({ offset: true }).nullable().optional(),
  category: z.string().max(50).optional().default("other"),
  notes: z.string().max(500).nullable().optional(),
  icon: z.string().trim().max(32).optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const goals = await prisma.financialGoal.findMany({
      where: { userId: session.user.id },
      orderBy: [{ achieved: "asc" }, { deadline: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ goals: goals.map(serializeGoal) });
  } catch (error) {
    console.error("[GET /api/goals]", error);
    return NextResponse.json({ error: "Erro ao carregar metas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createGoalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const record = await prisma.financialGoal.create({
      data: {
        userId: session.user.id,
        title: parsed.data.title,
        targetAmount: parsed.data.targetAmount,
        currentAmount: parsed.data.currentAmount,
        currency: parsed.data.currency,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
        category: parsed.data.category,
        notes: parsed.data.notes ?? null,
        icon: parsed.data.icon ?? null,
      },
    });

    return NextResponse.json({ goal: serializeGoal(record) }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/goals]", error);
    return NextResponse.json({ error: "Erro ao criar meta." }, { status: 500 });
  }
}

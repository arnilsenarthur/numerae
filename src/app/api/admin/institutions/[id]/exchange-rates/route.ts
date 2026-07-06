import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { serializeExchangeRate } from "@/lib/institution-serializer";
import { exchangeRateSchema } from "@/lib/validators-institutions";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  const institution = await prisma.institution.findUnique({ where: { id } });

  if (!institution) {
    return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });
  }

  const rates = await prisma.institutionExchangeRate.findMany({
    where: { institutionId: id },
    orderBy: [{ fromCurrency: "asc" }, { toCurrency: "asc" }],
  });

  return NextResponse.json({
    exchangeRates: rates.map(serializeExchangeRate),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const institution = await prisma.institution.findUnique({ where: { id } });

    if (!institution) {
      return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = exchangeRateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    if (parsed.data.fromCurrency === parsed.data.toCurrency) {
      return NextResponse.json(
        { error: "Moedas de origem e destino devem ser diferentes." },
        { status: 400 },
      );
    }

    const now = new Date();

    const record = await prisma.institutionExchangeRate.create({
      data: {
        institutionId: id,
        fromCurrency: parsed.data.fromCurrency,
        toCurrency: parsed.data.toCurrency,
        rate: parsed.data.rate,
        rateUpdatedAt: now,
        spreadPercent: parsed.data.spreadPercent,
        spreadUpdatedAt: now,
        feeFixed: parsed.data.feeFixed ?? null,
        feePercent: parsed.data.feePercent ?? null,
        notes: parsed.data.notes || null,
        active: parsed.data.active ?? true,
      },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "CREATE",
      entityType: ADMIN_ENTITY.EXCHANGE_RATE,
      entityId: record.id,
      entityLabel: `${record.fromCurrency} → ${record.toCurrency}`,
      parentType: ADMIN_ENTITY.INSTITUTION,
      parentId: id,
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ exchangeRate: serializeExchangeRate(record) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Par de moedas já cadastrado para esta instituição." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Erro ao criar taxa de câmbio." }, { status: 500 });
  }
}

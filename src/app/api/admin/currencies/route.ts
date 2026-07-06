import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { serializeCurrency } from "@/lib/catalog-serializer";
import { currencySchema } from "@/lib/validators-catalog";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("countryCode")?.trim().toUpperCase();

  const currencies = await prisma.currency.findMany({
    where: countryCode ? { countryCode } : undefined,
    orderBy: [{ active: "desc" }, { code: "asc" }],
    include: { country: { select: { name: true } } },
  });

  return NextResponse.json({ currencies: currencies.map(serializeCurrency) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await request.json();
    const parsed = currencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const country = await prisma.country.findUnique({ where: { code: parsed.data.countryCode } });
    if (!country) {
      return NextResponse.json({ error: "País não encontrado." }, { status: 400 });
    }

    const record = await prisma.currency.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        countryCode: parsed.data.countryCode,
        symbol: parsed.data.symbol || null,
        active: parsed.data.active ?? true,
      },
      include: { country: { select: { name: true } } },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "CREATE",
      entityType: ADMIN_ENTITY.CURRENCY,
      entityId: record.id,
      entityLabel: `${record.code} (${record.countryCode})`,
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ currency: serializeCurrency(record) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Moeda já cadastrada para este país." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "Erro ao criar moeda." }, { status: 500 });
  }
}

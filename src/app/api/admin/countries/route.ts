import { NextResponse } from "next/server";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { serializeCountry } from "@/lib/catalog-serializer";
import { countrySchema } from "@/lib/validators-catalog";
import { prisma } from "@/lib/db";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const countries = await prisma.country.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { currencies: true } } },
  });

  return NextResponse.json({ countries: countries.map(serializeCountry) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await request.json();
    const parsed = countrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const existing = await prisma.country.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return NextResponse.json({ error: "Código de país já cadastrado." }, { status: 409 });
    }

    const record = await prisma.country.create({
      data: {
        code: parsed.data.code,
        name: parsed.data.name,
        active: parsed.data.active ?? true,
      },
      include: { _count: { select: { currencies: true } } },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "CREATE",
      entityType: ADMIN_ENTITY.COUNTRY,
      entityId: record.code,
      entityLabel: record.name,
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ country: serializeCountry(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao criar país." }, { status: 500 });
  }
}

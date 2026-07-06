import { NextResponse } from "next/server";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { slugifyInstitution } from "@/lib/institutions";
import { serializeInstitution } from "@/lib/institution-serializer";
import { institutionSchema } from "@/lib/validators-institutions";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("countryCode")?.trim().toUpperCase();

  const institutions = await prisma.institution.findMany({
    where: countryCode ? { countryCode } : undefined,
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { exchangeRates: true } },
    },
  });

  return NextResponse.json({
    institutions: institutions.map(serializeInstitution),
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await request.json();
    const parsed = institutionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const slug = parsed.data.slug || slugifyInstitution(parsed.data.name);
    const existing = await prisma.institution.findUnique({ where: { slug } });

    if (existing) {
      return NextResponse.json({ error: "Slug já em uso." }, { status: 409 });
    }

    const record = await prisma.institution.create({
      data: {
        name: parsed.data.name,
        slug,
        type: parsed.data.type,
        countryCode: parsed.data.countryCode,
        website: parsed.data.website || null,
        logoUrl: parsed.data.logoUrl || null,
        brandColor: parsed.data.brandColor || null,
        description: parsed.data.description || null,
        active: parsed.data.active ?? true,
      },
      include: { exchangeRates: true },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "CREATE",
      entityType: ADMIN_ENTITY.INSTITUTION,
      entityId: record.id,
      entityLabel: record.name,
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ institution: serializeInstitution(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao criar instituição." }, { status: 500 });
  }
}

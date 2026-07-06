import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { serializeInstitution } from "@/lib/institution-serializer";
import { institutionUpdateSchema } from "@/lib/validators-institutions";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  const record = await prisma.institution.findUnique({
    where: { id },
    include: {
      exchangeRates: { orderBy: [{ fromCurrency: "asc" }, { toCurrency: "asc" }] },
    },
  });

  if (!record) {
    return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });
  }

  return NextResponse.json({ institution: serializeInstitution(record) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const existing = await prisma.institution.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = institutionUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugTaken = await prisma.institution.findUnique({
        where: { slug: parsed.data.slug },
      });

      if (slugTaken) {
        return NextResponse.json({ error: "Slug já em uso." }, { status: 409 });
      }
    }

    if (parsed.data.countryCode) {
      const country = await prisma.country.findUnique({
        where: { code: parsed.data.countryCode },
      });
      if (!country) {
        return NextResponse.json({ error: "País não encontrado." }, { status: 400 });
      }
    }

    const data: Prisma.InstitutionUpdateInput = {};

    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.slug !== undefined) data.slug = parsed.data.slug;
    if (parsed.data.type !== undefined) data.type = parsed.data.type;
    if (parsed.data.countryCode !== undefined) {
      data.country = { connect: { code: parsed.data.countryCode } };
    }
    if (parsed.data.website !== undefined) data.website = parsed.data.website || null;
    if (parsed.data.logoUrl !== undefined) data.logoUrl = parsed.data.logoUrl || null;
    if (parsed.data.brandColor !== undefined) data.brandColor = parsed.data.brandColor || null;
    if (parsed.data.description !== undefined) data.description = parsed.data.description || null;
    if (parsed.data.active !== undefined) data.active = parsed.data.active;

    const record = await prisma.institution.update({
      where: { id },
      data,
      include: {
        exchangeRates: { orderBy: [{ fromCurrency: "asc" }, { toCurrency: "asc" }] },
        _count: { select: { exchangeRates: true } },
      },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "UPDATE",
      entityType: ADMIN_ENTITY.INSTITUTION,
      entityId: record.id,
      entityLabel: record.name,
      before: toAuditSnapshot(existing),
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ institution: serializeInstitution(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar instituição." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const existing = await prisma.institution.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });
    }

    await prisma.institution.delete({ where: { id } });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "DELETE",
      entityType: ADMIN_ENTITY.INSTITUTION,
      entityId: existing.id,
      entityLabel: existing.name,
      before: toAuditSnapshot(existing),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Instituição não encontrada." }, { status: 404 });
  }
}

import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { serializeCountry } from "@/lib/catalog-serializer";
import { countryUpdateSchema } from "@/lib/validators-catalog";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { code } = await context.params;
  const record = await prisma.country.findUnique({
    where: { code: code.toUpperCase() },
    include: { _count: { select: { currencies: true } } },
  });

  if (!record) {
    return NextResponse.json({ error: "País não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ country: serializeCountry(record) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { code } = await context.params;

  try {
    const existing = await prisma.country.findUnique({ where: { code: code.toUpperCase() } });
    if (!existing) {
      return NextResponse.json({ error: "País não encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = countryUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const record = await prisma.country.update({
      where: { code: existing.code },
      data: {
        name: parsed.data.name ?? existing.name,
        active: parsed.data.active ?? existing.active,
      },
      include: { _count: { select: { currencies: true } } },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "UPDATE",
      entityType: ADMIN_ENTITY.COUNTRY,
      entityId: record.code,
      entityLabel: record.name,
      before: toAuditSnapshot(existing),
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ country: serializeCountry(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar país." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { code } = await context.params;

  try {
    const existing = await prisma.country.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!existing) {
      return NextResponse.json({ error: "País não encontrado." }, { status: 404 });
    }

    await prisma.country.delete({ where: { code: code.toUpperCase() } });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "DELETE",
      entityType: ADMIN_ENTITY.COUNTRY,
      entityId: existing.code,
      entityLabel: existing.name,
      before: toAuditSnapshot(existing),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "País em uso por moedas ou instituições." },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: "País não encontrado." }, { status: 404 });
  }
}

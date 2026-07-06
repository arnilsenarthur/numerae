import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { serializeInstitutionProduct } from "@/lib/product-serializer";
import { institutionProductUpdateSchema } from "@/lib/validators-institutions";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string; productId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id, productId } = await context.params;

  try {
    const existing = await prisma.institutionProduct.findFirst({
      where: { id: productId, institutionId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = institutionProductUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const data: Prisma.InstitutionProductUpdateInput = {};

    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.slug !== undefined) data.slug = parsed.data.slug;
    if (parsed.data.kind !== undefined) data.kind = parsed.data.kind;
    if (parsed.data.currencyCode !== undefined) {
      data.currencyCode = parsed.data.currencyCode || null;
    }
    if (parsed.data.description !== undefined) {
      data.description = parsed.data.description || null;
    }
    if (parsed.data.active !== undefined) data.active = parsed.data.active;

    const record = await prisma.institutionProduct.update({
      where: { id: productId },
      data,
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "UPDATE",
      entityType: ADMIN_ENTITY.INSTITUTION_PRODUCT,
      entityId: record.id,
      entityLabel: record.name,
      parentType: ADMIN_ENTITY.INSTITUTION,
      parentId: id,
      before: toAuditSnapshot(existing),
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ product: serializeInstitutionProduct(record) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Slug já em uso nesta instituição." }, { status: 409 });
    }

    return NextResponse.json({ error: "Erro ao atualizar produto." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id, productId } = await context.params;

  try {
    const existing = await prisma.institutionProduct.findFirst({
      where: { id: productId, institutionId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    await prisma.institutionProduct.delete({ where: { id: productId } });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "DELETE",
      entityType: ADMIN_ENTITY.INSTITUTION_PRODUCT,
      entityId: existing.id,
      entityLabel: existing.name,
      parentType: ADMIN_ENTITY.INSTITUTION,
      parentId: id,
      before: toAuditSnapshot(existing),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir produto." }, { status: 404 });
  }
}

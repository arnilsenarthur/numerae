import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { serializeTip } from "@/lib/tip-serializer";
import { tipUpdateSchema } from "@/lib/validators-tips";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const existing = await prisma.tip.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Dica não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = tipUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const data: Prisma.TipUpdateInput = {};
    if (parsed.data.quote !== undefined) data.quote = parsed.data.quote;
    if (parsed.data.author !== undefined) data.author = parsed.data.author;
    if (parsed.data.category !== undefined) data.category = parsed.data.category;
    if (parsed.data.sourceUrl !== undefined) data.sourceUrl = parsed.data.sourceUrl;
    if (parsed.data.sourceLabel !== undefined) data.sourceLabel = parsed.data.sourceLabel;
    if (parsed.data.active !== undefined) data.active = parsed.data.active;

    const record = await prisma.tip.update({ where: { id }, data });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "UPDATE",
      entityType: ADMIN_ENTITY.TIP,
      entityId: record.id,
      entityLabel: record.author,
      before: toAuditSnapshot(existing),
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ tip: serializeTip(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar dica." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const existing = await prisma.tip.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Dica não encontrada." }, { status: 404 });
    }

    await prisma.tip.delete({ where: { id } });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "DELETE",
      entityType: ADMIN_ENTITY.TIP,
      entityId: existing.id,
      entityLabel: existing.author,
      before: toAuditSnapshot(existing),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Dica não encontrada." }, { status: 404 });
  }
}

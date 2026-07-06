import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { serializeExchangeRate } from "@/lib/institution-serializer";
import { decimalToNumber } from "@/lib/institutions";
import { exchangeRateUpdateSchema } from "@/lib/validators-institutions";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string; rateId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id, rateId } = await context.params;

  try {
    const existing = await prisma.institutionExchangeRate.findFirst({
      where: { id: rateId, institutionId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Taxa não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = exchangeRateUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const fromCurrency = parsed.data.fromCurrency ?? existing.fromCurrency;
    const toCurrency = parsed.data.toCurrency ?? existing.toCurrency;

    if (fromCurrency === toCurrency) {
      return NextResponse.json(
        { error: "Moedas de origem e destino devem ser diferentes." },
        { status: 400 },
      );
    }

    const rateChanged =
      parsed.data.rate !== undefined &&
      parsed.data.rate.toString() !== (decimalToNumber(existing.rate)?.toString() ?? null);

    const spreadChanged =
      parsed.data.spreadPercent !== undefined &&
      parsed.data.spreadPercent.toString() !==
        (decimalToNumber(existing.spreadPercent)?.toString() ?? null);

    const data: Prisma.InstitutionExchangeRateUpdateInput = {};

    if (parsed.data.fromCurrency !== undefined) data.fromCurrency = parsed.data.fromCurrency;
    if (parsed.data.toCurrency !== undefined) data.toCurrency = parsed.data.toCurrency;
    if (parsed.data.rate !== undefined) {
      data.rate = parsed.data.rate;
      if (rateChanged) data.rateUpdatedAt = new Date();
    }
    if (parsed.data.spreadPercent !== undefined) {
      data.spreadPercent = parsed.data.spreadPercent;
      if (spreadChanged) data.spreadUpdatedAt = new Date();
    }
    if (parsed.data.feeFixed !== undefined) data.feeFixed = parsed.data.feeFixed;
    if (parsed.data.feePercent !== undefined) data.feePercent = parsed.data.feePercent;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes || null;
    if (parsed.data.active !== undefined) data.active = parsed.data.active;

    const record = await prisma.institutionExchangeRate.update({
      where: { id: rateId },
      data,
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "UPDATE",
      entityType: ADMIN_ENTITY.EXCHANGE_RATE,
      entityId: record.id,
      entityLabel: `${record.fromCurrency} → ${record.toCurrency}`,
      parentType: ADMIN_ENTITY.INSTITUTION,
      parentId: id,
      before: toAuditSnapshot(existing),
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

    return NextResponse.json({ error: "Erro ao atualizar taxa." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id, rateId } = await context.params;

  try {
    const existing = await prisma.institutionExchangeRate.findFirst({
      where: { id: rateId, institutionId: id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Taxa não encontrada." }, { status: 404 });
    }

    await prisma.institutionExchangeRate.delete({ where: { id: rateId } });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "DELETE",
      entityType: ADMIN_ENTITY.EXCHANGE_RATE,
      entityId: existing.id,
      entityLabel: `${existing.fromCurrency} → ${existing.toCurrency}`,
      parentType: ADMIN_ENTITY.INSTITUTION,
      parentId: id,
      before: toAuditSnapshot(existing),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir taxa." }, { status: 404 });
  }
}

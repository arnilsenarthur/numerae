import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { serializeCurrency } from "@/lib/catalog-serializer";
import { decimalToNumber } from "@/lib/institutions";
import { currencyUpdateSchema } from "@/lib/validators-catalog";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const existing = await prisma.currency.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Moeda não encontrada." }, { status: 404 });
    }

    const body = await request.json();
    const parsed = currencyUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    if (parsed.data.countryCode) {
      const country = await prisma.country.findUnique({ where: { code: parsed.data.countryCode } });
      if (!country) {
        return NextResponse.json({ error: "País não encontrado." }, { status: 400 });
      }
    }

    const usdRateChanged =
      parsed.data.usdRate !== undefined &&
      (parsed.data.usdRate?.toString() ?? null) !==
        (decimalToNumber(existing.usdRate)?.toString() ?? null);

    const data: Prisma.CurrencyUpdateInput = {};

    if (parsed.data.code !== undefined) data.code = parsed.data.code;
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.symbol !== undefined) data.symbol = parsed.data.symbol || null;
    if (parsed.data.active !== undefined) data.active = parsed.data.active;
    if (parsed.data.usdRateTtlSeconds !== undefined) {
      data.usdRateTtlSeconds = parsed.data.usdRateTtlSeconds;
    }

    if (parsed.data.countryCode !== undefined) {
      data.country = { connect: { code: parsed.data.countryCode } };
    }

    if (parsed.data.usdRate !== undefined) {
      data.usdRate =
        parsed.data.usdRate === null ? null : new Prisma.Decimal(parsed.data.usdRate);
      if (usdRateChanged) data.usdRateUpdatedAt = new Date();
    }

    const record = await prisma.currency.update({
      where: { id },
      data,
      include: { country: { select: { name: true } } },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "UPDATE",
      entityType: ADMIN_ENTITY.CURRENCY,
      entityId: record.id,
      entityLabel: `${record.code} (${record.countryCode})`,
      before: toAuditSnapshot(existing),
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ currency: serializeCurrency(record) });
  } catch (error) {
    console.error("[PATCH /api/admin/currencies/[id]]", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Moeda já cadastrada para este país." },
        { status: 409 },
      );
    }

    const details = error instanceof Error ? error.message : "Erro desconhecido.";
    return NextResponse.json(
      {
        error: "Erro ao atualizar moeda.",
        ...(process.env.NODE_ENV === "development" ? { details } : {}),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const existing = await prisma.currency.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Moeda não encontrada." }, { status: 404 });
    }

    await prisma.currency.delete({ where: { id } });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "DELETE",
      entityType: ADMIN_ENTITY.CURRENCY,
      entityId: existing.id,
      entityLabel: `${existing.code} (${existing.countryCode})`,
      before: toAuditSnapshot(existing),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Moeda não encontrada." }, { status: 404 });
  }
}

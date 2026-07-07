import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { serializeMarketAsset } from "@/lib/market-serializer";

const patchSchema = z.object({
  symbol: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()).optional(),
  name: z.string().trim().min(1).max(120).optional(),
  kind: z.enum(["STOCK", "ETF", "FII", "CRYPTO", "INDEX", "COMMODITY"]).optional(),
  exchange: z.string().trim().max(40).optional().nullable(),
  currencyCode: z.string().trim().min(2).max(8).transform((v) => v.toUpperCase()).optional(),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional()
    .nullable(),
  logoUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  price: z.number().positive().optional().nullable(),
  priceTtlSeconds: z.number().int().min(60).optional(),
  active: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const before = await prisma.marketAsset.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    const record = await prisma.marketAsset.update({
      where: { id },
      data: {
        ...(parsed.data.symbol !== undefined ? { symbol: parsed.data.symbol } : {}),
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.kind !== undefined ? { kind: parsed.data.kind } : {}),
        ...(parsed.data.exchange !== undefined ? { exchange: parsed.data.exchange } : {}),
        ...(parsed.data.currencyCode !== undefined
          ? { currencyCode: parsed.data.currencyCode }
          : {}),
        ...(parsed.data.countryCode !== undefined
          ? { countryCode: parsed.data.countryCode }
          : {}),
        ...(parsed.data.logoUrl !== undefined ? { logoUrl: parsed.data.logoUrl } : {}),
        ...(parsed.data.price !== undefined
          ? {
              price: parsed.data.price,
              priceUpdatedAt: parsed.data.price !== null ? new Date() : null,
            }
          : {}),
        ...(parsed.data.priceTtlSeconds !== undefined
          ? { priceTtlSeconds: parsed.data.priceTtlSeconds }
          : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
      },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "UPDATE",
      entityType: ADMIN_ENTITY.MARKET_ASSET,
      entityId: record.id,
      entityLabel: record.symbol,
      before: toAuditSnapshot(before),
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ asset: serializeMarketAsset(record) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Símbolo já cadastrado." }, { status: 409 });
    }
    console.error("[PATCH /api/admin/market-assets/[id]]", error);
    return NextResponse.json({ error: "Erro ao atualizar ativo." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const before = await prisma.marketAsset.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Ativo não encontrado." }, { status: 404 });
    }

    await prisma.marketAsset.delete({ where: { id } });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "DELETE",
      entityType: ADMIN_ENTITY.MARKET_ASSET,
      entityId: id,
      entityLabel: before.symbol,
      before: toAuditSnapshot(before),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/admin/market-assets/[id]]", error);
    return NextResponse.json({ error: "Erro ao excluir ativo." }, { status: 500 });
  }
}

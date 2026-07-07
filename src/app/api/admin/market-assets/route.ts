import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { serializeMarketAsset } from "@/lib/market-serializer";

const marketAssetSchema = z.object({
  symbol: z.string().trim().min(1).max(20).transform((v) => v.toUpperCase()),
  name: z.string().trim().min(1).max(120),
  kind: z.enum(["STOCK", "ETF", "FII", "CRYPTO", "INDEX", "COMMODITY"]).default("STOCK"),
  exchange: z.string().trim().max(40).optional().nullable(),
  currencyCode: z.string().trim().min(2).max(8).transform((v) => v.toUpperCase()).default("USD"),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .optional()
    .nullable(),
  logoUrl: z.string().trim().url().optional().nullable().or(z.literal("").transform(() => null)),
  active: z.boolean().optional(),
});

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind")?.trim();

  const assets = await prisma.marketAsset.findMany({
    where: kind ? { kind: kind as never } : undefined,
    orderBy: [{ active: "desc" }, { kind: "asc" }, { symbol: "asc" }],
  });

  return NextResponse.json({ assets: assets.map(serializeMarketAsset) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await request.json();
    const parsed = marketAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const record = await prisma.marketAsset.create({
      data: {
        symbol: parsed.data.symbol,
        name: parsed.data.name,
        kind: parsed.data.kind,
        exchange: parsed.data.exchange ?? null,
        currencyCode: parsed.data.currencyCode,
        countryCode: parsed.data.countryCode ?? null,
        logoUrl: parsed.data.logoUrl ?? null,
        active: parsed.data.active ?? true,
      },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "CREATE",
      entityType: ADMIN_ENTITY.MARKET_ASSET,
      entityId: record.id,
      entityLabel: record.symbol,
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ asset: serializeMarketAsset(record) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Símbolo já cadastrado." }, { status: 409 });
    }
    console.error("[POST /api/admin/market-assets]", error);
    return NextResponse.json({ error: "Erro ao criar ativo." }, { status: 500 });
  }
}

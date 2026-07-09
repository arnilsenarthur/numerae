import { NextResponse } from "next/server";
import { ADMIN_ENTITY, logAdminAction, toAuditSnapshot } from "@/lib/admin-audit";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { DEFAULT_LOCALE, resolveAppLocale } from "@/i18n/locales";
import { serializeTip } from "@/lib/tip-serializer";
import { tipSchema } from "@/lib/validators-tips";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { searchParams } = new URL(request.url);
  const localeParam = searchParams.get("locale")?.trim();
  const locale = localeParam ? resolveAppLocale(localeParam) : undefined;

  const tips = await prisma.tip.findMany({
    where: locale ? { locale } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ tips: tips.map(serializeTip) });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    const body = await request.json();
    const parsed = tipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
        { status: 400 },
      );
    }

    const record = await prisma.tip.create({
      data: {
        quote: parsed.data.quote,
        author: parsed.data.author,
        category: parsed.data.category ?? "general",
        locale: parsed.data.locale ?? DEFAULT_LOCALE,
        sourceUrl: parsed.data.sourceUrl,
        sourceLabel: parsed.data.sourceLabel,
        active: parsed.data.active ?? true,
      },
    });

    await logAdminAction({
      userId: admin.session.user.id,
      action: "CREATE",
      entityType: ADMIN_ENTITY.TIP,
      entityId: record.id,
      entityLabel: record.author,
      after: toAuditSnapshot(record),
    });

    return NextResponse.json({ tip: serializeTip(record) });
  } catch {
    return NextResponse.json({ error: "Erro ao criar dica." }, { status: 500 });
  }
}

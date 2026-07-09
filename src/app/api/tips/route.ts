import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveLocaleFromRequest } from "@/i18n/request-locale";
import { serializeTip } from "@/lib/tip-serializer";
import { resolveAppLocale } from "@/i18n/locales";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const pref = await prisma.userPreference.findUnique({
    where: { userId: session.user.id },
    select: { language: true },
  });
  const locale = resolveAppLocale(pref?.language ?? resolveLocaleFromRequest(request));

  const tips = await prisma.tip.findMany({
    where: { active: true, locale, sourceUrl: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  });

  return NextResponse.json({ tips: tips.map(serializeTip), locale });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { tipOfDayIndex } from "@/lib/tip-of-day";
import { serializeTip } from "@/lib/tip-serializer";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const tips = await prisma.tip.findMany({
    where: { active: true, sourceUrl: { not: null } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });

  if (tips.length === 0) {
    return NextResponse.json({ tip: null });
  }

  const index = tipOfDayIndex(tips.length);
  return NextResponse.json({ tip: serializeTip(tips[index]!) });
}

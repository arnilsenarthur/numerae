import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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

  return NextResponse.json({ tips: tips.map(serializeTip) });
}

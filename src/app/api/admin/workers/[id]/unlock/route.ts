import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { serializeWorker } from "@/lib/workers/runner";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  const existing = await prisma.worker.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Worker não encontrado." }, { status: 404 });
  }

  const record = await prisma.worker.update({
    where: { id },
    data: { runningSince: null },
    include: {
      runs: { orderBy: { createdAt: "desc" }, take: 3 },
    },
  });

  return NextResponse.json({ worker: serializeWorker(record) });
}

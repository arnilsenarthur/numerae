import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { serializeWorkerRun } from "@/lib/workers/runner";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;
  const limit = Math.min(
    100,
    Math.max(1, Number(new URL(request.url).searchParams.get("limit") ?? "30")),
  );

  const worker = await prisma.worker.findUnique({ where: { id }, select: { id: true } });
  if (!worker) {
    return NextResponse.json({ error: "Worker não encontrado." }, { status: 404 });
  }

  const runs = await prisma.workerRun.findMany({
    where: { workerId: id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ runs: runs.map(serializeWorkerRun) });
}

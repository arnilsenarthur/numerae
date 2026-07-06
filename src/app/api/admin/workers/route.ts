import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { ensureWorkersSeeded, serializeWorker } from "@/lib/workers/runner";

export async function GET() {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  await ensureWorkersSeeded();

  const workers = await prisma.worker.findMany({
    orderBy: { id: "asc" },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  return NextResponse.json({
    workers: workers.map(serializeWorker),
  });
}

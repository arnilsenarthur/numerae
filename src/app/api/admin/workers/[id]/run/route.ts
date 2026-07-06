import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { runWorkerById } from "@/lib/workers/runner";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  try {
    const result = await runWorkerById(id, "MANUAL");
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao executar worker.";
    const status = message.includes("não encontrado") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

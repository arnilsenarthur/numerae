import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getWorkerDefinition, isWorkerProviderId } from "@/lib/workers/registry";
import { serializeWorker } from "@/lib/workers/runner";
import { workerUpdateSchema } from "@/lib/validators-workers";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  const worker = await prisma.worker.findUnique({
    where: { id },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!worker) {
    return NextResponse.json({ error: "Worker não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ worker: serializeWorker(worker) });
}

export async function PATCH(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { id } = await context.params;

  const existing = await prisma.worker.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Worker não encontrado." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = workerUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 },
    );
  }

  const definition = getWorkerDefinition(id);
  const allowed = new Set(definition?.allowedProviders ?? []);

  if (parsed.data.primaryProvider && !allowed.has(parsed.data.primaryProvider)) {
    return NextResponse.json(
      { error: "Provedor primário não permitido para este worker." },
      { status: 400 },
    );
  }

  if (
    parsed.data.secondaryProvider &&
    !allowed.has(parsed.data.secondaryProvider)
  ) {
    return NextResponse.json(
      { error: "Provedor secundário não permitido para este worker." },
      { status: 400 },
    );
  }

  const nextPrimary = parsed.data.primaryProvider ?? existing.primaryProvider;
  const nextSecondary =
    parsed.data.secondaryProvider !== undefined
      ? parsed.data.secondaryProvider
      : existing.secondaryProvider;

  if (nextSecondary && nextSecondary === nextPrimary) {
    return NextResponse.json(
      { error: "Provedor primário e secundário devem ser diferentes." },
      { status: 400 },
    );
  }

  if (nextPrimary && !isWorkerProviderId(nextPrimary)) {
    return NextResponse.json({ error: "Provedor primário inválido." }, { status: 400 });
  }

  const record = await prisma.worker.update({
    where: { id },
    data: {
      enabled: parsed.data.enabled,
      primaryProvider: parsed.data.primaryProvider,
      secondaryProvider: parsed.data.secondaryProvider,
      intervalSeconds: parsed.data.intervalSeconds,
      historyLookbackDays: parsed.data.historyLookbackDays,
    },
    include: {
      runs: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });

  return NextResponse.json({ worker: serializeWorker(record) });
}

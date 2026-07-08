import { NextResponse } from "next/server";
import { ensureWorkersSeeded, runDueWorkers, runWorkerById } from "@/lib/workers/runner";
import { prisma } from "@/lib/db";

function isAuthorizedCron(request: Request) {
  if (request.headers.get("x-vercel-cron") === "1") {
    return true;
  }

  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  return request.headers.get("x-cron-secret") === secret;
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  await ensureWorkersSeeded();

  try {
    if (force) {
      const workers = await prisma.worker.findMany({ where: { enabled: true } });
      const results = [];

      for (const worker of workers) {
        const result = await runWorkerById(worker.id, "CRON", { bypassDue: true });
        if (result) {
          results.push({ workerId: worker.id, run: result.run });
        }
      }

      return NextResponse.json({ ok: true, runs: results });
    }

    const runs = await runDueWorkers("CRON");
    return NextResponse.json({ ok: true, runs });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao executar cron.",
      },
      { status: 500 },
    );
  }
}

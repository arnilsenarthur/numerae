import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { maybeRunDueWorkers } from "@/lib/workers/tick";

export async function POST() {
  const session = await auth();

  if (!session?.user?.active) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const result = await maybeRunDueWorkers();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro ao executar workers.",
      },
      { status: 500 },
    );
  }
}

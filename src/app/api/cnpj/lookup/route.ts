import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isValidCnpj, stripCnpj } from "@/lib/cnpj";
import { lookupCnpjFromBrasilApi } from "@/lib/cnpj-lookup";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const cnpj = stripCnpj(new URL(request.url).searchParams.get("cnpj") ?? "");

  if (!isValidCnpj(cnpj)) {
    return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = rateLimit(`cnpj-lookup:${ip}`, 20, 15 * 60 * 1000);

  if (!limit.success) {
    return NextResponse.json(
      { error: "Muitas consultas. Aguarde alguns minutos." },
      { status: 429 },
    );
  }

  try {
    const result = await lookupCnpjFromBrasilApi(cnpj);

    if (!result) {
      return NextResponse.json(
        { error: "CNPJ não encontrado na Receita Federal." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: result });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível consultar o CNPJ agora." },
      { status: 503 },
    );
  }
}

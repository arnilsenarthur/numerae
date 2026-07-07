import { NextResponse } from "next/server";

const FRANKFURTER_BASE = "https://api.frankfurter.app";

/**
 * GET /api/exchange-rate?from=USD&to=BRL
 * Proxies Frankfurter API for current market exchange rate.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "USD").toUpperCase();
  const to = (searchParams.get("to") ?? "BRL").toUpperCase();

  if (from === to) {
    return NextResponse.json({ from, to, rate: 1, date: new Date().toISOString().slice(0, 10) });
  }

  try {
    const res = await fetch(`${FRANKFURTER_BASE}/latest?from=${from}&to=${to}`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Não foi possível obter a cotação." },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      amount: number;
      base: string;
      date: string;
      rates: Record<string, number>;
    };

    const rate = data.rates[to];
    if (rate == null) {
      return NextResponse.json({ error: `Moeda ${to} não disponível.` }, { status: 404 });
    }

    return NextResponse.json({ from, to, rate, date: data.date });
  } catch {
    return NextResponse.json({ error: "Erro ao consultar cotação." }, { status: 500 });
  }
}

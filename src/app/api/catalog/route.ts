import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializeCountry, serializeCurrency } from "@/lib/catalog-serializer";
import { serializeInstitution } from "@/lib/institution-serializer";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const [countries, currencies, institutions] = await Promise.all([
    prisma.country.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { currencies: true } } },
    }),
    prisma.currency.findMany({
      where: { active: true },
      orderBy: [{ code: "asc" }, { countryCode: "asc" }],
      include: { country: { select: { name: true } } },
    }),
    prisma.institution.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { _count: { select: { exchangeRates: true } } },
    }),
  ]);

  return NextResponse.json({
    countries: countries.map(serializeCountry),
    currencies: currencies.map(serializeCurrency),
    institutions: institutions.map(serializeInstitution),
  });
}

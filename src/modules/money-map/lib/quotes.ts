import "server-only";

import { decimalToNumber } from "@/lib/institutions";
import { prisma } from "@/lib/db";
import { buildRouteQuote } from "@/modules/money-map/engines/conversion";
import type { RouteQuote } from "@/modules/money-map/engines/types";

export async function loadRouteQuotes(input: {
  institutionIds: string[];
  fromCurrency: string;
  toCurrency: string;
}): Promise<RouteQuote[]> {
  if (input.institutionIds.length === 0) return [];

  const rates = await prisma.institutionExchangeRate.findMany({
    where: {
      institutionId: { in: input.institutionIds },
      fromCurrency: input.fromCurrency,
      toCurrency: input.toCurrency,
      active: true,
    },
    include: {
      institution: { select: { id: true, name: true, slug: true } },
    },
  });

  return rates.map((row) =>
    buildRouteQuote({
      institutionId: row.institution.id,
      institutionName: row.institution.name,
      institutionSlug: row.institution.slug,
      fromCurrency: row.fromCurrency,
      toCurrency: row.toCurrency,
      rate: decimalToNumber(row.rate)!,
      spreadPercent: decimalToNumber(row.spreadPercent)!,
      feeFixed: decimalToNumber(row.feeFixed),
      feePercent: decimalToNumber(row.feePercent),
      rateUpdatedAt: row.rateUpdatedAt,
      rateTtlSeconds: row.rateTtlSeconds,
    }),
  );
}

export async function listActiveInstitutionsForPicker() {
  return prisma.institution.findMany({
    where: { active: true, countryCode: "BR" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, type: true },
  });
}

import type { MoneyMapNodeInput } from "@/modules/money-map/engines/types";
import { collectQuoteRequestsFromEntries } from "@/modules/money-map/engines/treatment-eval";
import { parseTreatments, type PlanEntryConfig } from "@/modules/money-map/plan/entry-types";
import { listActiveInstitutionsForPicker, loadRouteQuotes } from "@/modules/money-map/lib/quotes";

function parseEntryConfig(config: unknown): PlanEntryConfig {
  const c = config as PlanEntryConfig;
  return {
    amount: Number(c.amount) || 0,
    currency: c.currency ?? "BRL",
    period: c.period ?? "monthly",
    category: String(c.category ?? "other"),
    movement: true,
    source: "manual",
    treatments: parseTreatments(c.treatments),
  };
}

export async function loadQuotesForNodes(nodes: MoneyMapNodeInput[]) {
  const entries = nodes
    .filter((node) => node.type === "INCOME" || node.type === "EXPENSE")
    .map((node) => ({ config: parseEntryConfig(node.config) }));

  const requests = collectQuoteRequestsFromEntries(entries);
  if (requests.length === 0) return [];

  const allInstitutions = await listActiveInstitutionsForPicker();
  const allIds = allInstitutions.map((institution) => institution.id);
  const allQuotes = [];

  for (const request of requests) {
    const institutionIds =
      request.institutionIds.length > 0
        ? request.institutionIds
        : request.compareAll
          ? allIds
          : [];

    if (institutionIds.length === 0) continue;

    const quotes = await loadRouteQuotes({
      institutionIds,
      fromCurrency: request.fromCurrency,
      toCurrency: request.toCurrency,
    });
    allQuotes.push(...quotes);
  }

  return allQuotes;
}

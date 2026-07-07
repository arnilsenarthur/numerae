import { calculatePjBr } from "@/modules/calculator/engines/br/pj";
import {
  convertWithQuote,
  monthlyAmount,
} from "@/modules/money-map/engines/conversion";
import { accumulateDeposits } from "@/modules/money-map/engines/financial-math";
import type { RouteQuote } from "@/modules/money-map/engines/types";
import type {
  AccumulatorTreatment,
  ConversionTreatment,
  PlanEntryConfig,
  PlanTreatment,
  TaxPjTreatment,
} from "@/modules/money-map/plan/entry-types";

export type TreatmentStep = {
  label: string;
  amount: number;
  currency: string;
};

export type EntryEvalResult = {
  entryId: string;
  entryLabel: string;
  routeId: string;
  routeLabel: string;
  institutionId: string;
  institutionName: string;
  quote: RouteQuote | null;
  grossInSource: number;
  sourceCurrency: string;
  outputCurrency: string;
  outputAmount: number;
  grossBrlMonth: number;
  taxBrlMonth: number;
  investedBrlMonth: number;
  netBrlMonth: number;
  steps: TreatmentStep[];
  accumulator?: { months: number; cumulativeBrl: number; annualRatePercent: number };
};

export type QuoteRequest = {
  institutionIds: string[];
  fromCurrency: string;
  toCurrency: string;
  /** Quando true, carrega cotações de todas as instituições se institutionIds vazio. */
  compareAll?: boolean;
};

function findQuote(
  quotes: RouteQuote[],
  institutionId: string,
  fromCurrency: string,
  toCurrency: string,
): RouteQuote | null {
  return (
    quotes.find(
      (q) =>
        q.institutionId === institutionId &&
        q.fromCurrency === fromCurrency &&
        q.toCurrency === toCurrency,
    ) ?? null
  );
}

function findAnyQuote(
  quotes: RouteQuote[],
  fromCurrency: string,
  toCurrency: string,
  institutionId?: string,
): RouteQuote | null {
  if (institutionId && institutionId !== "direct") {
    const exact = findQuote(quotes, institutionId, fromCurrency, toCurrency);
    if (exact) return exact;
  }
  return quotes.find((q) => q.fromCurrency === fromCurrency && q.toCurrency === toCurrency) ?? null;
}

function toBrl(amount: number, currency: string, quote: RouteQuote | null): number | null {
  if (currency === "BRL") return amount;
  if (!quote) return null;
  return convertWithQuote(amount, quote).converted;
}

function conversionInstitutionIds(treatment: ConversionTreatment): string[] {
  return treatment.institutionIds.filter(Boolean);
}

function resolveConversionBranches(
  treatments: PlanTreatment[],
  quotes: RouteQuote[],
  entryCurrency: string,
): string[] {
  const conversion = treatments.find((t): t is ConversionTreatment => t.type === "conversion");
  if (!conversion) return ["direct"];

  const ids = conversionInstitutionIds(conversion);
  if (ids.length > 0) return ids;

  const fromCurrency = entryCurrency;
  const fallback = quotes.filter(
    (q) => q.fromCurrency === fromCurrency && q.toCurrency === conversion.toCurrency,
  );
  if (fallback.length > 0) return [...new Set(fallback.map((q) => q.institutionId))];
  return ["direct"];
}

export function evaluateEntryPipeline(input: {
  entryId: string;
  entryLabel: string;
  config: PlanEntryConfig;
  treatments: PlanTreatment[];
  quotes: RouteQuote[];
  institutionId: string;
  horizonMonths: number;
}): EntryEvalResult {
  const { config, treatments, quotes, institutionId, horizonMonths } = input;
  const grossInSource = monthlyAmount(config.amount, config.period);
  let amount = grossInSource;
  let currency = config.currency;
  let quote: RouteQuote | null = null;
  let institutionName = institutionId === "direct" ? "Direto" : institutionId;
  let taxBrlMonth = 0;
  let investedBrlMonth = 0;
  const steps: TreatmentStep[] = [];

  steps.push({
    label: input.entryLabel || "Entrada",
    amount: grossInSource,
    currency: config.currency,
  });

  let accumulator: EntryEvalResult["accumulator"];

  for (const treatment of treatments) {
    if (treatment.type === "conversion") {
      const fromCurrency = currency;
      const toCurrency = treatment.toCurrency;

      if (currency === toCurrency) continue;

      const instId =
        institutionId === "direct" ? treatment.institutionIds[0] ?? "" : institutionId;

      quote = instId
        ? findQuote(quotes, instId, fromCurrency, toCurrency)
        : findAnyQuote(quotes, fromCurrency, toCurrency, institutionId);

      if (quote) {
        institutionName = quote.institutionName;
        const { converted } = convertWithQuote(amount, quote);
        amount = converted;
        currency = toCurrency;
        steps.push({
          label: `${quote.institutionName} · ${fromCurrency}→${toCurrency}`,
          amount: converted,
          currency: toCurrency,
        });
      } else {
        steps.push({
          label: `Sem cotação ${fromCurrency}→${toCurrency}`,
          amount,
          currency,
        });
      }
      continue;
    }

    const grossBrl = currency === "BRL" ? amount : toBrl(amount, currency, quote);

    if (treatment.type === "tax_pj") {
      const tax = treatment as TaxPjTreatment;
      const baseBrl = grossBrl ?? (currency === "BRL" ? amount : 0);
      const pj = calculatePjBr({
        grossRevenue: baseBrl,
        taxRatePercent: tax.taxRatePercent,
        taxRegime: tax.taxRegime ?? "simples",
        cnaeCode: tax.cnaeCode ?? undefined,
      });
      taxBrlMonth += pj.totalDeductions;
      amount = pj.net;
      currency = "BRL";
      const stepLabel = tax.companyId ? "Imposto PJ (empresa)" : "Imposto PJ";
      steps.push({ label: stepLabel, amount: pj.net, currency: "BRL" });
      continue;
    }

    if (treatment.type === "investment") {
      const netBrl = currency === "BRL" ? amount : (grossBrl ?? 0);
      const invested = (netBrl * treatment.percentOfNet) / 100;
      investedBrlMonth += invested;
      amount = netBrl - invested;
      currency = "BRL";
      steps.push({ label: `Investimento (${treatment.percentOfNet}%)`, amount, currency: "BRL" });
      continue;
    }

    if (treatment.type === "accumulator") {
      const acc = treatment as AccumulatorTreatment;
      const months = acc.months || horizonMonths;
      const netBrl = currency === "BRL" ? amount : (grossBrl ?? 0);
      const rate = (acc.annualRatePercent ?? 0) / 100;
      accumulator = {
        months,
        cumulativeBrl: accumulateDeposits(netBrl, months, rate),
        annualRatePercent: acc.annualRatePercent ?? 0,
      };
      steps.push({
        label: `Acumulador ${months}m`,
        amount: accumulator.cumulativeBrl / Math.max(1, months),
        currency: "BRL",
      });
    }
  }

  const netBrlMonth =
    currency === "BRL" ? amount : toBrl(amount, currency, quote) ?? 0;

  const grossBrlMonth =
    currency === "BRL" ? netBrlMonth + taxBrlMonth + investedBrlMonth : 0;

  return {
    entryId: input.entryId,
    entryLabel: input.entryLabel,
    routeId: institutionId,
    routeLabel: institutionName,
    institutionId,
    institutionName,
    quote,
    grossInSource,
    sourceCurrency: config.currency,
    outputCurrency: currency,
    outputAmount: amount,
    grossBrlMonth,
    taxBrlMonth,
    investedBrlMonth,
    netBrlMonth,
    steps,
    accumulator,
  };
}

export function evaluateEntry(input: {
  entryId: string;
  entryLabel: string;
  kind: "INCOME" | "EXPENSE";
  config: PlanEntryConfig;
  quotes: RouteQuote[];
  horizonMonths: number;
}): EntryEvalResult[] {
  if (input.kind === "EXPENSE") {
    const monthly = monthlyAmount(input.config.amount, input.config.period);
    const expenseQuote = findAnyQuote(input.quotes, input.config.currency, "BRL");
    const converted = toBrl(monthly, input.config.currency, expenseQuote);
    const inBrl = converted != null;
    return [
      {
        entryId: input.entryId,
        entryLabel: input.entryLabel,
        routeId: "expense",
        routeLabel: input.entryLabel,
        institutionId: "expense",
        institutionName: input.entryLabel,
        quote: expenseQuote,
        grossInSource: monthly,
        sourceCurrency: input.config.currency,
        outputCurrency: inBrl ? "BRL" : input.config.currency,
        outputAmount: inBrl ? converted : monthly,
        grossBrlMonth: 0,
        taxBrlMonth: 0,
        investedBrlMonth: 0,
        netBrlMonth: inBrl ? -converted : 0,
        steps: [
          {
            label: input.entryLabel,
            amount: monthly,
            currency: input.config.currency,
          },
        ],
      },
    ];
  }

  const treatments = input.config.treatments ?? [];
  const branches = resolveConversionBranches(treatments, input.quotes, input.config.currency);

  return branches.map((institutionId) =>
    evaluateEntryPipeline({
      entryId: input.entryId,
      entryLabel: input.entryLabel,
      config: input.config,
      treatments,
      quotes: input.quotes,
      institutionId,
      horizonMonths: input.horizonMonths,
    }),
  );
}

export function pickBestEvalPerEntry(evals: EntryEvalResult[]): EntryEvalResult[] {
  const byEntry = new Map<string, EntryEvalResult[]>();
  for (const ev of evals) {
    if (ev.routeId === "expense") continue;
    const list = byEntry.get(ev.entryId) ?? [];
    list.push(ev);
    byEntry.set(ev.entryId, list);
  }
  return [...byEntry.values()].map(
    (list) => [...list].sort((a, b) => b.netBrlMonth - a.netBrlMonth)[0]!,
  );
}

export function collectQuoteRequestsFromEntries(
  entries: { config: PlanEntryConfig }[],
): QuoteRequest[] {
  const requests: QuoteRequest[] = [];
  const seen = new Set<string>();

  function addRequest(
    institutionIds: string[],
    fromCurrency: string,
    toCurrency: string,
    compareAll = false,
  ) {
    if (fromCurrency === toCurrency) return;
    const key = `${institutionIds.join(",")}:${fromCurrency}:${toCurrency}:${compareAll}`;
    if (seen.has(key)) return;
    seen.add(key);
    requests.push({ institutionIds, fromCurrency, toCurrency, compareAll });
  }

  for (const entry of entries) {
    const { config } = entry;
    const treatments = config.treatments ?? [];
    const conversion = treatments.find((t): t is ConversionTreatment => t.type === "conversion");
    const endsInBrl =
      !conversion || conversion.toCurrency === "BRL" || treatments.some((t) => t.type === "tax_pj");

    if (conversion) {
      const fromCurrency = config.currency;
      const ids = conversionInstitutionIds(conversion);
      addRequest(ids, fromCurrency, conversion.toCurrency, ids.length === 0);
    } else if (config.currency !== "BRL" && endsInBrl) {
      addRequest([], config.currency, "BRL", true);
    }
  }

  for (const entry of entries) {
    if (entry.config.currency === "BRL") continue;
    const hasConversionToBrl = (entry.config.treatments ?? []).some(
      (t) => t.type === "conversion" && t.toCurrency === "BRL",
    );
    if (!hasConversionToBrl) {
      addRequest([], entry.config.currency, "BRL", true);
    }
  }

  return requests;
}

/** @deprecated use collectQuoteRequestsFromEntries */
export function collectInstitutionIdsFromEntries(
  entries: { config: PlanEntryConfig }[],
): { institutionIds: string[]; fromCurrency: string; toCurrency: string }[] {
  return collectQuoteRequestsFromEntries(entries).map((request) => ({
    institutionIds: request.institutionIds,
    fromCurrency: request.fromCurrency,
    toCurrency: request.toCurrency,
  }));
}

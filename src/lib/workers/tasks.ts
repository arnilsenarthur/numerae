import { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/institutions";
import { prisma } from "@/lib/db";
import {
  fetchUsdRatesWithFallback,
  isStableUsdCode,
  type UsdRateMap,
} from "@/lib/workers/exchange-rate-providers";
import type { WorkerProviderId } from "@/lib/workers/registry";
import type { WorkerRunTrigger } from "@/generated/prisma/client";

export type WorkerRunSummary = {
  updated: number;
  unchanged: number;
  skipped: string[];
  missing: string[];
  errors: string[];
};

export type WorkerExecutionResult = {
  status: "SUCCESS" | "PARTIAL" | "FAILED" | "SKIPPED";
  provider: WorkerProviderId | null;
  fallbackUsed: boolean;
  attemptedProviders: { provider: string; ok: boolean; error?: string }[];
  summary: WorkerRunSummary;
  error?: string;
};

function buildExistingUsdRateMap(
  currencies: { code: string; usdRate: { toNumber(): number } | null }[],
): UsdRateMap {
  const map: UsdRateMap = new Map();

  for (const currency of currencies) {
    const value = decimalToNumber(currency.usdRate);
    if (value !== null) map.set(currency.code.toUpperCase(), value);
  }

  map.set("USD", 1);
  return map;
}

export async function runMarketQuotesWorker(input: {
  primaryProvider: WorkerProviderId;
  secondaryProvider?: WorkerProviderId | null;
  trigger: WorkerRunTrigger;
}): Promise<WorkerExecutionResult> {
  void input.trigger;

  const assets = await prisma.marketAsset.findMany({
    where: { active: true },
    select: {
      id: true,
      symbol: true,
      kind: true,
      currencyCode: true,
      countryCode: true,
      price: true,
    },
  });

  const summary: WorkerRunSummary = {
    updated: 0,
    unchanged: 0,
    skipped: [],
    missing: [],
    errors: [],
  };

  if (assets.length === 0) {
    return {
      status: "SUCCESS",
      provider: input.primaryProvider,
      fallbackUsed: false,
      attemptedProviders: [{ provider: input.primaryProvider, ok: true }],
      summary,
    };
  }

  if (input.primaryProvider === "database") {
    return {
      status: "SUCCESS",
      provider: "database",
      fallbackUsed: false,
      attemptedProviders: [{ provider: "database", ok: true }],
      summary: { ...summary, unchanged: assets.length },
    };
  }

  try {
    const { fetchMarketQuotesAuto } = await import("@/lib/workers/market-data-providers");
    const outcome = await fetchMarketQuotesAuto(
      assets.map((asset) => ({
        symbol: asset.symbol,
        kind: asset.kind,
        currencyCode: asset.currencyCode,
        countryCode: asset.countryCode,
      })),
    );

    summary.errors.push(...outcome.errors);

    const bySymbol = new Map(outcome.results.map((result) => [result.symbol, result]));
    const now = new Date();

    for (const asset of assets) {
      const quote = bySymbol.get(asset.symbol.toUpperCase());
      if (!quote) {
        summary.missing.push(asset.symbol);
        continue;
      }

      const current = decimalToNumber(asset.price);
      const changed = current === null || current.toString() !== quote.price.toString();

      await prisma.marketAsset.update({
        where: { id: asset.id },
        data: {
          price: new Prisma.Decimal(quote.price),
          priceUpdatedAt: now,
          changePercent:
            quote.changePercent !== null ? new Prisma.Decimal(quote.changePercent) : null,
        },
      });

      await prisma.marketQuote.upsert({
        where: { assetId_quotedAt: { assetId: asset.id, quotedAt: startOfDayUtc(now) } },
        create: {
          assetId: asset.id,
          price: new Prisma.Decimal(quote.price),
          quotedAt: startOfDayUtc(now),
        },
        update: { price: new Prisma.Decimal(quote.price) },
      });

      if (changed) summary.updated += 1;
      else summary.unchanged += 1;
    }

    const status =
      summary.errors.length > 0 || summary.missing.length > 0
        ? summary.updated > 0 || summary.unchanged > 0
          ? "PARTIAL"
          : "FAILED"
        : "SUCCESS";

    return {
      status,
      provider: input.primaryProvider,
      fallbackUsed: false,
      attemptedProviders: [{ provider: input.primaryProvider, ok: status !== "FAILED" }],
      summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    return {
      status: "FAILED",
      provider: null,
      fallbackUsed: false,
      attemptedProviders: [{ provider: input.primaryProvider, ok: false, error: message }],
      summary: { ...summary, errors: [...summary.errors, message] },
      error: message,
    };
  }
}

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Calcula a próxima data de vencimento após `current`, respeitando o tipo de recorrência. */
function nextDueDate(current: Date, recurrence: string, dayOfPeriod: number): Date {
  const d = new Date(current);
  switch (recurrence) {
    case "DAILY":
      d.setDate(d.getDate() + 1);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + 7);
      break;
    case "BIWEEKLY":
      d.setDate(d.getDate() + 14);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      d.setDate(Math.min(dayOfPeriod, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
      break;
    case "BIMONTHLY":
      d.setMonth(d.getMonth() + 2);
      d.setDate(Math.min(dayOfPeriod, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
      break;
    case "QUARTERLY":
      d.setMonth(d.getMonth() + 3);
      d.setDate(Math.min(dayOfPeriod, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
  }
  return d;
}

export async function runRecurringTransactionWorker(input: {
  trigger: WorkerRunTrigger;
}): Promise<WorkerExecutionResult> {
  void input.trigger;
  const now = new Date();

  const summary: WorkerRunSummary = {
    updated: 0,
    unchanged: 0,
    skipped: [],
    missing: [],
    errors: [],
  };

  try {
    const due = await prisma.recurringTransaction.findMany({
      where: {
        active: true,
        nextDueAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gte: now } }],
      },
    });

    for (const rec of due) {
      try {
        // Create the transaction
        await prisma.transaction.create({
          data: {
            userId: rec.userId,
            accountId: rec.accountId,
            kind: rec.kind,
            amount: rec.amount,
            currencyCode: rec.currencyCode,
            category: rec.category,
            description: rec.description,
            date: rec.nextDueAt,
            counterAccountId: rec.counterAccountId ?? null,
            counterAmount: rec.counterAmount ?? null,
            recurringId: rec.id,
          },
        });

        // Advance to next due date
        const next = nextDueDate(rec.nextDueAt, rec.recurrence, rec.dayOfPeriod);
        const expired = rec.endAt && next > rec.endAt;

        await prisma.recurringTransaction.update({
          where: { id: rec.id },
          data: {
            nextDueAt: next,
            ...(expired ? { active: false } : {}),
          },
        });

        summary.updated += 1;
      } catch (error) {
        const message = `${rec.description}: ${error instanceof Error ? error.message : "Erro"}`;
        summary.errors.push(message);
      }
    }

    if (due.length === 0) summary.unchanged = 1;

    return {
      status: summary.errors.length > 0 ? (summary.updated > 0 ? "PARTIAL" : "FAILED") : "SUCCESS",
      provider: "database",
      fallbackUsed: false,
      attemptedProviders: [{ provider: "database", ok: summary.errors.length === 0 }],
      summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido.";
    return {
      status: "FAILED",
      provider: null,
      fallbackUsed: false,
      attemptedProviders: [],
      summary: { ...summary, errors: [message] },
      error: message,
    };
  }
}

export async function runUsdRateWorker(input: {
  primaryProvider: WorkerProviderId;
  secondaryProvider?: WorkerProviderId | null;
  trigger: WorkerRunTrigger;
}): Promise<WorkerExecutionResult> {
  void input.trigger;

  const currencies = await prisma.currency.findMany({
    where: { active: true },
    select: { id: true, code: true, countryCode: true, usdRate: true },
  });

  const codes = currencies.map((c) => c.code.toUpperCase());
  const existingRates = buildExistingUsdRateMap(currencies);

  try {
    const { result, attempts, fallbackUsed } = await fetchUsdRatesWithFallback({
      codes,
      primaryProvider: input.primaryProvider,
      secondaryProvider: input.secondaryProvider,
      existingRates,
    });

    const now = new Date();
    const summary: WorkerRunSummary = {
      updated: 0,
      unchanged: 0,
      skipped: [],
      missing: [],
      errors: [],
    };

    for (const currency of currencies) {
      const code = currency.code.toUpperCase();

      if (isStableUsdCode(code)) {
        summary.skipped.push(code);
        continue;
      }

      const nextRate = result.rates.get(code);
      if (nextRate === undefined) {
        summary.missing.push(code);
        continue;
      }

      const currentRate = decimalToNumber(currency.usdRate);
      const changed =
        currentRate === null || currentRate.toString() !== nextRate.toString();

      if (!changed) {
        summary.unchanged += 1;
        continue;
      }

      await prisma.currency.update({
        where: { id: currency.id },
        data: {
          usdRate: new Prisma.Decimal(nextRate),
          usdRateUpdatedAt: now,
        },
      });

      summary.updated += 1;
    }

    const status =
      summary.errors.length > 0 || summary.missing.length > 0
        ? summary.updated > 0
          ? "PARTIAL"
          : "FAILED"
        : "SUCCESS";

    return {
      status,
      provider: result.provider,
      fallbackUsed,
      attemptedProviders: attempts,
      summary,
    };
  } catch (error) {
    return {
      status: "FAILED",
      provider: null,
      fallbackUsed: false,
      attemptedProviders: [],
      summary: {
        updated: 0,
        unchanged: 0,
        skipped: [],
        missing: [],
        errors: [error instanceof Error ? error.message : "Erro desconhecido."],
      },
      error: error instanceof Error ? error.message : "Erro desconhecido.",
    };
  }
}

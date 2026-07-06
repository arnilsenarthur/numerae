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

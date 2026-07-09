import { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/institutions";
import { prisma } from "@/lib/db";
import {
  fetchFrankfurterUsdHistory,
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


/**
 * Counts existing quotes per window and returns a boolean array indicating
 * which windows are below the `coverageThreshold` fill rate.
 */
async function detectCoverageGaps(
  assetIds: string[],
  nowMs: number,
  lookbackDays: number,
  coverageThreshold = 0.7,
): Promise<{ needs1D: boolean; needs1W: boolean; needsHistory: boolean }> {
  if (assetIds.length === 0) return { needs1D: false, needs1W: false, needsHistory: false };

  const n = assetIds.length;
  const windows = [
    { fromMs: nowMs - DAY_MS, toMs: nowMs, stepMs: STEP_20_MIN },
    { fromMs: nowMs - 7 * DAY_MS, toMs: nowMs - DAY_MS, stepMs: 2 * HOUR_MS },
    { fromMs: nowMs - 90 * DAY_MS, toMs: nowMs - 7 * DAY_MS, stepMs: 12 * HOUR_MS },
    { fromMs: nowMs - lookbackDays * DAY_MS, toMs: nowMs - 90 * DAY_MS, stepMs: 7 * DAY_MS },
  ];

  const counts = await Promise.all(
    windows.map((w) =>
      w.toMs <= w.fromMs
        ? Promise.resolve(0)
        : prisma.marketQuote.count({
            where: {
              assetId: { in: assetIds },
              quotedAt: { gte: new Date(w.fromMs), lt: new Date(w.toMs) },
            },
          }),
    ),
  );

  const fill = windows.map((w, i) => {
    if (w.toMs <= w.fromMs) return 1;
    const expected = Math.floor((w.toMs - w.fromMs) / w.stepMs) * n;
    return expected === 0 ? 1 : (counts[i] ?? 0) / expected;
  });

  return {
    needs1D: fill[0]! < coverageThreshold,
    needs1W: fill[1]! < coverageThreshold,
    needsHistory: fill[2]! < coverageThreshold || fill[3]! < coverageThreshold,
  };
}

export async function runMarketQuotesWorker(input: {
  primaryProvider: WorkerProviderId;
  secondaryProvider?: WorkerProviderId | null;
  trigger: WorkerRunTrigger;
  historyLookbackDays?: number | null;
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
    const { fetchMarketQuotesAuto, fetchMarketHistoryAuto, fetchMarketIntradayAuto } = await import(
      "@/lib/workers/market-data-providers"
    );

    const now = new Date();
    const nowMs = now.getTime();
    const lookbackDays = Math.max(30, Math.min(input.historyLookbackDays ?? 400, 2000));
    const lookbackStart = new Date(nowMs - lookbackDays * DAY_MS);
    const assetIds = assets.map((a) => a.id);
    const assetSpecs = assets.map((a) => ({
      symbol: a.symbol,
      kind: a.kind,
      currencyCode: a.currencyCode,
      countryCode: a.countryCode,
    }));

    // Step 1: fetch current quotes (always, fast single batch call)
    const outcome = await fetchMarketQuotesAuto(assetSpecs);
    summary.errors.push(...outcome.errors);
    const bySymbol = new Map(outcome.results.map((r) => [r.symbol, r]));

    // Step 2: detect which historical windows are underfilled (3 COUNT queries)
    const { needs1D, needs1W, needsHistory } = await detectCoverageGaps(
      assetIds,
      nowMs,
      lookbackDays,
    );

    const needsBackfill = needs1D || needs1W || needsHistory;

    // Step 3: only fetch heavy historical data when gaps are detected
    const [historyOutcome, intradayWeekOutcome, intradayDayOutcome] = await Promise.all([
      needsHistory
        ? fetchMarketHistoryAuto(assetSpecs)
        : Promise.resolve({ errors: [] as string[], historyBySymbol: new Map<string, { quotedAt: Date; price: number }[]>() }),
      needs1W
        ? fetchMarketIntradayAuto(assetSpecs, "1W")
        : Promise.resolve({ errors: [] as string[], historyBySymbol: new Map<string, { quotedAt: Date; price: number }[]>() }),
      needs1D
        ? fetchMarketIntradayAuto(assetSpecs, "1D")
        : Promise.resolve({ errors: [] as string[], historyBySymbol: new Map<string, { quotedAt: Date; price: number }[]>() }),
    ]);

    summary.errors.push(...historyOutcome.errors);
    summary.errors.push(...intradayWeekOutcome.errors);
    summary.errors.push(...intradayDayOutcome.errors);

    // If backfill needed, load existing quotes to avoid duplicates
    // Only load quotes within the windows we actually need to fill
    const earliestBackfillMs = needs1D
      ? nowMs - DAY_MS
      : needs1W
        ? nowMs - 7 * DAY_MS
        : needsHistory
          ? nowMs - lookbackDays * DAY_MS
          : nowMs - DAY_MS;

    const existingQuotes = needsBackfill
      ? await prisma.marketQuote.findMany({
          where: { assetId: { in: assetIds }, quotedAt: { gte: new Date(earliestBackfillMs) } },
          select: { assetId: true, quotedAt: true },
        })
      : [];

    const existingKeySet = new Set(
      existingQuotes.map((q) => `${q.assetId}:${q.quotedAt.getTime()}`),
    );

    // Step 4: update each asset
    for (const asset of assets) {
      const quote = bySymbol.get(asset.symbol.toUpperCase());
      if (!quote) {
        summary.missing.push(asset.symbol);
        continue;
      }

      const current = decimalToNumber(asset.price);
      const changed = current === null || current.toString() !== quote.price.toString();

      // Always update the asset's current price
      await prisma.marketAsset.update({
        where: { id: asset.id },
        data: {
          price: new Prisma.Decimal(quote.price),
          priceUpdatedAt: now,
          currencyCode: quote.currencyCode ? quote.currencyCode.toUpperCase() : asset.currencyCode,
          changePercent:
            quote.changePercent !== null ? new Prisma.Decimal(quote.changePercent) : null,
        },
      });

      // Always upsert the current 20-min bucket (fast path for normal runs)
      const currentBucket = floorToStep(now, STEP_20_MIN);
      await prisma.marketQuote.upsert({
        where: { assetId_quotedAt: { assetId: asset.id, quotedAt: currentBucket } },
        update: { price: new Prisma.Decimal(quote.price) },
        create: {
          assetId: asset.id,
          quotedAt: currentBucket,
          price: new Prisma.Decimal(quote.price),
        },
      });

      if (changed) summary.updated += 1;
      else summary.unchanged += 1;

      // Backfill path: only runs when gaps detected
      if (!needsBackfill) continue;

      const targetBuckets = buildTargetBuckets(nowMs, lookbackDays, { needs1D, needs1W, needsHistory });

      const sourcePoints = collectSourcePoints([
        (historyOutcome.historyBySymbol.get(asset.symbol.toUpperCase()) ?? []).map((item) => ({
          quotedAt: item.quotedAt,
          price: item.price,
        })),
        (intradayWeekOutcome.historyBySymbol.get(asset.symbol.toUpperCase()) ?? []).map((item) => ({
          quotedAt: item.quotedAt,
          price: item.price,
        })),
        (intradayDayOutcome.historyBySymbol.get(asset.symbol.toUpperCase()) ?? []).map((item) => ({
          quotedAt: item.quotedAt,
          price: item.price,
        })),
        [{ quotedAt: currentBucket, price: quote.price }],
      ]);

      if (sourcePoints.length === 0) continue;

      const resampled = resampleIntoBuckets(targetBuckets, sourcePoints);

      const toCreate = resampled
        .filter(
          (point) =>
            point.quotedAt.getTime() !== currentBucket.getTime() &&
            !existingKeySet.has(`${asset.id}:${point.quotedAt.getTime()}`),
        )
        .map((point) => ({
          assetId: asset.id,
          quotedAt: point.quotedAt,
          price: new Prisma.Decimal(point.price),
        }));

      if (toCreate.length > 0) {
        await prisma.marketQuote.createMany({ data: toCreate, skipDuplicates: true });
      }
    }

    // Step 5: prune old data
    await prisma.marketQuote.deleteMany({
      where: { assetId: { in: assetIds }, quotedAt: { lt: lookbackStart } },
    });

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

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const STEP_20_MIN = 20 * 60 * 1000;

function floorToStep(date: Date, stepMs: number) {
  const ms = date.getTime();
  return new Date(Math.floor(ms / stepMs) * stepMs);
}

function collectSourcePoints(
  buckets: Array<Array<{ quotedAt: Date; price: number }>>,
) {
  const dedup = new Map<number, number>();
  for (const points of buckets) {
    for (const point of points) {
      dedup.set(point.quotedAt.getTime(), point.price);
    }
  }
  return Array.from(dedup.entries())
    .map(([time, price]) => ({ quotedAt: new Date(time), price }))
    .sort((a, b) => a.quotedAt.getTime() - b.quotedAt.getTime());
}

function buildTargetBuckets(
  nowMs: number,
  lookbackDays: number,
  flags: { needs1D: boolean; needs1W: boolean; needsHistory: boolean } = {
    needs1D: true,
    needs1W: true,
    needsHistory: true,
  },
) {
  const windows = [
    flags.needs1D && { fromMs: nowMs - DAY_MS, toMs: nowMs, stepMs: STEP_20_MIN },
    flags.needs1W && { fromMs: nowMs - 7 * DAY_MS, toMs: nowMs - DAY_MS, stepMs: 2 * HOUR_MS },
    flags.needsHistory && {
      fromMs: nowMs - 30 * DAY_MS,
      toMs: nowMs - 7 * DAY_MS,
      stepMs: 12 * HOUR_MS,
    },
    flags.needsHistory && {
      fromMs: nowMs - 90 * DAY_MS,
      toMs: nowMs - 30 * DAY_MS,
      stepMs: DAY_MS,
    },
    flags.needsHistory && {
      fromMs: nowMs - lookbackDays * DAY_MS,
      toMs: nowMs - 90 * DAY_MS,
      stepMs: 7 * DAY_MS,
    },
  ].filter(Boolean) as { fromMs: number; toMs: number; stepMs: number }[];

  const times = new Set<number>();
  for (const window of windows) {
    if (window.toMs <= window.fromMs) continue;
    const start = floorToStep(new Date(window.fromMs), window.stepMs).getTime();
    const end = floorToStep(new Date(window.toMs), window.stepMs).getTime();
    for (let time = start; time <= end; time += window.stepMs) {
      if (time >= window.fromMs && time <= window.toMs) {
        times.add(time);
      }
    }
  }

  return Array.from(times)
    .sort((a, b) => a - b)
    .map((time) => new Date(time));
}

function resampleIntoBuckets(
  buckets: Date[],
  sourcePoints: Array<{ quotedAt: Date; price: number }>,
) {
  if (buckets.length === 0 || sourcePoints.length === 0) return [];
  const sorted = [...sourcePoints].sort((a, b) => a.quotedAt.getTime() - b.quotedAt.getTime());
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  let sourceIndex = 0;
  const result: Array<{ quotedAt: Date; price: number }> = [];

  for (const bucket of buckets) {
    while (
      sourceIndex < sorted.length - 1 &&
      sorted[sourceIndex + 1]!.quotedAt.getTime() <= bucket.getTime()
    ) {
      sourceIndex += 1;
    }

    const selected =
      bucket.getTime() < first.quotedAt.getTime()
        ? first
        : bucket.getTime() > last.quotedAt.getTime()
          ? last
          : sorted[sourceIndex]!;

    result.push({ quotedAt: bucket, price: selected.price });
  }

  return result;
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
        const dueDate = rec.nextDueAt;
        const next = nextDueDate(dueDate, rec.recurrence, rec.dayOfPeriod);
        const expired = rec.endAt && next > rec.endAt;

        const existing = await prisma.transaction.findFirst({
          where: { recurringId: rec.id, date: dueDate },
          select: { id: true },
        });

        if (!existing) {
          await prisma.transaction.create({
            data: {
              userId: rec.userId,
              accountId: rec.accountId,
              kind: rec.kind,
              amount: rec.amount,
              currencyCode: rec.currencyCode,
              category: rec.category,
              description: rec.description,
              date: dueDate,
              counterAccountId: rec.counterAccountId ?? null,
              counterAmount: rec.counterAmount ?? null,
              recurringId: rec.id,
            },
          });
        }

        const advanced = await prisma.recurringTransaction.updateMany({
          where: { id: rec.id, active: true, nextDueAt: dueDate },
          data: {
            nextDueAt: next,
            ...(expired ? { active: false } : {}),
          },
        });

        if (advanced.count > 0) {
          summary.updated += 1;
        }
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
  historyLookbackDays?: number | null;
}): Promise<WorkerExecutionResult> {
  void input.trigger;

  const currencies = await prisma.currency.findMany({
    where: { active: true },
    select: { id: true, code: true, countryCode: true, usdRate: true },
  });

  const codes = currencies.map((c) => c.code.toUpperCase());
  const existingRates = buildExistingUsdRateMap(currencies);
  const lookbackDays = Math.max(30, Math.min(input.historyLookbackDays ?? 365, 2000));
  const lookbackStart = new Date(Date.now() - lookbackDays * DAY_MS);

  try {
    const { result, attempts, fallbackUsed } = await fetchUsdRatesWithFallback({
      codes,
      primaryProvider: input.primaryProvider,
      secondaryProvider: input.secondaryProvider,
      existingRates,
    });

    const now = new Date();
    const quoteBucket = hourBucket(now);
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

      if (changed) {
        await prisma.currency.update({
          where: { id: currency.id },
          data: {
            usdRate: new Prisma.Decimal(nextRate),
            usdRateUpdatedAt: now,
          },
        });
        summary.updated += 1;
      } else {
        summary.unchanged += 1;
      }

      await prisma.currencyQuote.upsert({
        where: {
          currencyId_quotedAt: { currencyId: currency.id, quotedAt: quoteBucket },
        },
        update: { usdRate: new Prisma.Decimal(nextRate) },
        create: {
          currencyId: currency.id,
          quotedAt: quoteBucket,
          usdRate: new Prisma.Decimal(nextRate),
        },
      });
    }

    const currencyIds = currencies.map((currency) => currency.id);
    const minQuotesForLookback = Math.max(30, Math.floor(lookbackDays * 0.5));
    const quoteCounts = await prisma.currencyQuote.groupBy({
      by: ["currencyId"],
      where: { currencyId: { in: currencyIds }, quotedAt: { gte: lookbackStart } },
      _count: { _all: true },
    });
    const sparseCodes = currencies
      .filter((currency) => {
        const count =
          quoteCounts.find((row) => row.currencyId === currency.id)?._count._all ?? 0;
        return count < minQuotesForLookback && !isStableUsdCode(currency.code);
      })
      .map((currency) => currency.code.toUpperCase());

    const codesToBackfill =
      input.trigger === "MANUAL"
        ? currencies
            .filter((currency) => !isStableUsdCode(currency.code))
            .map((currency) => currency.code.toUpperCase())
        : sparseCodes;

    if (codesToBackfill.length > 0 && input.primaryProvider !== "database") {
      try {
        const historyByCode = await fetchFrankfurterUsdHistory(codesToBackfill, lookbackDays);
        const currencyByCode = new Map(
          currencies.map((currency) => [currency.code.toUpperCase(), currency]),
        );

        for (const [code, points] of historyByCode) {
          const currency = currencyByCode.get(code);
          if (!currency || points.length === 0) continue;

          const toCreate = points.map((point) => ({
            currencyId: currency.id,
            quotedAt: point.quotedAt,
            usdRate: new Prisma.Decimal(point.usdRate),
          }));

          await prisma.currencyQuote.createMany({
            data: toCreate,
            skipDuplicates: true,
          });
        }
      } catch (error) {
        summary.errors.push(
          error instanceof Error ? error.message : "Erro ao carregar histórico de moedas.",
        );
      }
    }

    await prisma.currencyQuote.deleteMany({
      where: { currencyId: { in: currencyIds }, quotedAt: { lt: lookbackStart } },
    });

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

function hourBucket(date: Date) {
  return new Date(Math.floor(date.getTime() / HOUR_MS) * HOUR_MS);
}

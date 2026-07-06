import { effectiveExchangeRate } from "@/lib/institutions";
import type { RouteQuote } from "@/modules/money-map/engines/types";

type RateRow = {
  institutionId: string;
  institutionName: string;
  institutionSlug: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  spreadPercent: number;
  feeFixed: number | null;
  feePercent: number | null;
  rateUpdatedAt: Date | null;
  rateTtlSeconds: number;
};

export function buildRouteQuote(row: RateRow, now = Date.now()): RouteQuote {
  const updatedMs = row.rateUpdatedAt?.getTime() ?? null;
  const stale =
    updatedMs !== null && now - updatedMs > row.rateTtlSeconds * 1000;

  return {
    institutionId: row.institutionId,
    institutionName: row.institutionName,
    institutionSlug: row.institutionSlug,
    fromCurrency: row.fromCurrency,
    toCurrency: row.toCurrency,
    rate: row.rate,
    spreadPercent: row.spreadPercent,
    effectiveRate: effectiveExchangeRate(row.rate, row.spreadPercent),
    feeFixed: row.feeFixed,
    feePercent: row.feePercent,
    stale,
  };
}

export function convertWithQuote(
  amount: number,
  quote: RouteQuote,
): { converted: number; feesBrl: number } {
  let converted = amount * quote.effectiveRate;

  let feesBrl = 0;
  if (quote.feeFixed) feesBrl += quote.feeFixed;
  if (quote.feePercent) feesBrl += converted * (quote.feePercent / 100);

  converted = Math.max(0, converted - feesBrl);
  return { converted, feesBrl };
}

export function monthlyAmount(amount: number, period: "monthly" | "annual" | "once") {
  if (period === "monthly") return amount;
  if (period === "annual") return amount / 12;
  return amount;
}

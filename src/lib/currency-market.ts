import { decimalToNumber } from "@/lib/institutions";
import type { SerializedMarketAsset, SerializedMarketQuote } from "@/types/market";

type CurrencyRecord = {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  symbol: string | null;
  usdRate: { toNumber(): number } | null;
  usdRateUpdatedAt: Date | null;
  usdRateTtlSeconds: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CurrencyQuoteRecord = {
  id: string;
  currencyId: string;
  usdRate: { toNumber(): number };
  quotedAt: Date;
};

export function currencyMarketSymbol(code: string, countryCode: string) {
  return `${code.toUpperCase()}-${countryCode.toUpperCase()}`;
}

export function parseCurrencyMarketSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  const dash = normalized.lastIndexOf("-");
  if (dash <= 0 || dash === normalized.length - 1) {
    return { code: normalized, countryCode: null as string | null };
  }
  return {
    code: normalized.slice(0, dash),
    countryCode: normalized.slice(dash + 1),
  };
}

export function serializeCurrencyQuote(record: CurrencyQuoteRecord): SerializedMarketQuote {
  return {
    id: record.id,
    assetId: record.currencyId,
    price: record.usdRate.toNumber(),
    quotedAt: record.quotedAt.toISOString(),
  };
}

export function serializeCurrencyForMarket(
  record: CurrencyRecord,
  changePercent: number | null = null,
): SerializedMarketAsset {
  const usdRate = decimalToNumber(record.usdRate);
  return {
    id: record.id,
    symbol: currencyMarketSymbol(record.code, record.countryCode),
    name: record.name,
    kind: "CURRENCY",
    exchange: null,
    currencyCode: "USD",
    countryCode: record.countryCode,
    logoUrl: null,
    active: record.active,
    price: usdRate,
    priceUpdatedAt: record.usdRateUpdatedAt?.toISOString() ?? null,
    priceTtlSeconds: record.usdRateTtlSeconds,
    changePercent,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function currencyDisplayCode(symbol: string) {
  return parseCurrencyMarketSymbol(symbol).code;
}

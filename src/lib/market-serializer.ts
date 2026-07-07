import { decimalToNumber } from "@/lib/institutions";
import type {
  MarketAssetKind,
  SerializedInvestmentPlan,
  SerializedMarketAsset,
  SerializedMarketQuote,
} from "@/types/market";

type Decimalish = { toNumber(): number } | null;

type MarketAssetRecord = {
  id: string;
  symbol: string;
  name: string;
  kind: string;
  exchange: string | null;
  currencyCode: string;
  countryCode: string | null;
  logoUrl: string | null;
  active: boolean;
  price: Decimalish;
  priceUpdatedAt: Date | null;
  priceTtlSeconds: number;
  changePercent: Decimalish;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeMarketAsset(record: MarketAssetRecord): SerializedMarketAsset {
  return {
    id: record.id,
    symbol: record.symbol,
    name: record.name,
    kind: record.kind as MarketAssetKind,
    exchange: record.exchange,
    currencyCode: record.currencyCode,
    countryCode: record.countryCode,
    logoUrl: record.logoUrl,
    active: record.active,
    price: decimalToNumber(record.price),
    priceUpdatedAt: record.priceUpdatedAt?.toISOString() ?? null,
    priceTtlSeconds: record.priceTtlSeconds,
    changePercent: decimalToNumber(record.changePercent),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function serializeMarketQuote(record: {
  id: string;
  assetId: string;
  price: { toNumber(): number };
  quotedAt: Date;
}): SerializedMarketQuote {
  return {
    id: record.id,
    assetId: record.assetId,
    price: record.price.toNumber(),
    quotedAt: record.quotedAt.toISOString(),
  };
}

export function serializeInvestmentPlan(record: {
  id: string;
  name: string;
  currencyCode: string;
  initialAmount: { toNumber(): number };
  monthlyDeposit: { toNumber(): number };
  horizonMonths: number;
  riskProfile: string;
  targetAmount: Decimalish;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SerializedInvestmentPlan {
  return {
    id: record.id,
    name: record.name,
    currencyCode: record.currencyCode,
    initialAmount: record.initialAmount.toNumber(),
    monthlyDeposit: record.monthlyDeposit.toNumber(),
    horizonMonths: record.horizonMonths,
    riskProfile: record.riskProfile,
    targetAmount: decimalToNumber(record.targetAmount),
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

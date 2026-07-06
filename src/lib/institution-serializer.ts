import { decimalToNumber } from "@/lib/institutions";
import { DEFAULT_EXCHANGE_RATE_TTL_SECONDS } from "@/lib/spoilable-field";

export type SerializedExchangeRate = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  rateUpdatedAt: string | null;
  rateTtlSeconds: number;
  spreadPercent: number;
  spreadUpdatedAt: string | null;
  spreadTtlSeconds: number;
  feeFixed: number | null;
  feePercent: number | null;
  notes: string | null;
  active: boolean;
};

export type SerializedInstitution = {
  id: string;
  slug: string;
  name: string;
  type: string;
  countryCode: string;
  website: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  exchangeRatesCount?: number;
  exchangeRates?: SerializedExchangeRate[];
};

type ExchangeRateRecord = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: { toNumber(): number };
  rateUpdatedAt: Date | null;
  rateTtlSeconds: number;
  spreadPercent: { toNumber(): number };
  spreadUpdatedAt: Date | null;
  spreadTtlSeconds: number;
  feeFixed: { toNumber(): number } | null;
  feePercent: { toNumber(): number } | null;
  notes: string | null;
  active: boolean;
};

type InstitutionRecord = {
  id: string;
  slug: string;
  name: string;
  type: string;
  countryCode: string;
  website: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  exchangeRates?: ExchangeRateRecord[];
  _count?: { exchangeRates: number };
};

export function serializeExchangeRate(rate: ExchangeRateRecord): SerializedExchangeRate {
  return {
    id: rate.id,
    fromCurrency: rate.fromCurrency,
    toCurrency: rate.toCurrency,
    rate: decimalToNumber(rate.rate)!,
    rateUpdatedAt: rate.rateUpdatedAt?.toISOString() ?? null,
    rateTtlSeconds: rate.rateTtlSeconds || DEFAULT_EXCHANGE_RATE_TTL_SECONDS,
    spreadPercent: decimalToNumber(rate.spreadPercent)!,
    spreadUpdatedAt: rate.spreadUpdatedAt?.toISOString() ?? null,
    spreadTtlSeconds: rate.spreadTtlSeconds || DEFAULT_EXCHANGE_RATE_TTL_SECONDS,
    feeFixed: decimalToNumber(rate.feeFixed),
    feePercent: decimalToNumber(rate.feePercent),
    notes: rate.notes,
    active: rate.active,
  };
}

export function serializeInstitution(record: InstitutionRecord): SerializedInstitution {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    type: record.type,
    countryCode: record.countryCode,
    website: record.website,
    logoUrl: record.logoUrl,
    brandColor: record.brandColor,
    description: record.description,
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    exchangeRatesCount: record._count?.exchangeRates,
    exchangeRates: record.exchangeRates?.map(serializeExchangeRate),
  };
}

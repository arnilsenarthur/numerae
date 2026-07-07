import { getCountryFlagUrl } from "@/lib/country-flags";
import type { SelectOption } from "@/components/ui/select";
import type { SerializedInstitution } from "@/lib/institution-serializer";

import { DEFAULT_USD_RATE_TTL_SECONDS } from "@/lib/spoilable-field";
import { decimalToNumber } from "@/lib/institutions";

export type SerializedCountry = {
  code: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  currenciesCount?: number;
};

export type SerializedCurrency = {
  id: string;
  code: string;
  name: string;
  countryCode: string;
  countryName?: string;
  symbol: string | null;
  usdRate: number | null;
  usdRateUpdatedAt: string | null;
  usdRateTtlSeconds: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export function serializeCountry(record: {
  code: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { currencies: number };
}): SerializedCountry {
  return {
    code: record.code,
    name: record.name,
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    currenciesCount: record._count?.currencies,
  };
}

export function serializeCurrency(record: {
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
  country?: { name: string };
}): SerializedCurrency {
  return {
    id: record.id,
    code: record.code,
    name: record.name,
    countryCode: record.countryCode,
    countryName: record.country?.name,
    symbol: record.symbol,
    usdRate: decimalToNumber(record.usdRate),
    usdRateUpdatedAt: record.usdRateUpdatedAt?.toISOString() ?? null,
    usdRateTtlSeconds: record.usdRateTtlSeconds || DEFAULT_USD_RATE_TTL_SECONDS,
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function buildCountrySelectOptions(
  countries: SerializedCountry[],
  includeAll = false,
): SelectOption[] {
  const options = countries
    .filter((country) => country.active)
    .map((country) => ({
      value: country.code,
      label: country.name,
      description: country.code,
      image: getCountryFlagUrl(country.code),
    }));

  if (includeAll) {
    return [{ value: "", label: "Todos os países" }, ...options];
  }

  return options;
}

/** Country-specific EUR rows (DE, PT, …); pan-European EUR uses country EU. */
function isCountrySpecificEuro(currency: SerializedCurrency) {
  return currency.code === "EUR" && currency.countryCode !== "EU";
}

export function buildCurrencySelectOptions(currencies: SerializedCurrency[]): SelectOption[] {
  return currencies
    .filter((currency) => currency.active && !isCountrySpecificEuro(currency))
    .sort(
      (a, b) =>
        a.code.localeCompare(b.code, "pt-BR") ||
        a.countryCode.localeCompare(b.countryCode, "pt-BR"),
    )
    .map((currency) => ({
      key: currency.id,
      value: currency.code,
      label: `${currency.code} — ${currency.name}`,
      description: currency.countryName ?? currency.countryCode,
    }));
}

export function buildInstitutionSelectOptions(institutions: SerializedInstitution[]): SelectOption[] {
  return institutions
    .filter((institution) => institution.active)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((institution) => ({
      key: institution.id,
      value: institution.id,
      label: institution.name,
      description: institution.exchangeRatesCount
        ? `${institution.exchangeRatesCount} cotação(ões)`
        : institution.type,
      ...(institution.logoUrl ? { image: institution.logoUrl } : {}),
    }));
}

export function countryNameMap(countries: SerializedCountry[]) {
  return new Map(countries.map((country) => [country.code, country.name]));
}

import { getCountryFlagUrl } from "@/lib/country-flags";

export const INSTITUTION_TYPES = [
  { value: "BANK", label: "Banco" },
  { value: "FINTECH", label: "Fintech" },
  { value: "BROKER", label: "Corretora" },
  { value: "REMITTANCE", label: "Remessa / câmbio" },
  { value: "EXCHANGE", label: "Exchange / cripto" },
  { value: "OTHER", label: "Outro" },
] as const;

export const ADMIN_COUNTRIES = [
  { code: "BR", name: "Brasil" },
  { code: "US", name: "Estados Unidos" },
  { code: "EU", name: "União Europeia" },
  { code: "GB", name: "Reino Unido" },
  { code: "CA", name: "Canadá" },
  { code: "AU", name: "Austrália" },
  { code: "DE", name: "Alemanha" },
  { code: "FR", name: "França" },
  { code: "PT", name: "Portugal" },
  { code: "ES", name: "Espanha" },
  { code: "IT", name: "Itália" },
  { code: "NL", name: "Países Baixos" },
  { code: "CH", name: "Suíça" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colômbia" },
  { code: "JP", name: "Japão" },
  { code: "SG", name: "Singapura" },
  { code: "HK", name: "Hong Kong" },
  { code: "AE", name: "Emirados Árabes" },
] as const;

export function getCountryName(code: string) {
  return ADMIN_COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

export const countryOptions = ADMIN_COUNTRIES.map((country) => ({
  value: country.code,
  label: country.name,
  description: country.code,
  image: getCountryFlagUrl(country.code),
}));

export const countryFilterOptions = [
  { value: "", label: "Todos os países" },
  ...countryOptions,
];

export type InstitutionTypeValue = (typeof INSTITUTION_TYPES)[number]["value"];

export const COMMON_CURRENCIES = [
  { code: "BRL", name: "Real brasileiro" },
  { code: "USD", name: "Dólar americano" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "Libra esterlina" },
  { code: "CAD", name: "Dólar canadense" },
  { code: "AUD", name: "Dólar australiano" },
  { code: "CHF", name: "Franco suíço" },
  { code: "JPY", name: "Iene japonês" },
  { code: "MXN", name: "Peso mexicano" },
  { code: "ARS", name: "Peso argentino" },
  { code: "USDT", name: "Tether (USDT)" },
  { code: "USDC", name: "USD Coin (USDC)" },
] as const;

export function slugifyInstitution(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function decimalToNumber(value: { toNumber(): number } | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : value.toNumber();
}

/**
 * Customer-facing rate: destination per 1 source, after institution spread.
 * Higher spread → less received (e.g. USD→BRL: 5.40 × (1 − 2.8%) ≈ 5.25).
 */
export function effectiveExchangeRate(rate: number, spreadPercent: number) {
  const spread = Math.min(100, Math.max(0, spreadPercent));
  return rate * (1 - spread / 100);
}

export const COUNTRY_CODES = ["BR"] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export type CountryConfig = {
  code: CountryCode;
  name: string;
  currency: string;
  locale: string;
  available: boolean;
};

export const countries: Record<CountryCode, CountryConfig> = {
  BR: {
    code: "BR",
    name: "Brasil",
    currency: "BRL",
    locale: "pt-BR",
    available: true,
  },
};

export function getCountry(code: string): CountryConfig {
  return countries[(code as CountryCode) in countries ? (code as CountryCode) : "BR"];
}

export function isCountryAvailable(code: string): code is CountryCode {
  const country = countries[code as CountryCode];
  return Boolean(country?.available);
}

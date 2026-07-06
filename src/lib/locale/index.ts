import { getCountry, type CountryCode } from "@/lib/locale/countries";
import { formatMoney } from "@/lib/format-money";

export function formatCountryMoney(value: number, countryCode: CountryCode = "BR") {
  const country = getCountry(countryCode);
  return formatMoney(value, { currency: country.currency, locale: country.locale });
}

export type { CountryCode };
export { COUNTRY_CODES, countries, getCountry, isCountryAvailable } from "@/lib/locale/countries";

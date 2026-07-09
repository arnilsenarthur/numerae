export const SUPPORTED_LOCALES = ["pt-BR", "en-US"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "pt-BR";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return SUPPORTED_LOCALES.includes(value as AppLocale);
}

export function resolveAppLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}

export const LOCALE_LABELS: Record<AppLocale, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
};

export function localeSelectOptions(allLabel?: string) {
  const options = SUPPORTED_LOCALES.map((value) => ({
    value,
    label: LOCALE_LABELS[value],
  }));
  if (allLabel) {
    return [{ value: "", label: allLabel }, ...options];
  }
  return options;
}

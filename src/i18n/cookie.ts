import { DEFAULT_LOCALE, resolveAppLocale, type AppLocale } from "@/i18n/locales";

export const LOCALE_COOKIE = "numerae_locale";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function readLocaleCookieFromDocument(): AppLocale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return resolveAppLocale(match?.[1] ? decodeURIComponent(match[1]) : null);
}

export function writeLocaleCookie(locale: AppLocale) {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${MAX_AGE_SECONDS};SameSite=Lax`;
}

export function readLocaleCookieFromHeader(cookieHeader: string | null | undefined): AppLocale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const match = cookieHeader.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return resolveAppLocale(match?.[1] ? decodeURIComponent(match[1]) : null);
}

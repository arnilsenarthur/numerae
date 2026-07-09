import { headers } from "next/headers";
import { readLocaleCookieFromHeader } from "@/i18n/cookie";
import { DEFAULT_LOCALE, resolveAppLocale, type AppLocale } from "@/i18n/locales";

export function resolveLocaleFromAcceptLanguage(header: string | null): AppLocale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header.split(",").map((p) => p.trim().split(";")[0]?.toLowerCase());
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("pt")) return "pt-BR";
    if (part.startsWith("en")) return "en-US";
  }
  return DEFAULT_LOCALE;
}

export async function getRequestLocale(): Promise<AppLocale> {
  const h = await headers();
  const fromCookie = readLocaleCookieFromHeader(h.get("cookie"));
  if (fromCookie !== DEFAULT_LOCALE || h.get("cookie")?.includes("numerae_locale=")) {
    return fromCookie;
  }
  return resolveLocaleFromAcceptLanguage(h.get("accept-language"));
}

export function resolveLocaleFromRequest(request: Request): AppLocale {
  const fromCookie = readLocaleCookieFromHeader(request.headers.get("cookie"));
  if (fromCookie !== DEFAULT_LOCALE || request.headers.get("cookie")?.includes("numerae_locale=")) {
    return fromCookie;
  }
  return resolveLocaleFromAcceptLanguage(request.headers.get("accept-language"));
}

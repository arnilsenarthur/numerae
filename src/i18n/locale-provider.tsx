"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchJson } from "@/lib/fetch-json";
import { readLocaleCookieFromDocument, writeLocaleCookie } from "@/i18n/cookie";
import { createTranslator, type TranslateFn } from "@/i18n/translate";
import { DEFAULT_LOCALE, resolveAppLocale, type AppLocale } from "@/i18n/locales";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: TranslateFn;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  syncUserPreference = true,
}: {
  children: ReactNode;
  initialLocale?: AppLocale;
  /** When true, loads language from /api/user/preferences after cookie. */
  syncUserPreference?: boolean;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    setLocaleState(readLocaleCookieFromDocument());
  }, []);

  useEffect(() => {
    if (!syncUserPreference) return;
    let cancelled = false;
    void fetchJson<{ preference?: { language?: string } }>("/api/user/preferences").then(
      (res) => {
        if (cancelled || !res.response.ok) return;
        const next = resolveAppLocale(res.data?.preference?.language);
        setLocaleState(next);
        writeLocaleCookie(next);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [syncUserPreference]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(() => {
    const setLocale = (next: AppLocale) => {
      setLocaleState(next);
      writeLocaleCookie(next);
    };
    return { locale, setLocale, t: createTranslator(locale) };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

export function useT(): TranslateFn {
  return useLocale().t;
}

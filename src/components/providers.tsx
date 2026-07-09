"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { LocaleProvider } from "@/i18n/locale-provider";
import type { AppLocale } from "@/i18n/locales";

export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: AppLocale;
}) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <LocaleProvider initialLocale={initialLocale}>
        <ToastProvider>{children}</ToastProvider>
      </LocaleProvider>
    </SessionProvider>
  );
}

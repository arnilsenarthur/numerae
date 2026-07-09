"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { getCountryFlagUrl } from "@/lib/country-flags";
import { useLocale } from "@/i18n/locale-provider";
import { SUPPORTED_LOCALES, type AppLocale } from "@/i18n/locales";

const LOCALE_META: Record<AppLocale, { country: string; label: string }> = {
  "pt-BR": { country: "br", label: "Português" },
  "en-US": { country: "us", label: "English" },
};

type LanguageSwitcherProps = {
  size?: "sm" | "md";
  className?: string;
};

export function LanguageSwitcher({ size = "sm", className }: LanguageSwitcherProps) {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const current = LOCALE_META[locale];
  const flagSize = size === "sm" ? 20 : 24;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800",
          size === "md" && "px-2.5 py-2",
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={getCountryFlagUrl(current.country, flagSize)}
          alt=""
          width={flagSize}
          height={flagSize}
          className="rounded-sm object-cover"
        />
        <span className="hidden sm:inline">{current.label}</span>
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-zinc-400" fill="currentColor" aria-hidden>
          <path d="M5.5 7.5 10 12l4.5-4.5H5.5Z" />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          className="absolute right-0 z-50 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {SUPPORTED_LOCALES.map((code) => {
            const meta = LOCALE_META[code];
            const selected = code === locale;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800",
                    selected && "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getCountryFlagUrl(meta.country, 20)}
                    alt=""
                    width={20}
                    height={20}
                    className="rounded-sm object-cover"
                  />
                  {meta.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

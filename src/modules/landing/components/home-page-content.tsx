"use client";

import Link from "next/link";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IconChart,
  IconCoins,
  IconTarget,
  IconWallet,
} from "@/components/ui/icons";
import { useT } from "@/i18n/locale-provider";
import { SITE_NAME } from "@/lib/site";
import { ui } from "@/components/ui/tokens";
import { cn } from "@/lib/utils";

const HIGHLIGHT_KEYS = [
  { icon: IconWallet, key: "accounts" },
  { icon: IconTarget, key: "goals" },
  { icon: IconCoins, key: "investments" },
  { icon: IconChart, key: "overview" },
] as const;

export function HomePageContent() {
  const t = useT();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="mx-auto max-w-3xl text-center">
        <div className="mb-6 flex justify-center">
          <AppLogo size={72} priority />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("landing.heroTitle")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400 sm:text-lg">
          {t("landing.heroSubtitle", { siteName: SITE_NAME })}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register">
            <Button size="lg">{t("landing.ctaStart")}</Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              {t("landing.ctaLogin")}
            </Button>
          </Link>
        </div>
      </section>

      <section className="mt-16 sm:mt-20">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
            {t("landing.featuresTitle")}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">{t("landing.featuresSubtitle")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {HIGHLIGHT_KEYS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.key} className="border-zinc-200/80 dark:border-zinc-800">
                <CardContent className="flex gap-3 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
                      ui.innerRadius,
                    )}
                  >
                    <Icon size="md" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {t(`landing.highlight.${item.key}.title`)}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                      {t(`landing.highlight.${item.key}.description`)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-2xl text-center sm:mt-20">
        <p className="text-sm text-zinc-500">{t("landing.signupNote")}</p>
      </section>
    </div>
  );
}

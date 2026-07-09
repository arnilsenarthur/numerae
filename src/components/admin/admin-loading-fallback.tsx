"use client";

import { useT } from "@/i18n/locale-provider";

export function AdminLoadingFallback() {
  const t = useT();
  return <p className="py-12 text-center text-sm text-zinc-500">{t("admin.common.loading")}</p>;
}

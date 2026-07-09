"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconChevronRight } from "@/components/ui/icons";
import { useT } from "@/i18n/locale-provider";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  const t = useT();

  if (items.length === 0) return null;

  return (
    <nav aria-label={t("ui.breadcrumbs.ariaLabel")} className={cn("flex flex-wrap items-center gap-1", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
            {index > 0 ? (
              <IconChevronRight size="xs" className="shrink-0 text-zinc-300 dark:text-zinc-600" />
            ) : null}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-xs font-medium text-zinc-500 transition-colors hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={cn(
                  "text-xs",
                  isLast
                    ? "font-medium text-zinc-800 dark:text-zinc-200"
                    : "text-zinc-500 dark:text-zinc-400",
                )}
              >
                {item.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

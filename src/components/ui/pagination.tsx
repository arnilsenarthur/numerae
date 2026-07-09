"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

export type PaginationProps = {
  /** Zero-based current page index. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
};

/**
 * Builds `[primeira, atual, última]` (deduplicated) with ellipsis where pages are not consecutive.
 * Example: pages 1 and 3 → `[0, "ellipsis", 2]` → `1 … 3`
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 1) return [];

  const first = 0;
  const last = totalPages - 1;
  const current = Math.min(Math.max(currentPage, 0), last);

  const unique: number[] = [];
  for (const pageIndex of [first, current, last]) {
    if (!unique.includes(pageIndex)) {
      unique.push(pageIndex);
    }
  }

  const result: Array<number | "ellipsis"> = [];
  for (let index = 0; index < unique.length; index += 1) {
    if (index > 0) {
      const previous = unique[index - 1];
      const next = unique[index];
      if (next - previous > 1) {
        result.push("ellipsis");
      }
    }
    result.push(unique[index]);
  }

  return result;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className,
}: PaginationProps) {
  const t = useT();

  if (totalPages <= 1) return null;

  const currentPage = Math.min(page, totalPages - 1);
  const pages = getPaginationRange(currentPage, totalPages);

  const rangeLabel =
    totalItems != null && pageSize != null
      ? totalItems === 0
        ? t("ui.pagination.noResults")
        : t("ui.pagination.rangeOf", {
            from: currentPage * pageSize + 1,
            to: Math.min((currentPage + 1) * pageSize, totalItems),
            total: totalItems,
          })
      : t("ui.pagination.pageOf", { page: currentPage + 1, total: totalPages });

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500",
        className,
      )}
    >
      <span>{rangeLabel}</span>

      <nav className="flex items-center gap-0.5" aria-label={t("ui.pagination.navLabel")}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconOnly
          className="min-w-8 px-0 font-mono text-base leading-none"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={t("ui.pagination.prev")}
        >
          &lt;
        </Button>

        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="inline-flex h-8 min-w-8 items-center justify-center text-zinc-400 select-none"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === currentPage ? "primary" : "secondary"}
              size="sm"
              iconOnly
              className="min-w-8 px-0 tabular-nums"
              onClick={() => onPageChange(item)}
              aria-label={t("ui.pagination.pageLabel", { page: item + 1 })}
              aria-current={item === currentPage ? "page" : undefined}
            >
              {item + 1}
            </Button>
          ),
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          iconOnly
          className="min-w-8 px-0 font-mono text-base leading-none"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={t("ui.pagination.next")}
        >
          &gt;
        </Button>
      </nav>
    </div>
  );
}

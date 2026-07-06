import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { ReactNode } from "react";
import { Money } from "@/components/ui/money";

type StatCardProps = {
  label: string;
  value: number;
  currency?: string;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  className?: string;
};

export function StatCard({
  label,
  value,
  currency,
  trend,
  trendLabel,
  icon,
  className,
}: StatCardProps) {
  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <div
      className={cn(
        "border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950",
        ui.surfaceRadius,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-500">{label}</p>
          <div className="mt-1">
            <Money value={value} currency={currency} size="lg" />
          </div>
        </div>
        {icon ? (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            {icon}
          </div>
        ) : null}
      </div>
      {trend !== undefined ? (
        <p className="mt-2 text-xs">
          <span
            className={cn(
              "font-medium",
              trendPositive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400",
            )}
          >
            {trendPositive ? "+" : ""}
            {trend}%
          </span>
          {trendLabel ? (
            <span className="text-zinc-500"> {trendLabel}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

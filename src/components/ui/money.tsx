import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";

type MoneyProps = {
  value: number;
  currency?: string;
  showSign?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl font-semibold tracking-tight",
};

export function Money({
  value,
  currency,
  showSign = false,
  size = "md",
  className,
}: MoneyProps) {
  const tone =
    showSign && value > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : showSign && value < 0
        ? "text-red-600 dark:text-red-400"
        : "text-zinc-900 dark:text-zinc-100";

  return (
    <span
      className={cn("tabular-nums", sizes[size], showSign ? tone : undefined, className)}
    >
      {formatMoney(value, { currency, showSign })}
    </span>
  );
}

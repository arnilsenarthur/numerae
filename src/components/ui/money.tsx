import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format-money";

export type MoneyTone = "auto" | "income" | "expense" | "transfer";

type MoneyProps = {
  value: number;
  currency?: string;
  showSign?: boolean;
  tone?: MoneyTone;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl font-semibold tracking-tight",
};

function resolveTone(value: number, showSign: boolean, tone: MoneyTone): string {
  if (tone === "expense") return "text-red-600 dark:text-red-400";
  if (tone === "income") return "text-emerald-600 dark:text-emerald-400";
  if (tone === "transfer") return "text-amber-600 dark:text-amber-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  if (showSign && value > 0) return "text-emerald-600 dark:text-emerald-400";
  return "text-zinc-900 dark:text-zinc-100";
}

export function Money({
  value,
  currency,
  showSign = false,
  tone = "auto",
  size = "md",
  className,
}: MoneyProps) {
  const colorClass = resolveTone(value, showSign, tone);

  return (
    <span
      className={cn(
        "inline-block max-w-full truncate tabular-nums",
        sizes[size],
        colorClass,
        className,
      )}
    >
      {formatMoney(value, { currency, showSign })}
    </span>
  );
}

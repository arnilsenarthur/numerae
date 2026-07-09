"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Override the default aria-label. */
  ariaLabel?: string;
};

const sizes = {
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-8 w-8 border-[3px]",
};

export function Spinner({ size = "md", className, ariaLabel }: SpinnerProps) {
  const t = useT();
  const resolvedAriaLabel = ariaLabel ?? t("ui.loader.ariaLabel");

  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-current border-r-transparent text-emerald-600",
        sizes[size],
        className,
      )}
      role="status"
      aria-label={resolvedAriaLabel}
    />
  );
}

type LoaderProps = {
  label?: string;
  size?: SpinnerProps["size"];
  className?: string;
  inline?: boolean;
};

export function Loader({
  label,
  size = "md",
  className,
  inline,
}: LoaderProps) {
  const t = useT();
  const resolvedLabel = label ?? t("ui.loader.loading");

  return (
    <div
      className={cn(
        inline
          ? "inline-flex items-center gap-2"
          : "flex flex-col items-center justify-center gap-2.5 py-8",
        className,
      )}
      role="status"
    >
      <Spinner size={size} />
      {resolvedLabel ? (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{resolvedLabel}</span>
      ) : null}
    </div>
  );
}

type LoaderOverlayProps = {
  show: boolean;
  label?: string;
  className?: string;
};

export function LoaderOverlay({ show, label, className }: LoaderOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-white/70 backdrop-blur-[1px] dark:bg-zinc-950/70",
        className,
      )}
    >
      <Loader label={label} />
    </div>
  );
}

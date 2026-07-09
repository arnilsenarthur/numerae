"use client";

import { cn } from "@/lib/utils";
import { CursorTooltip, type CursorPoint } from "@/components/ui/tooltip";
import { HTMLAttributes, useMemo, useState } from "react";

type ProgressProps = HTMLAttributes<HTMLDivElement> & {
  value: number;
  max?: number;
  size?: "sm" | "md" | "xs";
  variant?: "default" | "success" | "warning" | "danger";
};

export type ProgressFill = {
  value: number;
  className?: string;
  label?: string;
};

type StackedProgressProps = HTMLAttributes<HTMLDivElement> & {
  segments: ProgressFill[];
  max?: number;
  size?: "sm" | "md";
  formatValue?: (value: number, label?: string) => string;
};

const barVariants = {
  default: "bg-emerald-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
};

const segmentColors = [
  "bg-emerald-500",
  "bg-sky-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
];

const sizes = {
  xs: "h-0.5",
  sm: "h-1",
  md: "h-1.5",
};

export function Progress({
  value,
  max = 100,
  size = "md",
  variant = "default",
  className,
  ...props
}: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800",
        sizes[size],
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500 ease-out",
          barVariants[variant],
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function StackedProgress({
  segments,
  max = 100,
  size = "md",
  className,
  formatValue = (value, label) =>
    label ? `${label}: ${Math.round(value)}%` : `${Math.round(value)}%`,
  ...props
}: StackedProgressProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [cursorPoint, setCursorPoint] = useState<CursorPoint | null>(null);

  const layout = useMemo(() => {
    return segments
      .map((segment, index) => {
        const width = Math.min(100, Math.max(0, (segment.value / max) * 100));
        if (width <= 0) return null;

        return {
          segment,
          index,
          width,
          color: segment.className ?? segmentColors[index % segmentColors.length],
        };
      })
      .filter(Boolean) as Array<{
      segment: ProgressFill;
      index: number;
      width: number;
      color: string;
    }>;
  }, [segments, max]);

  const active = activeIndex !== null ? layout.find((item) => item.index === activeIndex) : null;

  function clearHover() {
    setActiveIndex(null);
    setCursorPoint(null);
  }

  return (
    <div className={cn("relative", className)} onMouseLeave={clearHover} {...props}>
      {active && cursorPoint ? (
        <CursorTooltip point={cursorPoint}>
          {formatValue(active.segment.value, active.segment.label)}
        </CursorTooltip>
      ) : null}

      <div
        className={cn(
          "flex overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800",
          sizes[size],
        )}
        onMouseMove={(event) => setCursorPoint({ x: event.clientX, y: event.clientY })}
      >
        {layout.map(({ segment, index, width, color }) => {
          const isActive = activeIndex === index;
          const isDimmed = activeIndex !== null && !isActive;

          return (
            <div
              key={`${segment.label ?? "segment"}-${index}`}
              role="presentation"
              className={cn(
                "h-full cursor-pointer transition-all duration-150 first:rounded-l-full last:rounded-r-full",
                color,
                isDimmed && "opacity-50",
                isActive && "brightness-110",
              )}
              style={{ width: `${width}%` }}
              onMouseEnter={(event) => {
                setActiveIndex(index);
                setCursorPoint({ x: event.clientX, y: event.clientY });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

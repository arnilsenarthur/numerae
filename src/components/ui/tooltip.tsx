"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { CSSProperties, ReactNode } from "react";

type TooltipProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  visible?: boolean;
};

export function Tooltip({
  children,
  className,
  style,
  visible = true,
}: TooltipProps) {
  if (!visible) return null;

  return (
    <span
      role="tooltip"
      style={style}
      className={cn(
        "pointer-events-none inline-block whitespace-nowrap bg-zinc-900 px-1.5 py-0.5 text-[0.65rem] font-medium tabular-nums text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900",
        ui.innerRadius,
        className,
      )}
    >
      {children}
    </span>
  );
}

export type TooltipAlign = "start" | "center" | "end";

export function getTooltipAlign(
  ratio: number,
  threshold = 0.12,
): TooltipAlign {
  if (ratio <= threshold) return "start";
  if (ratio >= 1 - threshold) return "end";
  return "center";
}

export function getTooltipPositionStyle(
  ratio: number,
  options?: {
    edgeThreshold?: number;
    gap?: number;
    placement?: "above" | "below";
  },
): CSSProperties {
  const threshold = options?.edgeThreshold ?? 0.12;
  const gap = options?.gap ?? 6;
  const align = getTooltipAlign(ratio, threshold);

  const translateX =
    align === "start" ? "0" : align === "end" ? "-100%" : "-50%";
  const translateY =
    options?.placement === "below"
      ? `${gap}px`
      : `calc(-100% - ${gap}px)`;

  return {
    left: `${ratio * 100}%`,
    transform: `translateX(${translateX}) translateY(${translateY})`,
  };
}

type TooltipAnchorProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  align?: TooltipAlign;
  /** Offset tooltip above/below the anchor point (zero-size anchors). */
  placement?: "above" | "below";
  gap?: number;
};

const alignClass: Record<TooltipAlign, string> = {
  start: "-translate-x-0",
  center: "-translate-x-1/2",
  end: "-translate-x-full",
};

export function TooltipAnchor({
  children,
  className,
  style,
  align = "center",
  placement,
  gap = 6,
}: TooltipAnchorProps) {
  const hasCustomTransform = style?.transform != null;
  const placementAnchorClass =
    placement && !hasCustomTransform
      ? placement === "above"
        ? "bottom-full left-0"
        : "top-full left-0"
      : undefined;

  const content =
    placement && !hasCustomTransform ? (
      <span
        className="inline-block"
        style={{
          transform:
            placement === "above"
              ? `translateY(calc(-100% - ${gap}px))`
              : `translateY(${gap}px)`,
        }}
      >
        {children}
      </span>
    ) : (
      children
    );

  return (
    <span
      className={cn(
        "pointer-events-none absolute z-50 h-0 w-0 overflow-visible",
        !hasCustomTransform && alignClass[align],
        placementAnchorClass,
        className,
      )}
      style={style}
    >
      {content}
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

const hoverTooltipVisibility =
  "pointer-events-none z-50 opacity-0 transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100";

type HoverTooltipProps = {
  label: ReactNode;
  children: ReactNode;
  placement?: "above" | "below";
  className?: string;
  tooltipClassName?: string;
};

/** Wraps controls/icons to show the design-system tooltip on hover and keyboard focus. */
export function HoverTooltip({
  label,
  children,
  placement = "above",
  className,
  tooltipClassName,
}: HoverTooltipProps) {
  if (label == null || label === "") {
    return <>{children}</>;
  }

  const positionClass =
    placement === "above"
      ? "bottom-full left-1/2 mb-1.5 -translate-x-1/2"
      : "top-full left-1/2 mt-1.5 -translate-x-1/2";

  return (
    <span className={cn("group/tooltip relative inline-flex max-w-full", className)}>
      {children}
      <span
        role="presentation"
        className={cn("absolute", hoverTooltipVisibility, positionClass)}
      >
        <Tooltip className={tooltipClassName}>{label}</Tooltip>
      </span>
    </span>
  );
}

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
    /** Minimum pixel padding from the container edges (default 4). */
    edgePad?: number;
  },
): CSSProperties {
  const threshold = options?.edgeThreshold ?? 0.12;
  const gap = options?.gap ?? 6;
  const pad = options?.edgePad ?? 4;
  const align = getTooltipAlign(ratio, threshold);

  const translateX =
    align === "start" ? "0" : align === "end" ? "-100%" : "-50%";
  const translateY =
    options?.placement === "below"
      ? `${gap}px`
      : `calc(-100% - ${gap}px)`;

  // clamp keeps the left anchor within [pad, 100%-pad] of the container
  const left = `clamp(${pad}px, ${ratio * 100}%, calc(100% - ${pad}px))`;

  return {
    left,
    transform: `translateX(${translateX}) translateY(${translateY})`,
  };
}

export type CursorPoint = { x: number; y: number };

export function getCursorTooltipPosition(
  clientX: number,
  clientY: number,
  size: { width: number; height: number },
  options?: { gap?: number; pad?: number },
): { left: number; top: number; placement: "above" | "below" } {
  const gap = options?.gap ?? 12;
  const pad = options?.pad ?? 8;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const aboveTop = clientY - gap - size.height;
  const belowTop = clientY + gap;

  let placement: "above" | "below" = "above";
  let top = aboveTop;

  const fitsAbove = aboveTop >= pad;
  const fitsBelow = belowTop + size.height <= viewportHeight - pad;

  if (!fitsAbove && fitsBelow) {
    placement = "below";
    top = belowTop;
  } else if (!fitsAbove && !fitsBelow) {
    const aboveOverflow = pad - aboveTop;
    const belowOverflow = belowTop + size.height - (viewportHeight - pad);
    if (belowOverflow < aboveOverflow) {
      placement = "below";
      top = belowTop;
    } else {
      top = aboveTop;
    }
    top = Math.max(pad, Math.min(top, viewportHeight - pad - size.height));
  } else if (fitsAbove) {
    top = aboveTop;
  }

  let left = clientX - size.width / 2;
  left = Math.max(pad, Math.min(left, viewportWidth - pad - size.width));

  return { left, top, placement };
}

type CursorTooltipProps = {
  point: CursorPoint | null;
  children: ReactNode;
  className?: string;
  gap?: number;
  pad?: number;
};

/** Tooltip that follows the cursor with viewport-aware above/below placement. */
export function CursorTooltip({
  point,
  children,
  className,
  gap = 12,
  pad = 8,
}: CursorTooltipProps) {
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!point || !tooltipRef.current) {
      setPosition(null);
      return;
    }

    const { width, height } = tooltipRef.current.getBoundingClientRect();
    const next = getCursorTooltipPosition(point.x, point.y, { width, height }, { gap, pad });
    setPosition({ left: next.left, top: next.top });
  }, [point, children, gap, pad]);

  if (!mounted || !point) return null;

  return createPortal(
    <span
      ref={tooltipRef}
      className={cn("pointer-events-none fixed z-[100]", className)}
      style={
        position
          ? { left: position.left, top: position.top }
          : { left: point.x, top: point.y, visibility: "hidden" }
      }
    >
      <Tooltip>{children}</Tooltip>
    </span>,
    document.body,
  );
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

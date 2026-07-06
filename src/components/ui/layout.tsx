import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg" | "full";
};

const containerSizes = {
  md: "max-w-4xl",
  lg: "max-w-6xl",
  full: "max-w-full",
};

export function Container({
  children,
  className,
  size = "lg",
}: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6", containerSizes[size], className)}>
      {children}
    </div>
  );
}

type GridProps = {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | 4 | 12;
  gap?: 2 | 3 | 4 | 6;
};

const gridCols = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  12: "grid-cols-12",
};

const gaps = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
};

export function Grid({ children, className, cols = 12, gap = 4 }: GridProps) {
  return (
    <div className={cn("grid", gridCols[cols], gaps[gap], className)}>
      {children}
    </div>
  );
}

type ColProps = {
  children: ReactNode;
  className?: string;
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | "full";
  spanSm?: 1 | 2 | 3 | 4 | 6 | 12;
  spanLg?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
};

const colSpan: Record<NonNullable<ColProps["span"]>, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
  full: "col-span-full",
};

const colSpanSm: Record<NonNullable<ColProps["spanSm"]>, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  6: "sm:col-span-6",
  12: "sm:col-span-12",
};

const colSpanLg: Record<NonNullable<ColProps["spanLg"]>, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  6: "lg:col-span-6",
  8: "lg:col-span-8",
  12: "lg:col-span-12",
};

export function Col({
  children,
  className,
  span = 12,
  spanSm,
  spanLg,
}: ColProps) {
  return (
    <div
      className={cn(
        colSpan[span],
        spanSm && colSpanSm[spanSm],
        spanLg && colSpanLg[spanLg],
        className,
      )}
    >
      {children}
    </div>
  );
}

type StackProps = {
  children: ReactNode;
  className?: string;
  gap?: 1 | 2 | 3 | 4 | 6;
  align?: "start" | "center" | "end" | "stretch";
};

const stackAlign = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

export function Stack({
  children,
  className,
  gap = 4,
  align = "stretch",
}: StackProps) {
  return (
    <div
      className={cn(
        "flex flex-col",
        gaps[gap],
        stackAlign[align],
        className,
      )}
    >
      {children}
    </div>
  );
}

type RowProps = {
  children: ReactNode;
  className?: string;
  gap?: 2 | 3 | 4 | 6;
  align?: "start" | "center" | "end" | "baseline";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
};

const rowAlign = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  baseline: "items-baseline",
};

const rowJustify = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export function Row({
  children,
  className,
  gap = 3,
  align = "center",
  justify = "start",
  wrap,
}: RowProps) {
  return (
    <div
      className={cn(
        "flex",
        gaps[gap],
        rowAlign[align],
        rowJustify[justify],
        wrap && "flex-wrap",
        className,
      )}
    >
      {children}
    </div>
  );
}

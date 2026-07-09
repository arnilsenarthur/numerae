"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipAnchor, getTooltipAlign, getTooltipPositionStyle } from "@/components/ui/tooltip";
import {
  ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ChartPoint = {
  label: string;
  value: number;
  color?: string;
  segments?: ChartPoint[];
};

export type ChartSeries = {
  id: string;
  label: string;
  data: ChartPoint[];
  color?: string;
  strokeClassName?: string;
};

export type ChartVariant = "line" | "sparkline" | "bar" | "column" | "donut";

export type ChartProps = {
  variant: ChartVariant;
  data: ChartPoint[];
  series?: ChartSeries[];
  className?: string;
  formatValue?: (value: number, label?: string) => string;
  animateKey?: string | number;
  max?: number;
  showGrid?: boolean;
  showArea?: boolean;
  size?: number;
  strokeClassName?: string;
  stacked?: boolean;
  fullWidth?: boolean;
};

const palette = {
  bar: ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-violet-500", "bg-rose-500"],
  column: ["fill-emerald-500", "fill-sky-500", "fill-amber-500", "fill-violet-500", "fill-rose-500"],
  line: ["stroke-emerald-500", "stroke-sky-500", "stroke-amber-500", "stroke-violet-500", "stroke-rose-500"],
  donutStroke: [
    "stroke-emerald-500",
    "stroke-sky-500",
    "stroke-amber-500",
    "stroke-violet-500",
    "stroke-rose-500",
  ],
  donutDot: ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-violet-500", "bg-rose-500"],
};

const AXIS = {
  width: 320,
  height: 168,
  padding: { top: 10, right: 10, bottom: 26, left: 42 },
  heightClass: "h-44",
};

const SPARKLINE = {
  width: 320,
  height: 40,
  padding: 4,
  heightClass: "h-10",
};

const STROKE = {
  grid: 1,
  line: 2,
  guide: 1,
  dot: 4,
  hit: 10,
  donut: 4,
};

const DEFAULT_PATH_LENGTH = 500;

function ChartFrame({
  children,
  className,
  animate = true,
  frameRef,
}: {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  frameRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={frameRef}
      className={cn("relative w-full overflow-visible", animate && "animate-chart-in", className)}
    >
      {children}
    </div>
  );
}

function getPlotBox(padding = AXIS.padding, width = AXIS.width) {
  return {
    width,
    height: AXIS.height,
    padding,
    plotWidth: width - padding.left - padding.right,
    plotHeight: AXIS.height - padding.top - padding.bottom,
    heightClass: AXIS.heightClass,
  };
}

function getValueRange(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return { min, max, range };
}

function getYTicks(min: number, max: number, count = 4) {
  const range = max - min || 1;
  const step = range / (count - 1);

  return Array.from({ length: count }, (_, index) => {
    const value = max - step * index;
    return Number.isInteger(value) ? value : Math.round(value * 10) / 10;
  });
}

function valueToY(
  value: number,
  min: number,
  range: number,
  plotHeight: number,
  paddingTop: number,
) {
  return paddingTop + plotHeight - ((value - min) / range) * plotHeight;
}

function normalizePadding(
  padding: number | { top: number; right: number; bottom: number; left: number },
) {
  if (typeof padding === "number") {
    return { top: padding, right: padding, bottom: padding, left: padding };
  }
  return padding;
}

function defaultFormatValue(value: number) {
  return String(value);
}

/** Compact label for axis ticks — avoids currency symbols and long decimals. */
function compactAxisLabel(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${Math.round(abs / 1_000)}k`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}

function resolveSeries(data: ChartPoint[], series?: ChartSeries[]): ChartSeries[] {
  if (series?.length) return series;
  return [{ id: "default", label: "Valor", data }];
}

function setPathLengthsIfChanged(
  setPathLengths: React.Dispatch<React.SetStateAction<number[]>>,
  next: number[],
) {
  setPathLengths((prev) =>
    prev.length === next.length && prev.every((value, index) => value === next[index])
      ? prev
      : next,
  );
}

function collectValues(series: ChartSeries[]) {
  return series.flatMap((item) => item.data.map((point) => point.value));
}

function roundSvg(value: number) {
  return Math.round(value * 10000) / 10000;
}

function svgPointFromMouse(event: React.MouseEvent<SVGGraphicsElement>) {
  const svg = event.currentTarget.ownerSVGElement;
  if (!svg) return null;

  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;

  const matrix = svg.getScreenCTM();
  if (!matrix) return null;

  return point.matrixTransform(matrix.inverse());
}

function getNearestPointIndex(
  svgX: number,
  paddingLeft: number,
  plotWidth: number,
  pointCount: number,
) {
  const step = plotWidth / (pointCount - 1);
  const rawIndex = Math.round((svgX - paddingLeft) / step);
  return Math.max(0, Math.min(pointCount - 1, rawIndex));
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: roundSvg(cx + radius * Math.cos(rad)),
    y: roundSvg(cy + radius * Math.sin(rad)),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
  const r = roundSvg(radius);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

type PlotMetrics = { left: number; top: number; width: number; height: number };

function usePlotMetrics(
  frameRef: React.RefObject<HTMLDivElement | null>,
  svgRef: React.RefObject<SVGSVGElement | null>,
  viewWidth: number,
  viewHeight: number,
  padding: number | ReturnType<typeof normalizePadding>,
) {
  const [metrics, setMetrics] = useState<PlotMetrics | null>(null);
  const pad = normalizePadding(padding);
  const plotW = viewWidth - pad.left - pad.right;
  const plotH = viewHeight - pad.top - pad.bottom;

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const svg = svgRef.current;
    if (!frame || !svg) return;

    const update = () => {
      const fRect = frame.getBoundingClientRect();
      const sRect = svg.getBoundingClientRect();
      if (sRect.width === 0 || sRect.height === 0) return;

      const scale = Math.min(sRect.width / viewWidth, sRect.height / viewHeight);
      const renderedW = viewWidth * scale;
      const renderedH = viewHeight * scale;
      const offsetX = (sRect.width - renderedW) / 2;
      const offsetY = (sRect.height - renderedH) / 2;

      setMetrics({
        left: sRect.left - fRect.left + offsetX + pad.left * scale,
        top: sRect.top - fRect.top + offsetY + pad.top * scale,
        width: plotW * scale,
        height: plotH * scale,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(frame);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [frameRef, svgRef, viewWidth, viewHeight, pad.left, pad.top, plotW, plotH]);

  return { metrics, pad, plotW, plotH };
}

function PlotTooltip({
  metrics,
  pad,
  plotW,
  plotH,
  x,
  y,
  children,
}: {
  metrics: PlotMetrics;
  pad: ReturnType<typeof normalizePadding>;
  plotW: number;
  plotH: number;
  x: number;
  y: number;
  children: ReactNode;
}) {
  const ratio = Math.min(1, Math.max(0, (x - pad.left) / plotW));
  const yRatio = Math.min(1, Math.max(0, (y - pad.top) / plotH));
  const align = getTooltipAlign(ratio);
  const translateX =
    align === "start" ? "0" : align === "end" ? "-100%" : "-50%";

  return (
    <TooltipAnchor
      className="pointer-events-none z-30"
      style={{
        left: metrics.left + ratio * metrics.width,
        top: metrics.top + yRatio * metrics.height,
        transform: `translateX(${translateX}) translateY(calc(-100% - 8px))`,
      }}
    >
      <Tooltip>{children}</Tooltip>
    </TooltipAnchor>
  );
}

function ChartSvgRoot({
  viewWidth,
  viewHeight,
  padding,
  heightClass,
  className,
  animateKey,
  onMouseLeave,
  children,
  tooltip,
}: {
  viewWidth: number;
  viewHeight: number;
  padding: number | ReturnType<typeof normalizePadding>;
  heightClass: string;
  className?: string;
  animateKey?: string | number;
  onMouseLeave?: () => void;
  children: ReactNode;
  tooltip?: { x: number; y: number; content: ReactNode } | null;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { metrics, pad, plotW, plotH } = usePlotMetrics(
    frameRef,
    svgRef,
    viewWidth,
    viewHeight,
    padding,
  );

  return (
    <ChartFrame
      frameRef={frameRef}
      className={className}
      animate={animateKey === undefined}
    >
      <div
        className={cn(
          "relative w-full overflow-visible",
          heightClass,
          animateKey !== undefined && "animate-chart-update",
        )}
        key={animateKey !== undefined ? String(animateKey) : undefined}
        onMouseLeave={onMouseLeave}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${viewWidth} ${viewHeight}`}
          className="block h-full w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {children}
        </svg>
      </div>
      {tooltip && metrics ? (
        <PlotTooltip
          metrics={metrics}
          pad={pad}
          plotW={plotW}
          plotH={plotH}
          x={tooltip.x}
          y={tooltip.y}
        >
          {tooltip.content}
        </PlotTooltip>
      ) : null}
    </ChartFrame>
  );
}

function getBarTooltipRatio(
  trackRatio: number,
  itemLabel: string,
  activeKey: string | null,
  segmentBlocks: Array<{ key: string; width: number }>,
) {
  if (!activeKey?.startsWith(`${itemLabel}|`)) return trackRatio * 0.5;

  const activeSegment = segmentBlocks.find((block) => block.key === activeKey);
  if (!activeSegment) return trackRatio * 0.5;

  let offset = 0;
  for (const block of segmentBlocks) {
    if (block.key === activeKey) {
      return trackRatio * ((offset + block.width / 2) / 100);
    }
    offset += block.width;
  }

  return trackRatio * 0.5;
}

function BarChartView({
  data,
  max,
  className,
  formatValue = (value) => `${value}%`,
  stacked = false,
  animateKey,
}: {
  data: ChartPoint[];
  max?: number;
  className?: string;
  formatValue?: (value: number, label?: string) => string;
  stacked?: boolean;
  animateKey?: string | number;
}) {
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      data.map((item) => {
        const segments = stacked && item.segments?.length ? item.segments : null;
        const total = segments
          ? segments.reduce((sum, segment) => sum + segment.value, 0)
          : item.value;
        return { ...item, segments, total };
      }),
    [data, stacked],
  );

  const peak = max ?? Math.max(...rows.map((item) => item.total), 1);

  return (
    <ChartFrame className={cn("space-y-3", className)} animate={animateKey === undefined}>
      <div
        className={cn("space-y-3", animateKey !== undefined && "animate-chart-update")}
        key={animateKey !== undefined ? String(animateKey) : undefined}
      >
        {rows.map((item, rowIndex) => {
          const trackRatio = item.total / peak;
          const fillWidth = `${Math.max(4, trackRatio * 100)}%`;
          const isRowActive = activeKey?.startsWith(`${item.label}|`) ?? false;
          const hasHover = activeKey !== null;

          const segmentBlocks =
            item.segments?.map((segment, segmentIndex) => ({
              ...segment,
              segmentIndex,
              width: item.total > 0 ? (segment.value / item.total) * 100 : 0,
              key: `${item.label}|${segment.label}`,
            })) ?? [];

          const activeSegment = segmentBlocks.find((block) => block.key === activeKey);
          const tooltipLabel = activeSegment ?? item;
          const tooltipValue = activeSegment?.value ?? item.total;
          const tooltipRatio = getBarTooltipRatio(
            trackRatio,
            item.label,
            activeKey,
            segmentBlocks,
          );

          return (
            <div key={item.label} className="relative">
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span
                  className={cn(
                    "truncate transition-colors",
                    isRowActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-500",
                    hasHover && !isRowActive && "opacity-50",
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 tabular-nums text-zinc-700 transition-colors dark:text-zinc-300",
                    hasHover && !isRowActive && "opacity-50",
                  )}
                >
                  {formatValue(item.total, item.label)}
                </span>
              </div>

              <div
                className="relative h-2.5 overflow-visible rounded-full bg-zinc-100 dark:bg-zinc-800"
                onMouseLeave={() => setActiveKey(null)}
              >
                {segmentBlocks.length ? (
                  <div
                    className="absolute inset-y-0 left-0 flex h-full overflow-hidden rounded-full"
                    style={{ width: fillWidth }}
                  >
                    {segmentBlocks.map((block) => {
                      const isActive = activeKey === block.key;

                      return (
                        <div
                          key={block.key}
                          role="presentation"
                          className={cn(
                            "h-full cursor-pointer transition-opacity duration-150",
                            block.color ??
                              palette.bar[
                                (rowIndex + block.segmentIndex) % palette.bar.length
                              ],
                            isActive
                              ? "brightness-110"
                              : hasHover
                                ? "opacity-40"
                                : "opacity-90",
                          )}
                          style={{ width: `${block.width}%` }}
                          onMouseEnter={() => setActiveKey(block.key)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div
                    role="presentation"
                    className={cn(
                      "animate-chart-bar absolute inset-y-0 left-0 h-full origin-left cursor-pointer rounded-full transition-opacity duration-150",
                      item.color ?? palette.bar[rowIndex % palette.bar.length],
                      isRowActive
                        ? "brightness-110 shadow-[0_0_10px_rgba(16,185,129,0.35)]"
                        : hasHover
                          ? "opacity-40"
                          : "opacity-90",
                    )}
                    style={{ width: fillWidth, animationDelay: `${rowIndex * 60}ms` }}
                    onMouseEnter={() => setActiveKey(`${item.label}|total`)}
                  />
                )}

                {isRowActive ? (
                  <TooltipAnchor
                    className="pointer-events-none absolute z-30"
                    style={{
                      top: 0,
                      ...getTooltipPositionStyle(tooltipRatio, { gap: 8 }),
                    }}
                  >
                    <Tooltip>
                      {tooltipLabel.label}: {formatValue(tooltipValue, tooltipLabel.label)}
                    </Tooltip>
                  </TooltipAnchor>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </ChartFrame>
  );
}
function ColumnChartView({
  data,
  max,
  className,
  formatValue = defaultFormatValue,
  stacked = false,
  animateKey,
}: {
  data: ChartPoint[];
  max?: number;
  className?: string;
  formatValue?: (value: number, label?: string) => string;
  stacked?: boolean;
  animateKey?: string | number;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const { width, height, padding, plotWidth, plotHeight, heightClass } = getPlotBox();

  const columnTotals = data.map((item) =>
    stacked && item.segments?.length
      ? item.segments.reduce((sum, segment) => sum + segment.value, 0)
      : item.value,
  );

  const peak = max ?? Math.max(...columnTotals, 1);
  const { min, range } = getValueRange([0, peak]);
  const yTicks = getYTicks(min, peak, 4);
  const barWidth = plotWidth / data.length;
  const gap = barWidth * 0.22;
  const innerWidth = barWidth - gap;

  const columns = data.map((item, index) => {
    const x = padding.left + index * barWidth + gap / 2;
    const total = columnTotals[index];
    const totalHeight = (total / peak) * plotHeight;
    let segmentOffset = 0;

    const segments =
      stacked && item.segments?.length
        ? item.segments.map((segment, segmentIndex) => {
            const segmentHeight = (segment.value / peak) * plotHeight;
            const y = padding.top + plotHeight - segmentOffset - segmentHeight;
            const block = { ...segment, segmentIndex, x, y, innerWidth, segmentHeight };
            segmentOffset += segmentHeight;
            return block;
          })
        : [
            {
              ...item,
              segmentIndex: 0,
              x,
              y: padding.top + plotHeight - totalHeight,
              innerWidth,
              segmentHeight: totalHeight,
            },
          ];

    return { ...item, index, x, innerWidth, segments };
  });

  const activeColumn = activeIndex !== null ? columns[activeIndex] : null;
  const activeSegment = activeColumn?.segments[activeSegmentIndex] ?? null;
  const hasHover = activeIndex !== null;

  return (
    <ChartSvgRoot
      viewWidth={width}
      viewHeight={height}
      padding={padding}
      heightClass={heightClass}
      className={className}
      animateKey={animateKey}
      onMouseLeave={() => {
        setActiveIndex(null);
        setActiveSegmentIndex(0);
      }}
      tooltip={
        activeSegment
          ? {
              x: activeSegment.x + activeSegment.innerWidth / 2,
              y: activeSegment.y,
              content: `${activeSegment.label}: ${formatValue(activeSegment.value, activeSegment.label)}`,
            }
          : null
      }
    >
      {yTicks.map((tick) => {
        const y = valueToY(tick, min, range, plotHeight, padding.top);

        return (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              strokeWidth={STROKE.grid}
              vectorEffect="non-scaling-stroke"
              className={cn(
                "transition-colors duration-200",
                hasHover
                  ? "stroke-zinc-200/80 dark:stroke-zinc-700/80"
                  : "stroke-zinc-100 dark:stroke-zinc-800",
              )}
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              className="fill-zinc-400 text-[8px] tabular-nums"
            >
              {compactAxisLabel(tick)}
            </text>
          </g>
        );
      })}

      {columns.map((column) => {
        const isColumnActive = activeIndex === column.index;
        const isColumnDimmed = hasHover && !isColumnActive;

        return (
          <g key={column.label}>
            {column.segments.map((segment) => {
              const isSegmentActive =
                isColumnActive && activeSegmentIndex === segment.segmentIndex;

              return (
                <rect
                  key={`${column.label}-${segment.label}`}
                  x={segment.x}
                  y={segment.y}
                  width={segment.innerWidth}
                  height={segment.segmentHeight}
                  rx={2}
                  className={cn(
                    "animate-chart-column cursor-pointer transition-all duration-200",
                    segment.color ??
                      palette.column[
                        (column.index + segment.segmentIndex) % palette.column.length
                      ],
                    isSegmentActive
                      ? "opacity-100 brightness-110"
                      : hasHover
                        ? "opacity-35"
                        : "opacity-90",
                  )}
                  style={{ animationDelay: `${column.index * 70 + segment.segmentIndex * 35}ms` }}
                  onMouseEnter={() => {
                    setActiveIndex(column.index);
                    setActiveSegmentIndex(segment.segmentIndex);
                  }}
                />
              );
            })}
            <text
              x={column.x + column.innerWidth / 2}
              y={height - 8}
              textAnchor="middle"
              pointerEvents="none"
              className={cn(
                "fill-zinc-400 text-[8px] transition-colors duration-200",
                isColumnActive && "fill-emerald-600 font-medium dark:fill-emerald-400",
                isColumnDimmed && "opacity-40",
              )}
            >
              {column.label}
            </text>
          </g>
        );
      })}
    </ChartSvgRoot>
  );
}

function SparklineView({
  data,
  series,
  className,
  strokeClassName = "stroke-emerald-500",
  formatValue = defaultFormatValue,
  animateKey,
}: {
  data: ChartPoint[];
  series?: ChartSeries[];
  className?: string;
  strokeClassName?: string;
  formatValue?: (value: number, label?: string) => string;
  animateKey?: string | number;
}) {
  const resolvedSeries = useMemo(() => resolveSeries(data, series), [data, series]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [pathLengths, setPathLengths] = useState<number[]>([]);

  const pointCount = resolvedSeries[0]?.data.length ?? 0;

  const { lines, pathKey } = useMemo(() => {
    const categories = resolvedSeries[0]?.data;
    if (!categories || pointCount < 2) return { lines: [], pathKey: "" };

    const values = collectValues(resolvedSeries);
    const { min, max, range } = getValueRange(values);
    const { width, height, padding } = SPARKLINE;
    const plotW = width - padding * 2;
    const plotH = height - padding * 2;

    const nextLines = resolvedSeries.map((item, seriesIndex) => {
      const coords = item.data.map((point, index) => {
        const x = padding + (index / (pointCount - 1)) * plotW;
        const y = height - padding - ((point.value - min) / range) * plotH;
        return {
          x,
          y,
          point: point.value,
          label: point.label ?? categories[index]?.label,
        };
      });

      return {
        ...item,
        seriesIndex,
        coords,
        path: coords
          .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
          .join(" "),
        strokeClassName:
          item.strokeClassName ??
          palette.line[seriesIndex % palette.line.length],
      };
    });

    return {
      lines: nextLines,
      pathKey: nextLines.map((line) => line.path).join("|"),
    };
  }, [pointCount, resolvedSeries]);

  useLayoutEffect(() => {
    setPathLengthsIfChanged(
      setPathLengths,
      pathRefs.current.map((node) => node?.getTotalLength() ?? DEFAULT_PATH_LENGTH),
    );
  }, [pathKey, animateKey]);

  if (lines.length === 0 || pointCount < 2) return null;

  const activePoint =
    activeIndex !== null
      ? lines
          .map((line) => line.coords[activeIndex])
          .reduce((top, point) => (point.y < top.y ? point : top))
      : null;
  const hasHover = activeIndex !== null;
  const plotW = SPARKLINE.width - SPARKLINE.padding * 2;

  function handlePlotHover(event: React.MouseEvent<SVGRectElement>) {
    const svgPoint = svgPointFromMouse(event);
    if (!svgPoint) return;

    setActiveIndex(
      getNearestPointIndex(svgPoint.x, SPARKLINE.padding, plotW, pointCount),
    );
  }

  return (
    <ChartSvgRoot
      viewWidth={SPARKLINE.width}
      viewHeight={SPARKLINE.height}
      padding={SPARKLINE.padding}
      heightClass={SPARKLINE.heightClass}
      className={className}
      animateKey={animateKey}
      onMouseLeave={() => setActiveIndex(null)}
      tooltip={
        activePoint
          ? {
              x: activePoint.x,
              y: activePoint.y,
              content: (
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {activePoint.label ?? `Ponto ${activeIndex! + 1}`}
                  </span>
                  {lines.map((line) => {
                    const point = line.coords[activeIndex!];
                    return (
                      <span key={line.id}>
                        {line.label}: {formatValue(point.point, point.label)}
                      </span>
                    );
                  })}
                </span>
              ),
            }
          : null
      }
    >
      {hasHover && activePoint ? (
        <>
          <line
            x1={activePoint.x}
            x2={activePoint.x}
            y1={SPARKLINE.padding}
            y2={SPARKLINE.height - SPARKLINE.padding}
            strokeWidth={STROKE.guide}
            vectorEffect="non-scaling-stroke"
            className="stroke-emerald-500/40"
            strokeDasharray="2 2"
          />
          {lines.map((line) => {
            const point = line.coords[activeIndex!];
            return (
              <circle
                key={`${line.id}-dot`}
                cx={point.x}
                cy={point.y}
                r={STROKE.dot}
                className={cn("fill-white stroke-[2] dark:fill-zinc-950", line.strokeClassName)}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </>
      ) : null}

      {lines.map((line, index) => (
        <path
          key={line.id}
          ref={(node) => {
            pathRefs.current[index] = node;
          }}
          d={line.path}
          fill="none"
          strokeWidth={STROKE.line}
          vectorEffect="non-scaling-stroke"
          className={cn(
            line.strokeClassName,
            "animate-chart-line transition-opacity duration-300",
            hasHover ? "opacity-45" : "opacity-100",
          )}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ "--path-length": pathLengths[index] ?? DEFAULT_PATH_LENGTH } as React.CSSProperties}
        />
      ))}

      <rect
        x={SPARKLINE.padding}
        y={SPARKLINE.padding}
        width={plotW}
        height={SPARKLINE.height - SPARKLINE.padding * 2}
        fill="transparent"
        className="cursor-crosshair"
        onMouseMove={handlePlotHover}
      />
    </ChartSvgRoot>
  );
}

function DonutChartView({
  segments,
  size = 112,
  className,
  formatValue,
  animateKey,
}: {
  segments: ChartPoint[];
  size?: number;
  className?: string;
  formatValue?: (value: number, label?: string) => string;
  animateKey?: string | number;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [pointerY, setPointerY] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  const cx = 18;
  const cy = 18;
  const radius = 12.5;
  let cursor = 0;

  const arcs = segments.map((segment, index) => {
    const start = roundSvg(cursor);
    // Um arco SVG de exatamente 360° tem início e fim no mesmo ponto e não
    // renderiza; limitamos a 359.96° para fatias de ~100% aparecerem.
    const sweep = Math.min(roundSvg((segment.value / total) * 360), 359.96);
    const mid = start + sweep / 2;
    cursor += sweep;
    const anchor = polarToCartesian(cx, cy, radius + 1.5, mid);
    return {
      ...segment,
      index,
      start,
      sweep,
      mid,
      anchorX: anchor.x,
      anchorY: anchor.y,
      path: describeArc(cx, cy, radius, start, start + sweep),
    };
  });

  const activeSegment = arcs.find((segment) => segment.label === active);
  const tooltipRatio = activeSegment ? activeSegment.anchorX / 36 : 0.5;
  const tooltipAlign = getTooltipAlign(tooltipRatio);
  const tooltipTranslateX =
    tooltipAlign === "start" ? "0" : tooltipAlign === "end" ? "-100%" : "-50%";

  function handlePointerMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    setPointerY(event.clientY - rect.top);
  }

  return (
    <ChartFrame
      className={cn(
        "max-w-full min-w-0 overflow-hidden",
        "flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4",
        className,
      )}
      animate={animateKey === undefined}
    >
      <div
        ref={wrapRef}
        className={cn(
          "relative shrink-0 overflow-visible",
          animateKey !== undefined && "animate-chart-update",
        )}
        key={animateKey !== undefined ? String(animateKey) : undefined}
        style={{ width: size, height: size }}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => {
          setActive(null);
          setPointerY(null);
        }}
      >
        {activeSegment ? (
          <TooltipAnchor
            className="pointer-events-none absolute z-30"
            style={{
              left: (activeSegment.anchorX / 36) * size,
              top: pointerY ?? 0,
              transform: `translateX(${tooltipTranslateX}) translateY(calc(-100% - 8px))`,
            }}
          >
            <Tooltip>
              {activeSegment.label}:{" "}
              {formatValue
                ? formatValue(activeSegment.value, activeSegment.label)
                : `${Math.round((activeSegment.value / total) * 100)}%`}
            </Tooltip>
          </TooltipAnchor>
        ) : null}
        <svg width={size} height={size} viewBox="0 0 36 36">
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            className="stroke-zinc-100 dark:stroke-zinc-800"
            strokeWidth={STROKE.donut}
          />
          {arcs.map((segment) => {
            const isActive = active === segment.label;
            const isDimmed = active !== null && !isActive;
            const isHexColor = segment.color?.startsWith("#");
            const strokeClass = isHexColor
              ? undefined
              : (segment.color ?? palette.donutStroke[segment.index % palette.donutStroke.length]);

            return (
              <path
                key={segment.label}
                d={segment.path}
                fill="none"
                strokeLinecap="butt"
                className={cn(
                  strokeClass,
                  "animate-chart-donut cursor-pointer transition-all duration-200",
                  isDimmed ? "opacity-30" : "opacity-100",
                  isActive && "brightness-125",
                )}
                strokeWidth={isActive ? STROKE.donut + 1 : STROKE.donut}
                style={{
                  animationDelay: `${segment.index * 80}ms`,
                  ...(isHexColor ? { stroke: segment.color } : null),
                }}
                onMouseEnter={() => setActive(segment.label)}
              />
            );
          })}
        </svg>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5 text-xs">
        {arcs.map((segment) => {
          const isActive = active === segment.label;
          const isHexColor = segment.color?.startsWith("#");

          return (
            <li
              key={segment.label}
              className={cn(
                "flex cursor-pointer flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md px-1 py-0.5 transition-colors",
                isActive && "bg-zinc-100 dark:bg-zinc-900",
                active !== null && !isActive && "opacity-50",
              )}
              onMouseEnter={() => {
                setActive(segment.label);
                setPointerY(null);
              }}
              onMouseLeave={() => setActive(null)}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    !isHexColor && palette.donutDot[segment.index % palette.donutDot.length],
                  )}
                  style={isHexColor ? { backgroundColor: segment.color } : undefined}
                />
                <span className="break-words text-zinc-500">{segment.label}</span>
              </span>
              <span className="flex min-w-0 basis-full flex-wrap items-baseline gap-x-1.5 gap-y-0.5 pl-4 tabular-nums text-zinc-700 sm:ml-auto sm:basis-auto sm:flex-nowrap sm:pl-0 dark:text-zinc-300">
                {formatValue ? (
                  <>
                    <span className="max-w-full break-all font-medium sm:break-normal">
                      {formatValue(segment.value, segment.label)}
                    </span>
                    <span className="text-zinc-400">
                      {Math.round((segment.value / total) * 100)}%
                    </span>
                  </>
                ) : (
                  `${Math.round((segment.value / total) * 100)}%`
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </ChartFrame>
  );
}

function LineChartView({
  data,
  series,
  className,
  formatValue = defaultFormatValue,
  showGrid = true,
  showArea = true,
  animateKey,
  strokeClassName,
  fullWidth = false,
}: {
  data: ChartPoint[];
  series?: ChartSeries[];
  className?: string;
  formatValue?: (value: number, label?: string) => string;
  showGrid?: boolean;
  showArea?: boolean;
  animateKey?: string | number;
  strokeClassName?: string;
  fullWidth?: boolean;
}) {
  const resolvedSeries = useMemo(
    () =>
      resolveSeries(data, series).map((item, index) => ({
        ...item,
        strokeClassName:
          item.strokeClassName ??
          strokeClassName ??
          palette.line[index % palette.line.length],
      })),
    [data, series, strokeClassName],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(AXIS.width);

  useLayoutEffect(() => {
    if (!fullWidth) {
      setMeasuredWidth(AXIS.width);
      return;
    }

    const element = containerRef.current;
    if (!element) return;

    const update = () => {
      const width = element.getBoundingClientRect().width;
      if (width > 0) setMeasuredWidth(width);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => observer.disconnect();
  }, [fullWidth]);

  const chartWidth = fullWidth ? measuredWidth : AXIS.width;

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const [pathLengths, setPathLengths] = useState<number[]>([]);

  const layout = useMemo(() => {
    const categories = resolvedSeries[0]?.data;
    if (!categories || categories.length < 2) return null;

    const { width, height, padding, plotWidth, plotHeight, heightClass } = getPlotBox(
      AXIS.padding,
      chartWidth,
    );
    const values = collectValues(resolvedSeries);
    const { min, max, range } = getValueRange(values);
    const yTicks = getYTicks(min, max, 4);
    const shouldShowArea = showArea && resolvedSeries.length === 1;

    const lines = resolvedSeries.map((item) => {
      const points = item.data.map((point, index) => {
        const x = padding.left + (index / (categories.length - 1)) * plotWidth;
        const y = valueToY(point.value, min, range, plotHeight, padding.top);
        return { ...point, x, y, index };
      });

      const linePath = points
        .map(({ x, y }, index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
        .join(" ");

      const areaPath =
        shouldShowArea && item.id === resolvedSeries[0].id
          ? `${linePath} L ${points[points.length - 1].x} ${
              padding.top + plotHeight
            } L ${points[0].x} ${padding.top + plotHeight} Z`
          : null;

      return { ...item, points, linePath, areaPath };
    });

    const maxLabelChars = categories.reduce(
      (max, point) => Math.max(max, (point.label ?? "").length),
      0,
    );
    // Approximate label footprint to avoid X-axis text overlap on dense timelines.
    const estimatedLabelWidth = Math.max(28, Math.min(96, maxLabelChars * 5.2));
    const maxLabelCount = Math.max(2, Math.floor(plotWidth / estimatedLabelWidth));
    const labelStep = Math.max(
      1,
      Math.ceil((categories.length - 1) / Math.max(1, maxLabelCount - 1)),
    );

    return {
      width,
      height,
      padding,
      plotHeight,
      plotWidth,
      heightClass,
      yTicks,
      min,
      range,
      lines,
      categories,
      labelStep,
      pathKey: lines.map((line) => line.linePath).join("|"),
    };
  }, [resolvedSeries, showArea, chartWidth]);

  useLayoutEffect(() => {
    setPathLengthsIfChanged(
      setPathLengths,
      pathRefs.current.map((node) => node?.getTotalLength() ?? DEFAULT_PATH_LENGTH),
    );
  }, [layout?.pathKey, animateKey]);

  if (!layout) return null;

  const activePoint =
    activeIndex !== null
      ? layout.lines
          .map((line) => line.points[activeIndex])
          .reduce((top, point) => (point.y < top.y ? point : top))
      : null;
  const hasHover = activeIndex !== null;

  function handlePlotHover(event: React.MouseEvent<SVGRectElement>) {
    const svgPoint = svgPointFromMouse(event);
    if (!svgPoint || !layout) return;

    setActiveIndex(
      getNearestPointIndex(
        svgPoint.x,
        layout.padding.left,
        layout.plotWidth,
        layout.categories.length,
      ),
    );
  }

  return (
    <div ref={containerRef} className="w-full space-y-1.5">
      <ChartSvgRoot
      viewWidth={layout.width}
      viewHeight={layout.height}
      padding={layout.padding}
      heightClass={layout.heightClass}
      className={className}
      animateKey={animateKey}
      onMouseLeave={() => setActiveIndex(null)}
      tooltip={
        activePoint
          ? {
              x: activePoint.x,
              y: activePoint.y,
              content: (
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{activePoint.label}</span>
                  {layout.lines.map((line) => {
                    const point = line.points[activeIndex!];
                    return (
                      <span key={line.id}>
                        {line.label}: {formatValue(point.value, point.label)}
                      </span>
                    );
                  })}
                </span>
              ),
            }
          : null
      }
    >
      {showGrid
        ? layout.yTicks.map((tick) => {
            const y = valueToY(
              tick,
              layout.min,
              layout.range,
              layout.plotHeight,
              layout.padding.top,
            );

            return (
              <g key={tick}>
                <line
                  x1={layout.padding.left}
                  x2={layout.width - layout.padding.right}
                  y1={y}
                  y2={y}
                  strokeWidth={STROKE.grid}
                  vectorEffect="non-scaling-stroke"
                  className={cn(
                    "transition-colors duration-200",
                    hasHover
                      ? "stroke-zinc-200/90 dark:stroke-zinc-700/90"
                      : "stroke-zinc-100 dark:stroke-zinc-800",
                  )}
                />
                <text
                  x={layout.padding.left - 6}
                  y={y + 3}
                  textAnchor="end"
                  className={cn(
                    "fill-zinc-400 text-[8px] tabular-nums transition-opacity duration-200",
                    hasHover && "opacity-50",
                  )}
                >
                  {compactAxisLabel(tick)}
                </text>
              </g>
            );
          })
        : null}

      {layout.lines.map((line) =>
        line.areaPath ? (
          <path
            key={`${line.id}-area`}
            d={line.areaPath}
            className={cn(
              "fill-emerald-500/10 transition-all duration-300",
              hasHover ? "fill-emerald-500/20" : "fill-emerald-500/10",
            )}
          />
        ) : null,
      )}

      {layout.lines.map((line, index) => (
        <path
          key={line.id}
          ref={(node) => {
            pathRefs.current[index] = node;
          }}
          d={line.linePath}
          fill="none"
          strokeWidth={STROKE.line}
          vectorEffect="non-scaling-stroke"
          className={cn(
            line.strokeClassName,
            "animate-chart-line transition-opacity duration-300",
            hasHover ? "opacity-45" : "opacity-100",
          )}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ "--path-length": pathLengths[index] ?? DEFAULT_PATH_LENGTH } as React.CSSProperties}
        />
      ))}

      {hasHover && activePoint ? (
        <>
          <line
            x1={activePoint.x}
            x2={activePoint.x}
            y1={layout.padding.top}
            y2={layout.padding.top + layout.plotHeight}
            strokeWidth={STROKE.guide}
            vectorEffect="non-scaling-stroke"
            className="stroke-emerald-500/50"
            strokeDasharray="3 3"
          />
          {layout.lines.map((line) => {
            const point = line.points[activeIndex!];
            return (
              <circle
                key={`${line.id}-dot`}
                cx={point.x}
                cy={point.y}
                r={STROKE.dot}
                className={cn("fill-white stroke-[2] dark:fill-zinc-950", line.strokeClassName)}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
        </>
      ) : null}

      <rect
        x={layout.padding.left}
        y={layout.padding.top}
        width={layout.plotWidth}
        height={layout.plotHeight}
        fill="transparent"
        className="cursor-crosshair"
        onMouseMove={handlePlotHover}
      />

      {layout.lines[0].points.map(({ x, label, index }) => {
        const isActive = activeIndex === index;
        const isDimmed = hasHover && !isActive;
        const isLastPoint = index === layout.categories.length - 1;
        if (!isActive && !isLastPoint && index % layout.labelStep !== 0) return null;

        return (
          <text
            key={`${label}-${index}`}
            x={x}
            y={layout.height - 8}
            textAnchor="middle"
            pointerEvents="none"
            className={cn(
              "fill-zinc-400 text-[8px] transition-all duration-200",
              isActive && "fill-emerald-600 font-medium dark:fill-emerald-400",
              isDimmed && "opacity-35",
            )}
          >
            {label}
          </text>
        );
      })}
    </ChartSvgRoot>

      {resolvedSeries.length > 1 ? (
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-0.5">
          {resolvedSeries.map((item) => (
            <div key={item.id} className="flex items-center gap-1.5 text-xs text-zinc-500">
              <svg
                width="14"
                height="3"
                viewBox="0 0 14 3"
                className="shrink-0 overflow-visible"
              >
                <path
                  d="M 0 1.5 L 14 1.5"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  className={item.strokeClassName}
                />
              </svg>
              {item.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Chart({
  variant,
  data,
  series,
  className,
  formatValue,
  animateKey,
  max,
  showGrid,
  showArea,
  size,
  strokeClassName,
  stacked,
  fullWidth,
}: ChartProps) {
  switch (variant) {
    case "line":
      return (
        <LineChartView
          data={data}
          series={series}
          className={className}
          formatValue={formatValue}
          showGrid={showGrid}
          showArea={showArea}
          animateKey={animateKey}
          strokeClassName={strokeClassName}
          fullWidth={fullWidth}
        />
      );
    case "sparkline":
      return (
        <SparklineView
          data={data}
          series={series}
          className={className}
          formatValue={formatValue}
          animateKey={animateKey}
          strokeClassName={strokeClassName}
        />
      );
    case "bar":
      return (
        <BarChartView
          data={data}
          max={max}
          className={className}
          formatValue={formatValue}
          stacked={stacked}
          animateKey={animateKey}
        />
      );
    case "column":
      return (
        <ColumnChartView
          data={data}
          max={max}
          className={className}
          formatValue={formatValue}
          stacked={stacked}
          animateKey={animateKey}
        />
      );
    case "donut":
      return (
        <DonutChartView
          segments={data}
          size={size}
          className={className}
          formatValue={formatValue}
          animateKey={animateKey}
        />
      );
    default:
      return null;
  }
}

export function BarChart(props: Omit<ChartProps, "variant"> & { data: ChartPoint[] }) {
  return <Chart variant="bar" {...props} />;
}

export function ColumnChart(props: Omit<ChartProps, "variant"> & { data: ChartPoint[] }) {
  return <Chart variant="column" {...props} />;
}

export function Sparkline({
  data,
  series,
  points,
  labels,
  className,
  strokeClassName,
  formatValue,
  animateKey,
}: {
  data?: ChartPoint[];
  series?: ChartSeries[];
  points?: number[];
  labels?: string[];
  className?: string;
  strokeClassName?: string;
  formatValue?: (value: number, label?: string) => string;
  animateKey?: string | number;
}) {
  const resolved = useMemo(
    () =>
      data ??
      points?.map((value, index) => ({
        label: labels?.[index] ?? `Ponto ${index + 1}`,
        value,
      })) ??
      [],
    [data, points, labels],
  );

  return (
    <Chart
      variant="sparkline"
      data={resolved}
      series={series}
      className={className}
      strokeClassName={strokeClassName}
      formatValue={formatValue}
      animateKey={animateKey}
    />
  );
}

export function DonutChart({
  segments,
  size,
  className,
  formatValue,
  animateKey,
}: {
  segments: ChartPoint[];
  size?: number;
  className?: string;
  formatValue?: (value: number, label?: string) => string;
  animateKey?: string | number;
}) {
  return (
    <Chart
      variant="donut"
      data={segments}
      size={size}
      className={className}
      formatValue={formatValue}
      animateKey={animateKey}
    />
  );
}

export function LineChart(
  props: Omit<ChartProps, "variant"> & { data: ChartPoint[]; series?: ChartSeries[] },
) {
  return <Chart variant="line" {...props} />;
}

type DataListItem = {
  id: string;
  label: string;
  value: ReactNode;
  hint?: string;
};

type DataListProps = {
  items: DataListItem[];
  className?: string;
};

export function DataList({ items, className }: DataListProps) {
  return (
    <div className={cn("divide-y divide-zinc-100 dark:divide-zinc-800", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{item.label}</p>
            {item.hint ? (
              <p className="mt-0.5 text-xs text-zinc-500">{item.hint}</p>
            ) : null}
          </div>
          <div className="shrink-0 text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

type TrendProps = {
  value: number;
  label?: string;
  className?: string;
};

export function Trend({ value, label, className }: TrendProps) {
  const positive = value >= 0;

  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", className)}>
      <span
        className={cn(
          "font-medium tabular-nums",
          positive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400",
        )}
      >
        {positive ? "+" : ""}
        {value}%
      </span>
      {label ? <span className="text-zinc-500">{label}</span> : null}
    </span>
  );
}

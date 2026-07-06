"use client";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipAnchor, getTooltipAlign } from "@/components/ui/tooltip";
import { InputHTMLAttributes, useState } from "react";

const THUMB_SIZE = 14;

type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  showValue?: boolean;
  showHint?: boolean;
  formatValue?: (value: number) => string;
};

function getThumbRatio(value: number, min: number, max: number) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function getThumbLeft(ratio: number) {
  return `calc((100% - ${THUMB_SIZE}px) * ${ratio} + ${THUMB_SIZE / 2}px)`;
}

export function Slider({
  className,
  label,
  showValue = true,
  showHint = true,
  formatValue = (value) => String(value),
  value,
  defaultValue,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onPointerDown,
  onPointerUp,
  onBlur,
  ...props
}: SliderProps) {
  const [dragging, setDragging] = useState(false);
  const [internalValue, setInternalValue] = useState<number>(
    Number(value ?? defaultValue ?? min),
  );

  const numericMin = Number(min);
  const numericMax = Number(max);
  const currentValue =
    value !== undefined && value !== null ? Number(value) : internalValue;
  const ratio = getThumbRatio(currentValue, numericMin, numericMax);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInternalValue(Number(event.target.value));
    onChange?.(event);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between gap-2 text-sm">
          {label ? (
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {label}
            </span>
          ) : (
            <span />
          )}
          {showValue && !dragging ? (
            <span className="text-xs tabular-nums text-zinc-500">
              {formatValue(currentValue)}
            </span>
          ) : null}
        </div>
      )}

      <div className="relative">
        {showHint && dragging ? (
          <TooltipAnchor
            align={getTooltipAlign(ratio)}
            placement="above"
            gap={8}
            style={{ left: getThumbLeft(ratio) }}
          >
            <Tooltip>{formatValue(currentValue)}</Tooltip>
          </TooltipAnchor>
        ) : null}

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          onPointerDown={(event) => {
            setDragging(true);
            onPointerDown?.(event);
          }}
          onPointerUp={(event) => {
            setDragging(false);
            onPointerUp?.(event);
          }}
          onBlur={(event) => {
            setDragging(false);
            onBlur?.(event);
          }}
          className={cn(
            "relative z-[1] block h-1.5 w-full cursor-pointer appearance-none rounded-full bg-zinc-100 dark:bg-zinc-800",
            "focus:outline-none focus-visible:outline-none",
            "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-emerald-600",
            "[&::-webkit-slider-thumb]:shadow-none",
            "[&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:border-0 [&::-moz-range-track]:bg-zinc-100 dark:[&::-moz-range-track]:bg-zinc-800",
            "[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-emerald-600",
          )}
          {...props}
        />
      </div>
    </div>
  );
}

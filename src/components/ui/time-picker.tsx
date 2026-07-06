"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  formatTimeDisplay,
  formatTimeISO,
  pad2,
  parseTime,
} from "@/lib/date-time";
import {
  PickerPopup,
  PickerTrigger,
  SegmentBox,
  SegmentSeparator,
} from "@/components/ui/picker-primitives";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";

type TimeWheelProps = {
  max: number;
  value: number;
  onChange: (value: number) => void;
};

function TimeWheel({ max, value, onChange }: TimeWheelProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const syncingRef = useRef(false);
  const itemHeight = 32;
  const wheelHeight = 128;
  const paddingY = (wheelHeight - itemHeight) / 2;

  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }

    if (innerRef.current) {
      innerRef.current.scrollTop = value * itemHeight;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    };
  }, []);

  function setIndex(index: number, smooth = false) {
    const next = Math.max(0, Math.min(max, index));

    innerRef.current?.scrollTo({
      top: next * itemHeight,
      behavior: smooth ? "smooth" : "auto",
    });

    if (next !== value) {
      syncingRef.current = true;
      onChange(next);
    }
  }

  function snapFromScroll() {
    if (!innerRef.current) return;
    const index = Math.round(innerRef.current.scrollTop / itemHeight);
    setIndex(index);
  }

  function handleScroll() {
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(snapFromScroll, 80);
  }

  return (
    <div
      className={cn(
        "relative h-32 flex-1 overflow-hidden bg-zinc-50 dark:bg-zinc-900/50",
        ui.innerRadius,
      )}
    >
      <div
        ref={innerRef}
        onScroll={handleScroll}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-y-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ paddingTop: paddingY, paddingBottom: paddingY }}>
          {Array.from({ length: max + 1 }, (_, index) => {
            const selected = index === value;

            return (
              <button
                key={index}
                type="button"
                onClick={() => setIndex(index, true)}
                className={cn(
                  "flex h-8 w-full shrink-0 cursor-pointer snap-center snap-always items-center justify-center font-mono text-sm transition-colors",
                  selected
                    ? "font-semibold text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400",
                )}
              >
                {pad2(index)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type TimePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  withSeconds?: boolean;
  clearable?: boolean;
  embedded?: boolean;
  className?: string;
};

export function TimePicker({
  value,
  onChange,
  label,
  withSeconds = false,
  clearable = true,
  embedded = false,
  className,
}: TimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseTime(value, withSeconds);
  const [hour, setHour] = useState(selected?.getHours() ?? 0);
  const [minute, setMinute] = useState(selected?.getMinutes() ?? 0);
  const [second, setSecond] = useState(selected?.getSeconds() ?? 0);

  useEffect(() => {
    if (selected) {
      setHour(selected.getHours());
      setMinute(selected.getMinutes());
      setSecond(selected.getSeconds());
    }
  }, [value, withSeconds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const segments = formatTimeDisplay(selected, withSeconds);

  function applyTime(nextHour = hour, nextMinute = minute, nextSecond = second) {
    const date = new Date(1970, 0, 1, nextHour, nextMinute, nextSecond);
    onChange?.(formatTimeISO(date, withSeconds));
  }

  const wheels = (
    <div className="flex items-center gap-1.5">
      <TimeWheel
        max={23}
        value={hour}
        onChange={(next) => {
          setHour(next);
          applyTime(next, minute, second);
        }}
      />
      <span className="text-sm font-medium text-zinc-300">:</span>
      <TimeWheel
        max={59}
        value={minute}
        onChange={(next) => {
          setMinute(next);
          applyTime(hour, next, second);
        }}
      />
      {withSeconds ? (
        <>
          <span className="text-sm font-medium text-zinc-300">:</span>
          <TimeWheel
            max={59}
            value={second}
            onChange={(next) => {
              setSecond(next);
              applyTime(hour, minute, next);
            }}
          />
        </>
      ) : null}
    </div>
  );

  if (embedded) {
    return <div className={className}>{wheels}</div>;
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label ? <Label>{label}</Label> : null}

      <PickerTrigger
        open={open}
        hasValue={!!selected}
        clearable={clearable}
        onClick={() => setOpen((current) => !current)}
        onClear={() => onChange?.("")}
      >
        <SegmentBox value={segments.hour} placeholder="HH" active={open} />
        <SegmentSeparator>:</SegmentSeparator>
        <SegmentBox value={segments.minute} placeholder="MM" active={open} />
        {withSeconds ? (
          <>
            <SegmentSeparator>:</SegmentSeparator>
            <SegmentBox
              value={segments.second ?? "SS"}
              placeholder="SS"
              active={open}
            />
          </>
        ) : null}
      </PickerTrigger>

      <PickerPopup open={open} className="w-full min-w-[16rem]">
        {wheels}
      </PickerPopup>
    </div>
  );
}

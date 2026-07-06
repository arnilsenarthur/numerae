"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  DAYS_PT,
  MONTHS_PT,
  clampDate,
  formatDateDisplay,
  formatDateISO,
  isSameDay,
  parseDate,
} from "@/lib/date-time";
import {
  PickerPopup,
  PickerTrigger,
  SegmentBox,
  SegmentSeparator,
} from "@/components/ui/picker-primitives";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useRef, useState } from "react";

type DatePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
  embedded?: boolean;
  className?: string;
};

export function DatePicker({
  value,
  onChange,
  label,
  min,
  max,
  clearable = true,
  embedded = false,
  className,
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");

  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  const [viewDate, setViewDate] = useState(() => selected ?? new Date());

  useEffect(() => {
    if (selected) setViewDate(selected);
  }, [value]);

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

  const segments = formatDateDisplay(selected);

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const today = new Date();
    const minTime = minDate
      ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()).getTime()
      : null;
    const maxTime = maxDate
      ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()).getTime()
      : null;
    const cells: Array<{
      day: number;
      date: Date | null;
      muted: boolean;
      disabled: boolean;
      today: boolean;
      selected: boolean;
    }> = [];

    for (let i = firstDay - 1; i >= 0; i -= 1) {
      cells.push({
        day: prevMonthDays - i,
        date: null,
        muted: true,
        disabled: true,
        today: false,
        selected: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const time = date.getTime();
      const disabled =
        (minTime !== null && time < minTime) ||
        (maxTime !== null && time > maxTime);

      cells.push({
        day,
        date,
        muted: false,
        disabled,
        today: isSameDay(date, today),
        selected: selected ? isSameDay(date, selected) : false,
      });
    }

    let nextDay = 1;
    while (cells.length < 42) {
      cells.push({
        day: nextDay,
        date: null,
        muted: true,
        disabled: true,
        today: false,
        selected: false,
      });
      nextDay += 1;
    }

    return cells;
  }, [viewDate, selected, minDate, maxDate]);

  const years = useMemo(() => {
    const start = Math.floor(viewDate.getFullYear() / 12) * 12;
    return Array.from({ length: 12 }, (_, index) => start + index);
  }, [viewDate]);

  function selectDate(date: Date) {
    const next = clampDate(date, minDate, maxDate);
    onChange?.(formatDateISO(next));
    if (!embedded) setOpen(false);
  }

  const calendar = (
    <>
      <div className="mb-2.5 flex items-center justify-between gap-1">
        <button
          type="button"
          className={cn(
            "cursor-pointer px-2 py-1 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
            ui.innerRadius,
          )}
          onClick={() =>
            setViewDate(
              new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1),
            )
          }
        >
          ‹
        </button>

        <button
          type="button"
          className={cn(
            "flex-1 cursor-pointer px-2 py-1 text-sm font-medium transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
            ui.innerRadius,
          )}
          onClick={() =>
            setViewMode((current) => (current === "month" ? "year" : "month"))
          }
        >
          {viewMode === "month"
            ? `${MONTHS_PT[viewDate.getMonth()]} ${viewDate.getFullYear()}`
            : `${years[0]} – ${years[years.length - 1]}`}
        </button>

        <button
          type="button"
          className={cn(
            "cursor-pointer px-2 py-1 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
            ui.innerRadius,
          )}
          onClick={() =>
            setViewDate(
              new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
            )
          }
        >
          ›
        </button>
      </div>

      {viewMode === "month" ? (
        <>
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAYS_PT.map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[0.7rem] font-semibold uppercase tracking-wide text-zinc-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((cell, index) => (
              <button
                key={`${cell.day}-${index}`}
                type="button"
                disabled={cell.disabled || !cell.date}
                onClick={() => cell.date && selectDate(cell.date)}
                className={cn(
                  "flex h-8 cursor-pointer items-center justify-center text-xs transition-colors sm:text-sm",
                  ui.innerRadius,
                  cell.muted && "pointer-events-none opacity-30",
                  cell.today && !cell.selected && "ring-1 ring-zinc-300 dark:ring-zinc-600",
                  cell.selected && ui.itemSelected,
                  !cell.selected &&
                    !cell.disabled &&
                    ui.itemHover,
                  cell.disabled && "cursor-not-allowed opacity-30",
                )}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {years.map((year) => {
            const isSelected = year === viewDate.getFullYear();
            return (
              <button
                key={year}
                type="button"
                onClick={() => {
                  setViewDate(new Date(year, viewDate.getMonth(), 1));
                  setViewMode("month");
                }}
                className={cn(
                  "cursor-pointer py-2 text-xs font-medium transition-colors sm:text-sm",
                  ui.innerRadius,
                  isSelected ? ui.itemSelected : ui.itemHover,
                )}
              >
                {year}
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className={className}>{calendar}</div>;
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
        <SegmentBox value={segments.day} placeholder="DD" active={open} />
        <SegmentSeparator>/</SegmentSeparator>
        <SegmentBox value={segments.month} placeholder="MM" active={open} />
        <SegmentSeparator>/</SegmentSeparator>
        <SegmentBox
          value={segments.year}
          placeholder="AAAA"
          active={open}
          className="min-w-[4rem]"
        />
      </PickerTrigger>

      <PickerPopup open={open} className="w-full min-w-[20rem]">
        {calendar}
      </PickerPopup>
    </div>
  );
}

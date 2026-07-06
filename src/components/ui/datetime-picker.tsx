"use client";

import { cn } from "@/lib/utils";
import {
  formatDateDisplay,
  formatTimeDisplay,
  parseDateTime,
} from "@/lib/date-time";
import { DatePicker } from "@/components/ui/date-picker";
import {
  PickerPopup,
  PickerTrigger,
  SegmentBox,
  SegmentSeparator,
} from "@/components/ui/picker-primitives";
import { TimePicker } from "@/components/ui/time-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

type DateTimePickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  clearable?: boolean;
  className?: string;
};

export function DateTimePicker({
  value,
  onChange,
  label,
  clearable = true,
  className,
}: DateTimePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"date" | "time">("date");
  const selected = parseDateTime(value);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");

  useEffect(() => {
    if (selected) {
      setDraftDate(
        `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, "0")}-${String(selected.getDate()).padStart(2, "0")}`,
      );
      setDraftTime(
        `${String(selected.getHours()).padStart(2, "0")}:${String(selected.getMinutes()).padStart(2, "0")}:${String(selected.getSeconds()).padStart(2, "0")}`,
      );
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setStep("date");
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const dateSegments = formatDateDisplay(selected);
  const timeSegments = formatTimeDisplay(selected, true);

  function commitDraft(date: string, time: string) {
    if (!date || !time) return;
    onChange?.(`${date}T${time}`);
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
        <SegmentBox value={dateSegments.day} placeholder="DD" active={open} />
        <SegmentSeparator>/</SegmentSeparator>
        <SegmentBox value={dateSegments.month} placeholder="MM" active={open} />
        <SegmentSeparator>/</SegmentSeparator>
        <SegmentBox
          value={dateSegments.year}
          placeholder="AAAA"
          active={open}
          className="min-w-[4rem]"
        />
        <SegmentSeparator>·</SegmentSeparator>
        <SegmentBox value={timeSegments.hour} placeholder="HH" active={open} />
        <SegmentSeparator>:</SegmentSeparator>
        <SegmentBox value={timeSegments.minute} placeholder="MM" active={open} />
      </PickerTrigger>

      <PickerPopup open={open} className="w-full min-w-[20rem]">
        {step === "date" ? (
          <DatePicker
            embedded
            value={draftDate}
            onChange={(next) => {
              setDraftDate(next);
              if (draftTime) commitDraft(next, draftTime);
              setStep("time");
            }}
          />
        ) : (
          <div className="space-y-4">
            <TimePicker
              embedded
              value={draftTime}
              onChange={(next) => {
                setDraftTime(next);
                if (draftDate) commitDraft(draftDate, next);
              }}
              withSeconds
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setStep("date")}
              >
                Voltar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={!draftDate || !draftTime}
                onClick={() => {
                  if (draftDate && draftTime) {
                    commitDraft(draftDate, draftTime);
                    setOpen(false);
                    setStep("date");
                  }
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}
      </PickerPopup>
    </div>
  );
}

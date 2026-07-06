"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { Input } from "@/components/ui/input";
import { useId, useRef } from "react";

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function normalizeHex(value: string, fallback = "#10B981"): string {
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  let hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
    return hex.toUpperCase();
  }

  return fallback;
}

function pickerValue(value: string | undefined, fallback: string) {
  const normalized = normalizeHex(value ?? "", fallback);
  return HEX_PATTERN.test(normalized) ? normalized : fallback;
}

type ColorPickerProps = {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Table / inline: swatch only. */
  compact?: boolean;
  placeholder?: string;
  fallback?: string;
};

export function ColorPicker({
  value,
  onChange,
  label,
  disabled,
  className,
  compact = false,
  placeholder = "#10B981",
  fallback = "#10B981",
}: ColorPickerProps) {
  const id = useId();
  const nativeRef = useRef<HTMLInputElement>(null);
  const resolved = pickerValue(value, fallback);

  function openPicker() {
    if (disabled) return;
    nativeRef.current?.click();
  }

  const swatch = (
    <span className="relative inline-flex shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={cn(
          "block overflow-hidden ring-1 ring-zinc-200 transition-all dark:ring-zinc-700",
          compact ? "h-8 w-8 rounded-full" : cn("h-9 w-9", ui.controlRadius),
          ui.fieldBorder,
          ui.fieldTrigger,
          !disabled &&
            "hover:ring-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-400/15 dark:hover:ring-zinc-600",
          disabled && "opacity-60",
        )}
        style={{ backgroundColor: resolved }}
        aria-label={label ?? "Escolher cor"}
      />
      <input
        ref={nativeRef}
        type="color"
        value={resolved}
        disabled={disabled}
        tabIndex={-1}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        onChange={(event) => onChange?.(normalizeHex(event.target.value, fallback))}
      />
    </span>
  );

  if (compact) {
    return <div className={cn("inline-flex items-center", className)}>{swatch}</div>;
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label htmlFor={id} className={ui.label}>
          {label}
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        {swatch}
        <Input
          id={id}
          value={value ?? ""}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          className="font-mono uppercase"
          onChange={(event) => onChange?.(event.target.value)}
          onBlur={(event) => onChange?.(normalizeHex(event.target.value, fallback))}
        />
      </div>
    </div>
  );
}

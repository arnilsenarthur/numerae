"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export function Switch({ className, label, id, ...props }: SwitchProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <label
      htmlFor={inputId}
      className={cn("inline-flex cursor-pointer items-center gap-2.5", className)}
    >
      <span className="relative inline-flex h-5 w-9 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          role="switch"
          className="peer sr-only"
          {...props}
        />
        <span className="absolute inset-0 rounded-full bg-zinc-200 transition-colors peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/30 dark:bg-zinc-700" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      {label ? (
        <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      ) : null}
    </label>
  );
}

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Checkbox({ className, label, id, ...props }: CheckboxProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group/checkbox inline-flex cursor-pointer items-start gap-2.5 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-500/20",
        className,
      )}
    >
      <input id={inputId} type="checkbox" className="peer sr-only" {...props} />
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150",
          "border-zinc-300 bg-white text-white dark:border-zinc-600 dark:bg-zinc-950",
          "group-has-[:checked]/checkbox:border-emerald-600 group-has-[:checked]/checkbox:bg-emerald-600",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/30",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        )}
      >
        <span className="scale-0 transition-transform duration-150 group-has-[:checked]/checkbox:scale-100">
          <CheckIcon />
        </span>
      </span>
      {label ? (
        <span className="text-sm leading-5 text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
      ) : null}
    </label>
  );
}

type RadioProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Radio({ className, label, id, ...props }: RadioProps) {
  const inputId = id ?? `${props.name}-${props.value}`;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        "group/radio inline-flex cursor-pointer items-start gap-2.5 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-emerald-500/20",
        className,
      )}
    >
      <input id={inputId} type="radio" className="peer sr-only" {...props} />
      <span
        className={cn(
          "relative mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
          "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950",
          "group-has-[:checked]/radio:border-emerald-600",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500/30",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        )}
      >
        <span className="h-2 w-2 scale-0 rounded-full bg-emerald-600 transition-transform duration-150 group-has-[:checked]/radio:scale-100" />
      </span>
      {label ? (
        <span className="text-sm leading-5 text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
      ) : null}
    </label>
  );
}

type RadioGroupProps = {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  orientation?: "vertical" | "horizontal";
  className?: string;
};

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  orientation = "vertical",
  className,
}: RadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn(
        orientation === "horizontal"
          ? "flex flex-wrap gap-x-4 gap-y-2"
          : "flex flex-col gap-2.5",
        className,
      )}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          label={option.label}
          disabled={option.disabled}
          checked={value === option.value}
          onChange={() => onChange?.(option.value)}
        />
      ))}
    </div>
  );
}

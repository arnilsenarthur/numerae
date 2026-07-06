"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  KeyboardEvent,
  ClipboardEvent,
  useRef,
  useEffect,
  InputHTMLAttributes,
} from "react";

type OtpInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & {
  length?: number;
  value: string;
  onChange: (value: string) => void;
};

export function OtpInput({
  length = 6,
  value,
  onChange,
  className,
  disabled,
  ...props
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  useEffect(() => {
    if (value.length === 0) {
      inputsRef.current[0]?.focus();
    }
  }, [value.length]);

  function updateDigit(index: number, digit: string) {
    const next = digits.map((char, i) => (i === index ? digit : char));
    onChange(next.join("").replace(/\s/g, "").slice(0, length));
  }

  function handleChange(index: number, nextValue: string) {
    const digit = nextValue.replace(/\D/g, "").slice(-1);
    updateDigit(index, digit);

    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (digits[index]?.trim()) {
        updateDigit(index, "");
        return;
      }

      if (index > 0) {
        updateDigit(index - 1, "");
        inputsRef.current[index - 1]?.focus();
      }
    }

    if (event.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, length);
    onChange(pasted);

    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div className={cn("flex justify-center gap-1.5 sm:gap-2", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit.trim()}
          disabled={disabled}
          aria-label={`Dígito ${index + 1} de ${length}`}
          className={cn(
            "h-10 w-9 rounded-lg border border-zinc-200 bg-white text-center text-base font-semibold text-zinc-900 transition-all duration-200 sm:h-9 sm:w-10",
            ui.fieldFocus,
            "dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100",
            digit.trim() && "border-zinc-400 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900",
            disabled && "opacity-60",
          )}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          onFocus={(event) => event.target.select()}
          {...props}
        />
      ))}
    </div>
  );
}

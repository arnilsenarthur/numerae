import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { InputHTMLAttributes, forwardRef } from "react";

const baseInputClass = cn(
  "flex w-full transition-all duration-200 placeholder:text-zinc-400",
  ui.controlHeight,
  ui.controlPadding,
  ui.controlText,
  ui.controlRadius,
  ui.fieldBorder,
  ui.fieldFocus,
  "text-zinc-900 dark:text-zinc-100",
);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => (
  <input ref={ref} type={type} className={cn(baseInputClass, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(baseInputClass, "min-h-24 resize-y py-2 px-2", className)}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const DateInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="date"
    className={cn(baseInputClass, "[color-scheme:light] dark:[color-scheme:dark]", className)}
    {...props}
  />
));
DateInput.displayName = "DateInput";

export const DateTimeInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="datetime-local"
    className={cn(baseInputClass, "[color-scheme:light] dark:[color-scheme:dark]", className)}
    {...props}
  />
));
DateTimeInput.displayName = "DateTimeInput";

export const TimeInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="time"
    className={cn(baseInputClass, "[color-scheme:light] dark:[color-scheme:dark]", className)}
    {...props}
  />
));
TimeInput.displayName = "TimeInput";

export const NumberInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} type="number" className={cn(baseInputClass, className)} {...props} />
));
NumberInput.displayName = "NumberInput";

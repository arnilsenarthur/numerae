"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input, NumberInput, Textarea } from "@/components/ui/input";
import { IconAlertCircle, IconCheck } from "@/components/ui/icons";
import {
  type FieldState,
  FieldValidationOptions,
  ValidationResult,
  ValidationRule,
  ValidateMode,
  runValidation,
} from "@/components/ui/field-validation";
import {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  useMemo,
  useState,
} from "react";

export type { FieldState };

const messageStyles: Record<Exclude<FieldState, "default">, string> = {
  error: "text-red-600 dark:text-red-400",
  success: "text-emerald-600 dark:text-emerald-400",
  warning: "text-amber-600 dark:text-amber-400",
};

const labelStyles: Record<Exclude<FieldState, "default">, string> = {
  error: "text-red-700 dark:text-red-300",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
};

export function getFieldControlClass(state: FieldState = "default") {
  switch (state) {
    case "error":
      return cn(
        "border-red-400 bg-red-50/50 text-red-950 placeholder:text-red-400/70",
        "focus-visible:border-red-500 focus-visible:ring-2 focus-visible:ring-red-400/25",
        "dark:border-red-600 dark:bg-red-950/30 dark:text-red-50 dark:placeholder:text-red-400/50",
        "dark:focus-visible:border-red-500 dark:focus-visible:ring-red-500/20",
        "animate-field-shake",
      );
    case "success":
      return cn(
        "border-emerald-400 bg-emerald-50/40 text-emerald-950",
        "focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-400/20",
        "dark:border-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-50",
        "dark:focus-visible:border-emerald-500 dark:focus-visible:ring-emerald-500/20",
      );
    case "warning":
      return cn(
        "border-amber-400 bg-amber-50/40 text-amber-950",
        "focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-400/20",
        "dark:border-amber-600 dark:bg-amber-950/25 dark:text-amber-50",
        "dark:focus-visible:border-amber-500 dark:focus-visible:ring-amber-500/20",
      );
    default:
      return "";
  }
}

type FieldProps = {
  label?: string;
  htmlFor?: string;
  hint?: string;
  message?: string;
  state?: FieldState;
  required?: boolean;
  counter?: string;
  controlSize?: "input" | "textarea";
  children: ReactNode;
  className?: string;
};

export function Field({
  label,
  htmlFor,
  hint,
  message,
  state = "default",
  required,
  counter,
  controlSize = "input",
  children,
  className,
}: FieldProps) {
  const feedback = message ?? hint;
  const showFeedback = Boolean(feedback || counter);
  const iconClass =
    controlSize === "textarea"
      ? "pointer-events-none absolute right-2.5 top-3"
      : "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2";

  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between gap-2">
          <Label
            htmlFor={htmlFor}
            className={cn(state !== "default" && labelStyles[state])}
          >
            {label}
            {required ? (
              <span className="ml-0.5 text-red-500" aria-hidden>
                *
              </span>
            ) : null}
          </Label>
          {counter ? (
            <span
              className={cn(
                "text-[0.65rem] tabular-nums",
                state === "error"
                  ? messageStyles.error
                  : state === "warning"
                    ? messageStyles.warning
                    : "text-zinc-400",
              )}
            >
              {counter}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="relative">
        {children}
        {message && state === "error" ? (
          <IconAlertCircle size="sm" className={cn(iconClass, "text-red-500")} />
        ) : null}
        {message && state === "success" ? (
          <IconCheck size="sm" className={cn(iconClass, "text-emerald-500")} />
        ) : null}
      </div>
      {showFeedback ? (
        <p
          className={cn(
            "flex items-start gap-1.5 text-xs leading-snug",
            message && state !== "default" ? messageStyles[state] : "text-zinc-500",
          )}
          role={message && state === "error" ? "alert" : undefined}
          aria-live={message && state !== "default" ? "polite" : undefined}
        >
          {message && state === "error" ? (
            <IconAlertCircle size="xs" className="mt-0.5 shrink-0" />
          ) : null}
          {message && state === "success" ? (
            <IconCheck size="xs" className="mt-0.5 shrink-0" />
          ) : null}
          {feedback ? <span>{feedback}</span> : null}
        </p>
      ) : null}
    </div>
  );
}

export function fieldControlProps(state: FieldState = "default", className?: string) {
  return {
    className: cn(getFieldControlClass(state), className),
    "aria-invalid": state === "error" ? true : undefined,
  } as const;
}

export type UseValidatedFieldOptions = FieldValidationOptions & {
  initialValue?: string;
  validateMode?: ValidateMode | ValidateMode[];
};

export function useValidatedField(
  rules: ValidationRule[],
  options?: UseValidatedFieldOptions,
) {
  const {
    initialValue = "",
    validateMode = "change",
    required,
    requiredMessage,
    allowEmpty,
    showSuccess,
    successMessage,
  } = options ?? {};

  const [value, setValue] = useState(initialValue);
  const [touched, setTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validation = useMemo(
    () =>
      runValidation(value, rules, {
        required,
        requiredMessage,
        allowEmpty,
        showSuccess,
        successMessage,
      }),
    [value, rules, required, requiredMessage, allowEmpty, showSuccess, successMessage],
  );

  const modes = Array.isArray(validateMode) ? validateMode : [validateMode];
  const showFeedback =
    submitted || touched || (modes.includes("change") && value.length > 0);

  const display: ValidationResult = showFeedback
    ? validation
    : { state: "default", isValid: !required, isEmpty: !value.trim() };

  return {
    value,
    setValue,
    touched,
    submitted,
    validation: display,
    isValid: validation.isValid,
    markTouched: () => setTouched(true),
    markSubmitted: () => setSubmitted(true),
    reset: () => {
      setValue(initialValue);
      setTouched(false);
      setSubmitted(false);
    },
    bind: {
      value,
      onChange: (next: string) => setValue(next),
      onBlur: () => setTouched(true),
    },
    fieldProps: fieldControlProps(display.state, "pr-8"),
  };
}

type ValidatedFieldProps = {
  id?: string;
  label: string;
  rules: ValidationRule[];
  options?: UseValidatedFieldOptions;
  placeholder?: string;
  required?: boolean;
  control?: "input" | "textarea" | "number";
  rows?: number;
  className?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
};

export function ValidatedField({
  id,
  label,
  rules,
  options,
  placeholder,
  required,
  control = "input",
  rows = 3,
  className,
  inputProps,
  textareaProps,
}: ValidatedFieldProps) {
  const field = useValidatedField(rules, options);
  const fieldId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <Field
      label={label}
      htmlFor={fieldId}
      message={field.validation.message}
      state={field.validation.state}
      required={required ?? options?.required}
      controlSize={control === "textarea" ? "textarea" : "input"}
      className={className}
    >
      {control === "textarea" ? (
        <Textarea
          id={fieldId}
          rows={rows}
          placeholder={placeholder}
          value={field.value}
          onChange={(event) => field.setValue(event.target.value)}
          onBlur={field.bind.onBlur}
          {...field.fieldProps}
          {...textareaProps}
        />
      ) : control === "number" ? (
        <NumberInput
          id={fieldId}
          placeholder={placeholder}
          value={field.value}
          onChange={(event) => field.setValue(event.target.value)}
          onBlur={field.bind.onBlur}
          {...field.fieldProps}
          {...inputProps}
        />
      ) : (
        <Input
          id={fieldId}
          placeholder={placeholder}
          value={field.value}
          onChange={(event) => field.setValue(event.target.value)}
          onBlur={field.bind.onBlur}
          {...field.fieldProps}
          {...inputProps}
        />
      )}
    </Field>
  );
}

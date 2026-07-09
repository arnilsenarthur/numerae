"use client";

import { useMemo } from "react";
import { useT } from "@/i18n/locale-provider";
import { validationRules } from "@/components/ui/field-validation";

/** Locale-aware validation rule factories. */
export function useValidationRules() {
  const t = useT();

  return useMemo(
    () => ({
      required: (message?: string) =>
        validationRules.required(message ?? t("ui.validation.required")),
      email: (message?: string) =>
        validationRules.email(message ?? t("ui.validation.email")),
      minLength: (min: number, message?: string) =>
        validationRules.minLength(min, message ?? t("ui.validation.minLength", { min })),
      maxLength: (max: number, message?: string) =>
        validationRules.maxLength(max, message ?? t("ui.validation.maxLength", { max })),
      pattern: validationRules.pattern,
      currency: (message?: string) =>
        validationRules.currency(message ?? t("ui.validation.currency")),
      positiveAmount: (message?: string) =>
        validationRules.positiveAmount(message ?? t("ui.validation.positiveAmount")),
    }),
    [t],
  );
}

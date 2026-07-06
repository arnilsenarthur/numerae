export type FieldState = "default" | "error" | "success" | "warning";

export type ValidationSeverity = "error" | "warning";

export type ValidationRule = {
  id: string;
  test: RegExp | ((value: string) => boolean);
  message: string;
  severity?: ValidationSeverity;
};

export type FieldValidationOptions = {
  required?: boolean;
  requiredMessage?: string;
  allowEmpty?: boolean;
  showSuccess?: boolean;
  successMessage?: string;
};

export type ValidationResult = {
  state: FieldState;
  message?: string;
  isValid: boolean;
  isEmpty: boolean;
};

export type ValidateMode = "change" | "blur" | "submit";

export type LengthFeedback = {
  state: FieldState;
  message?: string;
  counter: string;
  isValid: boolean;
};

export const validationRules = {
  required(message = "Campo obrigatório.") {
    return {
      id: "required",
      test: (value: string) => value.trim().length > 0,
      message,
    } satisfies ValidationRule;
  },
  email(message = "Use um e-mail válido (ex: voce@email.com).") {
    return {
      id: "email",
      test: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message,
    } satisfies ValidationRule;
  },
  minLength(min: number, message = `Mínimo de ${min} caracteres.`) {
    return {
      id: `minLength-${min}`,
      test: (value: string) => value.trim().length >= min,
      message,
    } satisfies ValidationRule;
  },
  maxLength(max: number, message = `Máximo de ${max} caracteres.`) {
    return {
      id: `maxLength-${max}`,
      test: (value: string) => value.length <= max,
      message,
    } satisfies ValidationRule;
  },
  pattern(pattern: RegExp, message: string) {
    return {
      id: `pattern-${pattern.source}`,
      test: pattern,
      message,
    } satisfies ValidationRule;
  },
  currency(message = "Use apenas números e vírgula (ex: 1.250,50).") {
    return {
      id: "currency",
      test: /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/,
      message,
    } satisfies ValidationRule;
  },
};

export function runValidation(
  value: string,
  rules: ValidationRule[],
  options?: FieldValidationOptions,
): ValidationResult {
  const trimmed = value.trim();
  const isEmpty = trimmed.length === 0;

  if (isEmpty) {
    if (options?.required) {
      return {
        state: "error",
        message: options.requiredMessage ?? "Campo obrigatório.",
        isValid: false,
        isEmpty: true,
      };
    }

    return {
      state: "default",
      isValid: options?.allowEmpty ?? false,
      isEmpty: true,
    };
  }

  let warning: ValidationResult | null = null;

  for (const rule of rules) {
    const passed =
      rule.test instanceof RegExp ? rule.test.test(value) : rule.test(value);

    if (passed) continue;

    if (rule.severity === "warning") {
      warning = {
        state: "warning",
        message: rule.message,
        isValid: true,
        isEmpty: false,
      };
      continue;
    }

    return {
      state: "error",
      message: rule.message,
      isValid: false,
      isEmpty: false,
    };
  }

  if (warning) return warning;

  if (options?.showSuccess === false) {
    return { state: "default", isValid: true, isEmpty: false };
  }

  return {
    state: "success",
    message: options?.successMessage ?? "Válido.",
    isValid: true,
    isEmpty: false,
  };
}

export function getLengthFeedback(
  value: string,
  max: number,
  options?: { warnAt?: number; warnMessage?: string; errorMessage?: string },
): LengthFeedback {
  const length = value.length;
  const counter = `${length}/${max}`;
  const warnAt = options?.warnAt ?? 0.85;

  if (length > max) {
    return {
      state: "error",
      message: options?.errorMessage ?? `Máximo de ${max} caracteres.`,
      counter,
      isValid: false,
    };
  }

  if (length >= max * warnAt && length > 0) {
    return {
      state: "warning",
      message: options?.warnMessage ?? "Quase no limite de caracteres.",
      counter,
      isValid: true,
    };
  }

  return { state: "default", counter, isValid: true };
}

export function mergeFieldFeedback(
  primary: ValidationResult,
  secondary?: Pick<LengthFeedback, "state" | "message" | "isValid"> | null,
): ValidationResult {
  if (!secondary) return primary;

  if (primary.state === "error") return primary;
  if (secondary.state === "error") {
    return {
      state: "error",
      message: secondary.message,
      isValid: false,
      isEmpty: primary.isEmpty,
    };
  }
  if (primary.state === "warning" || secondary.state === "warning") {
    return {
      state: "warning",
      message: primary.message ?? secondary.message,
      isValid: primary.isValid && secondary.isValid,
      isEmpty: primary.isEmpty,
    };
  }

  return primary;
}

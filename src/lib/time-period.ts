/** Canonical time-period codes (URL / internal). UI labels live in i18n (`period.*`). */

export type PeriodCode = "D" | "W" | "M" | "3M" | "Y" | "all";
export type FinancePeriod = "M" | "3M" | "Y" | "all";
export type FinanceReportPeriod = "M" | "3M" | "Y";
export type MarketPeriod = "D" | "W" | "M" | "3M" | "Y";

export const FINANCE_PERIOD_CODES = ["M", "3M", "Y", "all"] as const satisfies readonly FinancePeriod[];
export const FINANCE_REPORT_PERIOD_CODES = ["M", "3M", "Y"] as const satisfies readonly FinanceReportPeriod[];
export const MARKET_PERIOD_CODES = ["D", "W", "M", "3M", "Y"] as const satisfies readonly MarketPeriod[];

export const FINANCE_DEFAULT_PERIOD: FinancePeriod = "M";
export const FINANCE_REPORT_DEFAULT_PERIOD: FinanceReportPeriod = "M";
export const MARKET_DEFAULT_PERIOD: MarketPeriod = "3M";

const PERIOD_ALIASES: Record<string, PeriodCode> = {
  d: "D",
  "1d": "D",
  "1day": "D",
  day: "D",
  w: "W",
  "1w": "W",
  "1week": "W",
  week: "W",
  m: "M",
  "1m": "M",
  "1month": "M",
  month: "M",
  "3m": "3M",
  "3months": "3M",
  "3month": "3M",
  "3w": "3M",
  "3week": "3M",
  "3weeks": "3M",
  y: "Y",
  "1y": "Y",
  "1year": "Y",
  year: "Y",
  "1a": "Y",
  "1A": "Y",
  all: "all",
};

function parsePeriodCode(value: string | null | undefined): PeriodCode | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed === "3M") return "3M";
  const upperOne = trimmed.toUpperCase();
  if (upperOne === "D" || upperOne === "W" || upperOne === "M" || upperOne === "Y") {
    return upperOne as PeriodCode;
  }
  return PERIOD_ALIASES[trimmed.toLowerCase()] ?? null;
}

export function normalizeFinancePeriod(
  value: string | null | undefined,
  defaultValue: FinancePeriod = FINANCE_DEFAULT_PERIOD,
): FinancePeriod {
  const parsed = parsePeriodCode(value);
  if (parsed && (FINANCE_PERIOD_CODES as readonly string[]).includes(parsed)) {
    return parsed as FinancePeriod;
  }
  return defaultValue;
}

export function normalizeFinanceReportPeriod(
  value: string | null | undefined,
  defaultValue: FinanceReportPeriod = FINANCE_REPORT_DEFAULT_PERIOD,
): FinanceReportPeriod {
  const parsed = normalizeFinancePeriod(value, defaultValue);
  if (parsed === "all") return defaultValue;
  return parsed;
}

export function normalizeMarketPeriod(
  value: string | null | undefined,
  defaultValue: MarketPeriod = MARKET_DEFAULT_PERIOD,
): MarketPeriod {
  const parsed = parsePeriodCode(value);
  if (parsed && (MARKET_PERIOD_CODES as readonly string[]).includes(parsed)) {
    return parsed as MarketPeriod;
  }
  return defaultValue;
}

export function financePeriodRange(
  preset: FinancePeriod,
): { from: string | null; to: string | null } {
  const now = new Date();
  switch (preset) {
    case "M":
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString(),
        to: null,
      };
    case "3M":
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2, 1)).toISOString(),
        to: null,
      };
    case "Y":
      return {
        from: new Date(Date.UTC(now.getFullYear(), 0, 1)).toISOString(),
        to: null,
      };
    case "all":
      return { from: null, to: null };
  }
}

export function financeReportPeriodRange(
  preset: FinanceReportPeriod,
): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case "M":
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString(),
        to: now.toISOString(),
      };
    case "3M":
      return {
        from: new Date(Date.UTC(now.getFullYear(), now.getMonth() - 2, 1)).toISOString(),
        to: now.toISOString(),
      };
    case "Y":
      return {
        from: new Date(Date.UTC(now.getFullYear(), 0, 1)).toISOString(),
        to: now.toISOString(),
      };
  }
}

/** i18n key for a period code (`period.M`, `period.report.M`, …). */
export function periodLabelKey(
  code: PeriodCode,
  variant: "default" | "report" = "default",
): string {
  if (variant === "report" && code !== "all") {
    return `period.report.${code}`;
  }
  return `period.${code}`;
}

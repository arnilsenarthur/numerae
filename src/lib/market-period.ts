export type MarketHistoryPeriod = "1D" | "1W" | "1M" | "3M" | "1A";

export const MARKET_PERIOD_OPTIONS: Array<{ value: MarketHistoryPeriod; label: string }> = [
  { value: "1D", label: "1 dia" },
  { value: "1W", label: "1 sem" },
  { value: "1M", label: "1 mês" },
  { value: "3M", label: "3 meses" },
  { value: "1A", label: "1 ano" },
];

export const MARKET_PERIOD_LABEL: Record<MarketHistoryPeriod, string> = {
  "1D": "1 dia",
  "1W": "1 sem",
  "1M": "1 mês",
  "3M": "3 meses",
  "1A": "1 ano",
};

export function normalizeMarketPeriod(value: string | null | undefined): MarketHistoryPeriod {
  if (!value) return "3M";
  const normalized = value.trim().toUpperCase();
  if (
    normalized === "1D" ||
    normalized === "1W" ||
    normalized === "1M" ||
    normalized === "3M" ||
    normalized === "1A"
  ) {
    return normalized;
  }
  return "3M";
}

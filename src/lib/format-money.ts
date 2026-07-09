type FormatMoneyOptions = {
  currency?: string;
  locale?: string;
  showSign?: boolean;
};

const SMALL_VALUE_THRESHOLD = 0.01;
const SMALL_VALUE_FRACTION_DIGITS = 5;

export function formatMoney(
  value: number,
  { currency = "BRL", locale = "pt-BR", showSign = false }: FormatMoneyOptions = {},
) {
  const abs = Math.abs(value);
  const useSmallPrecision = abs > 0 && abs < SMALL_VALUE_THRESHOLD;

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    ...(useSmallPrecision
      ? {
          minimumFractionDigits: SMALL_VALUE_FRACTION_DIGITS,
          maximumFractionDigits: SMALL_VALUE_FRACTION_DIGITS,
        }
      : {}),
  }).format(abs);

  if (value < 0) return `-${formatted}`;
  if (showSign && value > 0) return `+${formatted}`;
  return formatted;
}

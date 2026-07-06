type FormatMoneyOptions = {
  currency?: string;
  locale?: string;
  showSign?: boolean;
};

export function formatMoney(
  value: number,
  { currency = "BRL", locale = "pt-BR", showSign = false }: FormatMoneyOptions = {},
) {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(Math.abs(value));

  if (value < 0) return `-${formatted}`;
  if (showSign && value > 0) return `+${formatted}`;
  return formatted;
}

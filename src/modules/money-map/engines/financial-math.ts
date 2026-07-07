/** Juros compostos sobre capital único. */
export function compoundLump(
  principal: number,
  annualRatePercent: number,
  months: number,
): number {
  if (months <= 0) return principal;
  if (annualRatePercent <= 0) return principal;
  const r = annualRatePercent / 100 / 12;
  return principal * (1 + r) ** months;
}

/** Juros simples sobre capital único. */
export function simpleInterestLump(
  principal: number,
  annualRatePercent: number,
  months: number,
): number {
  if (months <= 0) return principal;
  return principal * (1 + (annualRatePercent / 100) * (months / 12));
}

/** Valor futuro de aportes mensais iguais (anuidade). */
export function compoundAnnuity(
  monthlyDeposit: number,
  annualRatePercent: number,
  months: number,
): number {
  if (months <= 0) return 0;
  if (monthlyDeposit <= 0) return 0;
  if (annualRatePercent <= 0) return monthlyDeposit * months;

  const r = annualRatePercent / 100 / 12;
  return monthlyDeposit * ((1 + r) ** months - 1) / r;
}

/** Acumulador: aportes mensais com taxa opcional. */
export function accumulateDeposits(
  monthlyAmount: number,
  months: number,
  annualRatePercent = 0,
): number {
  if (annualRatePercent <= 0) return monthlyAmount * months;
  return compoundAnnuity(monthlyAmount, annualRatePercent, months);
}

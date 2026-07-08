import { compoundAnnuity, compoundLump } from "@/lib/financial-math";
import { RISK_PROFILES, type RiskProfile } from "@/types/market";

export type ProjectionPoint = { month: number; value: number };

export function projectPlan(input: {
  initialAmount: number;
  monthlyDeposit: number;
  horizonMonths: number;
  annualRatePercent: number;
}): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const step = Math.max(1, Math.round(input.horizonMonths / 24));

  for (let month = 0; month <= input.horizonMonths; month += step) {
    points.push({
      month,
      value:
        compoundLump(input.initialAmount, input.annualRatePercent, month) +
        compoundAnnuity(input.monthlyDeposit, input.annualRatePercent, month),
    });
  }

  const last = points.at(-1);
  if (last && last.month !== input.horizonMonths) {
    points.push({
      month: input.horizonMonths,
      value:
        compoundLump(input.initialAmount, input.annualRatePercent, input.horizonMonths) +
        compoundAnnuity(input.monthlyDeposit, input.annualRatePercent, input.horizonMonths),
    });
  }

  return points;
}

export function finalValue(input: {
  initialAmount: number;
  monthlyDeposit: number;
  horizonMonths: number;
  annualRatePercent: number;
}): number {
  return (
    compoundLump(input.initialAmount, input.annualRatePercent, input.horizonMonths) +
    compoundAnnuity(input.monthlyDeposit, input.annualRatePercent, input.horizonMonths)
  );
}

/** Meses até atingir a meta com o perfil dado; null se não atinge no limite. */
export function monthsToTarget(input: {
  initialAmount: number;
  monthlyDeposit: number;
  targetAmount: number;
  annualRatePercent: number;
  maxMonths?: number;
}): number | null {
  const limit = input.maxMonths ?? 600;
  for (let month = 1; month <= limit; month += 1) {
    const value =
      compoundLump(input.initialAmount, input.annualRatePercent, month) +
      compoundAnnuity(input.monthlyDeposit, input.annualRatePercent, month);
    if (value >= input.targetAmount) return month;
  }
  return null;
}

export type ProfileComparison = {
  profile: RiskProfile;
  label: string;
  description: string;
  annualRatePercent: number;
  finalValue: number;
  totalDeposited: number;
  earnings: number;
  monthsToTarget: number | null;
};

export function compareProfiles(input: {
  initialAmount: number;
  monthlyDeposit: number;
  horizonMonths: number;
  targetAmount?: number | null;
}): ProfileComparison[] {
  return RISK_PROFILES.map((profile) => {
    const value = finalValue({
      initialAmount: input.initialAmount,
      monthlyDeposit: input.monthlyDeposit,
      horizonMonths: input.horizonMonths,
      annualRatePercent: profile.annualRatePercent,
    });
    const totalDeposited = input.initialAmount + input.monthlyDeposit * input.horizonMonths;

    return {
      profile: profile.value,
      label: profile.label,
      description: profile.description,
      annualRatePercent: profile.annualRatePercent,
      finalValue: value,
      totalDeposited,
      earnings: value - totalDeposited,
      monthsToTarget: input.targetAmount
        ? monthsToTarget({
            initialAmount: input.initialAmount,
            monthlyDeposit: input.monthlyDeposit,
            targetAmount: input.targetAmount,
            annualRatePercent: profile.annualRatePercent,
          })
        : null,
    };
  });
}

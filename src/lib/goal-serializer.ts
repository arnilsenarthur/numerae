type Decimal = { toNumber(): number };

export type SerializedFinancialGoal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  category: string;
  notes: string | null;
  icon: string | null;
  achieved: boolean;
  progressPercent: number;
  daysRemaining: number | null;
  createdAt: string;
  updatedAt: string;
};

export const GOAL_CATEGORY_OPTIONS = [
  { value: "other", label: "Outros" },
  { value: "emergency", label: "Reserva de emergência" },
  { value: "travel", label: "Viagem" },
  { value: "home", label: "Casa / Imóvel" },
  { value: "car", label: "Veículo" },
  { value: "education", label: "Educação" },
  { value: "retirement", label: "Aposentadoria" },
  { value: "investment", label: "Investimento" },
  { value: "health", label: "Saúde" },
  { value: "business", label: "Negócio" },
];

export const GOAL_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  GOAL_CATEGORY_OPTIONS.map((o) => [o.value, o.label]),
);

type GoalRecord = {
  id: string;
  title: string;
  targetAmount: Decimal;
  currentAmount: Decimal;
  currency: string;
  deadline: Date | null;
  category: string;
  notes: string | null;
  icon: string | null;
  achieved: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeGoal(record: GoalRecord): SerializedFinancialGoal {
  const target = record.targetAmount.toNumber();
  const current = record.currentAmount.toNumber();
  const progressPercent = target > 0 ? Math.min(100, (current / target) * 100) : 0;

  let daysRemaining: number | null = null;
  if (record.deadline && !record.achieved) {
    const diff = record.deadline.getTime() - Date.now();
    daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  return {
    id: record.id,
    title: record.title,
    targetAmount: target,
    currentAmount: current,
    currency: record.currency,
    deadline: record.deadline?.toISOString() ?? null,
    category: record.category,
    notes: record.notes,
    icon: record.icon,
    achieved: record.achieved,
    progressPercent,
    daysRemaining,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

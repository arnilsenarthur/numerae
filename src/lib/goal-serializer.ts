export type SerializedFinancialGoal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: string | null;
  category: string;
  moneyMapId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type GoalRecord = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  deadline: Date | null;
  category: string;
  moneyMapId: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeGoal(record: GoalRecord): SerializedFinancialGoal {
  return {
    id: record.id,
    title: record.title,
    targetAmount: record.targetAmount,
    currentAmount: record.currentAmount,
    currency: record.currency,
    deadline: record.deadline?.toISOString() ?? null,
    category: record.category,
    moneyMapId: record.moneyMapId,
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export type FinancialAccountKind =
  | "CHECKING"
  | "SAVINGS"
  | "INVESTMENT"
  | "CREDIT_CARD"
  | "CASH"
  | "OTHER";

export type TransactionKind = "INCOME" | "EXPENSE" | "TRANSFER";

export type SerializedAccount = {
  id: string;
  institutionId: string | null;
  institutionName: string | null;
  institutionLogoUrl: string | null;
  name: string;
  kind: FinancialAccountKind;
  currencyCode: string;
  countryCode: string;
  initialBalance: number;
  balance: number;
  color: string | null;
  icon: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SerializedTransaction = {
  id: string;
  accountId: string;
  accountName?: string;
  kind: TransactionKind;
  amount: number;
  currencyCode: string;
  category: string;
  description: string;
  date: string;
  counterAccountId: string | null;
  counterAmount: number | null;
  planEntryId: string | null;
  recurringId: string | null;
  notes: string | null;
  createdAt: string;
};

export type RecurrenceType =
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "BIMONTHLY"
  | "QUARTERLY"
  | "YEARLY";

export type SerializedRecurring = {
  id: string;
  accountId: string;
  accountName?: string;
  kind: TransactionKind;
  amount: number;
  currencyCode: string;
  category: string;
  description: string;
  recurrence: RecurrenceType;
  dayOfPeriod: number;
  nextDueAt: string;
  endAt: string | null;
  active: boolean;
  counterAccountId: string | null;
  counterAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  DAILY: "Diário",
  WEEKLY: "Semanal",
  BIWEEKLY: "Quinzenal",
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
};

export const ACCOUNT_KIND_LABELS: Record<FinancialAccountKind, string> = {
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  INVESTMENT: "Investimento",
  CREDIT_CARD: "Cartão de crédito",
  CASH: "Dinheiro",
  OTHER: "Outra",
};

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  INCOME: "Entrada",
  EXPENSE: "Saída",
  TRANSFER: "Transferência",
};

export const TRANSACTION_CATEGORIES = [
  { value: "salary", label: "Salário", kind: "INCOME" },
  { value: "business", label: "Empresa / PJ", kind: "INCOME" },
  { value: "investment_income", label: "Rendimentos", kind: "INCOME" },
  { value: "gift", label: "Presente", kind: "INCOME" },
  { value: "other_income", label: "Outras entradas", kind: "INCOME" },
  { value: "housing", label: "Moradia", kind: "EXPENSE" },
  { value: "food", label: "Alimentação", kind: "EXPENSE" },
  { value: "transport", label: "Transporte", kind: "EXPENSE" },
  { value: "health", label: "Saúde", kind: "EXPENSE" },
  { value: "education", label: "Educação", kind: "EXPENSE" },
  { value: "leisure", label: "Lazer", kind: "EXPENSE" },
  { value: "shopping", label: "Compras", kind: "EXPENSE" },
  { value: "subscription", label: "Assinaturas", kind: "EXPENSE" },
  { value: "taxes", label: "Impostos", kind: "EXPENSE" },
  { value: "investment", label: "Investimento", kind: "EXPENSE" },
  { value: "other", label: "Outros", kind: "EXPENSE" },
] as const;

export type TransactionCategoryValue = (typeof TRANSACTION_CATEGORIES)[number]["value"];

export function categoryLabel(value: string): string {
  return TRANSACTION_CATEGORIES.find((item) => item.value === value)?.label ?? value;
}

export function categoriesForKind(kind: TransactionKind) {
  if (kind === "TRANSFER") return [];
  return TRANSACTION_CATEGORIES.filter((item) => item.kind === kind);
}

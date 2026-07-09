import type { TranslateFn } from "@/i18n/translate";
import { translateCategory } from "@/i18n/labels";

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
  institutionType: string | null;
  institutionBrandColor: string | null;
  name: string;
  kind: FinancialAccountKind;
  currencyCode: string;
  countryCode: string;
  initialBalance: number;
  balance: number;
  creditLimit: number | null;
  color: string | null;
  icon: string | null;
  archived: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export function resolveDefaultAccountId(accounts: SerializedAccount[]): string {
  return accounts.find((account) => account.isDefault)?.id ?? accounts[0]?.id ?? "";
}

export type SerializedTransaction = {
  id: string;
  accountId: string;
  accountName?: string;
  kind: TransactionKind;
  amount: number;
  currencyCode: string;
  category: string;
  description: string;
  icon: string | null;
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
  icon: string | null;
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

/** @deprecated Use translateRecurrence from i18n/labels */
export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  BIWEEKLY: "BIWEEKLY",
  MONTHLY: "MONTHLY",
  BIMONTHLY: "BIMONTHLY",
  QUARTERLY: "QUARTERLY",
  YEARLY: "YEARLY",
};

/** @deprecated Use translateAccountKind from i18n/labels */
export const ACCOUNT_KIND_LABELS: Record<FinancialAccountKind, string> = {
  CHECKING: "CHECKING",
  SAVINGS: "SAVINGS",
  INVESTMENT: "INVESTMENT",
  CREDIT_CARD: "CREDIT_CARD",
  CASH: "CASH",
  OTHER: "OTHER",
};

/** @deprecated Use translateTransactionKind from i18n/labels */
export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
  TRANSFER: "TRANSFER",
};

export const TRANSACTION_CATEGORIES = [
  { value: "salary", kind: "INCOME" },
  { value: "business", kind: "INCOME" },
  { value: "investment_income", kind: "INCOME" },
  { value: "gift", kind: "INCOME" },
  { value: "other_income", kind: "INCOME" },
  { value: "housing", kind: "EXPENSE" },
  { value: "food", kind: "EXPENSE" },
  { value: "transport", kind: "EXPENSE" },
  { value: "health", kind: "EXPENSE" },
  { value: "education", kind: "EXPENSE" },
  { value: "leisure", kind: "EXPENSE" },
  { value: "shopping", kind: "EXPENSE" },
  { value: "subscription", kind: "EXPENSE" },
  { value: "taxes", kind: "EXPENSE" },
  { value: "investment", kind: "EXPENSE" },
  { value: "other", kind: "EXPENSE" },
] as const;

export type TransactionCategoryValue = (typeof TRANSACTION_CATEGORIES)[number]["value"];

export function categoryLabel(value: string, t: TranslateFn): string {
  return translateCategory(value, t);
}

export function categoriesForKind(kind: TransactionKind, t: TranslateFn) {
  if (kind === "TRANSFER") return [];
  return TRANSACTION_CATEGORIES.filter((item) => item.kind === kind).map((item) => ({
    value: item.value,
    label: categoryLabel(item.value, t),
  }));
}

import { decimalToNumber } from "@/lib/institutions";
import type {
  FinancialAccountKind,
  RecurrenceType,
  SerializedAccount,
  SerializedRecurring,
  SerializedTransaction,
  TransactionKind,
} from "@/types/finance";

type Decimalish = { toNumber(): number } | number | null;

function num(value: Decimalish): number {
  if (value === null) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
}

type AccountRecord = {
  id: string;
  institutionId: string | null;
  institution?: { name: string; logoUrl: string | null; type: string; brandColor: string | null } | null;
  name: string;
  kind: string;
  currencyCode: string;
  countryCode: string;
  initialBalance: Decimalish;
  color: string | null;
  icon: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeAccount(record: AccountRecord, balance?: number): SerializedAccount {
  const initialBalance = num(record.initialBalance);
  return {
    id: record.id,
    institutionId: record.institutionId,
    institutionName: record.institution?.name ?? null,
    institutionLogoUrl: record.institution?.logoUrl ?? null,
    institutionType: record.institution?.type ?? null,
    institutionBrandColor: record.institution?.brandColor ?? null,
    name: record.name,
    kind: record.kind as FinancialAccountKind,
    currencyCode: record.currencyCode,
    countryCode: record.countryCode,
    initialBalance,
    balance: balance ?? initialBalance,
    color: record.color,
    icon: record.icon,
    archived: record.archived,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

type TransactionRecord = {
  id: string;
  accountId: string;
  account?: { name: string } | null;
  kind: string;
  amount: Decimalish;
  currencyCode: string;
  category: string;
  description: string;
  icon: string | null;
  date: Date;
  counterAccountId: string | null;
  counterAmount: Decimalish;
  planEntryId: string | null;
  recurringId: string | null;
  notes: string | null;
  createdAt: Date;
};

export function serializeTransaction(record: TransactionRecord): SerializedTransaction {
  return {
    id: record.id,
    accountId: record.accountId,
    accountName: record.account?.name,
    kind: record.kind as TransactionKind,
    amount: num(record.amount),
    currencyCode: record.currencyCode,
    category: record.category,
    description: record.description,
    icon: record.icon,
    date: record.date.toISOString(),
    counterAccountId: record.counterAccountId,
    counterAmount: record.counterAmount === null ? null : num(record.counterAmount),
    planEntryId: record.planEntryId,
    recurringId: record.recurringId,
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
  };
}

type RecurringRecord = {
  id: string;
  accountId: string;
  account?: { name: string } | null;
  kind: string;
  amount: Decimalish;
  currencyCode: string;
  category: string;
  description: string;
  icon: string | null;
  recurrence: string;
  dayOfPeriod: number;
  nextDueAt: Date;
  endAt: Date | null;
  active: boolean;
  counterAccountId: string | null;
  counterAmount: Decimalish;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeRecurring(record: RecurringRecord): SerializedRecurring {
  return {
    id: record.id,
    accountId: record.accountId,
    accountName: record.account?.name,
    kind: record.kind as TransactionKind,
    amount: num(record.amount),
    currencyCode: record.currencyCode,
    category: record.category,
    description: record.description,
    icon: record.icon,
    recurrence: record.recurrence as RecurrenceType,
    dayOfPeriod: record.dayOfPeriod,
    nextDueAt: record.nextDueAt.toISOString(),
    endAt: record.endAt?.toISOString() ?? null,
    active: record.active,
    counterAccountId: record.counterAccountId,
    counterAmount: record.counterAmount === null ? null : num(record.counterAmount),
    notes: record.notes,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Saldo = inicial + entradas − saídas − transferências enviadas + transferências recebidas.
 * Recebe agregados por conta calculados via groupBy.
 */
export function computeAccountBalance(input: {
  initialBalance: number;
  income: number;
  expense: number;
  transferOut: number;
  transferIn: number;
}): number {
  return (
    input.initialBalance + input.income - input.expense - input.transferOut + input.transferIn
  );
}

export { decimalToNumber };

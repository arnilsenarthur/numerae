import type { TranslateFn } from "@/i18n/translate";
import type { FinancialAccountKind, RecurrenceType, TransactionKind } from "@/types/finance";
import type { MarketAssetKind, InvestmentEntryKind } from "@/types/market";
import type { TipCategory } from "@/types/tips";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategoryValue,
} from "@/types/finance";

export function translateCategory(value: string, t: TranslateFn): string {
  const key = `finance.category.${value}`;
  const label = t(key);
  return label === key ? value : label;
}

export function translateAccountKind(kind: FinancialAccountKind, t: TranslateFn): string {
  return t(`finance.accountKind.${kind}`);
}

export function translateTransactionKind(kind: TransactionKind, t: TranslateFn): string {
  return t(`finance.transactionKind.${kind}`);
}

export function translateRecurrence(recurrence: RecurrenceType, t: TranslateFn): string {
  return t(`finance.recurrence.${recurrence}`);
}

export function translateMarketAssetKind(kind: MarketAssetKind, t: TranslateFn): string {
  return t(`market.assetKind.${kind}`);
}

export function translateInvestmentEntryKind(kind: InvestmentEntryKind, t: TranslateFn): string {
  return t(`market.entryKind.${kind}`);
}

export function translateInvestmentCategory(category: string, t: TranslateFn): string {
  const key = `investments.pages.categories.${category}`;
  const label = t(key);
  return label === key ? category : label;
}

export function investmentCategoryOptions(t: TranslateFn) {
  return ["FIXED_INCOME", "STOCK_BR", "STOCK_US", "ETF", "FII", "CRYPTO", "OTHER"].map(
    (value) => ({
      value,
      label: translateInvestmentCategory(value, t),
    }),
  );
}

export function goalCategoryOptions(t: TranslateFn) {
  return [
    "other",
    "emergency",
    "travel",
    "home",
    "car",
    "education",
    "retirement",
    "investment",
    "health",
    "business",
  ].map((value) => ({
    value,
    label: translateGoalCategory(value, t),
  }));
}

export function translateGoalCategory(category: string, t: TranslateFn): string {
  const key = `finance.goalCategory.${category}`;
  const label = t(key);
  return label === key ? category : label;
}

export function translateTipCategory(category: string, t: TranslateFn): string {
  const key = `tips.category.${category}`;
  const label = t(key);
  return label === key ? category : label;
}

export function translateAuditAction(action: string, t: TranslateFn): string {
  const key = `admin.audit.action.${action}`;
  const label = t(key);
  return label === key ? action : label;
}

export function translateAuditEntity(entityType: string, t: TranslateFn): string {
  const key = `admin.audit.entity.${entityType}`;
  const label = t(key);
  return label === key ? entityType : label;
}

export function translateWorkerRunStatus(status: string, t: TranslateFn): string {
  const key = `admin.workers.status.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function translateWorkerRunTrigger(trigger: string, t: TranslateFn): string {
  const key = `admin.workers.trigger.${trigger}`;
  const label = t(key);
  return label === key ? trigger : label;
}

export function translateInstitutionType(type: string, t: TranslateFn): string {
  const key = `admin.institutions.type.${type}`;
  const label = t(key);
  return label === key ? type : label;
}

export function institutionTypeOptions(t: TranslateFn) {
  return ["BANK", "FINTECH", "BROKER", "REMITTANCE", "EXCHANGE", "OTHER"].map((value) => ({
    value,
    label: translateInstitutionType(value, t),
  }));
}

export function transactionCategoryOptions(
  kind: TransactionKind,
  t: TranslateFn,
): { value: TransactionCategoryValue; label: string }[] {
  if (kind === "TRANSFER") return [];
  return TRANSACTION_CATEGORIES.filter((item) => item.kind === kind).map((item) => ({
    value: item.value,
    label: translateCategory(item.value, t),
  }));
}

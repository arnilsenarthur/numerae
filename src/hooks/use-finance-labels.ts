"use client";

import { useMemo } from "react";
import { useT } from "@/i18n/locale-provider";
import {
  translateAccountKind,
  translateCategory,
  translateRecurrence,
  translateTransactionKind,
  transactionCategoryOptions,
} from "@/i18n/labels";
import type { FinancialAccountKind, RecurrenceType, TransactionKind } from "@/types/finance";

export function useFinanceLabels() {
  const t = useT();
  return useMemo(
    () => ({
      t,
      categoryLabel: (value: string) => translateCategory(value, t),
      accountKindLabel: (kind: FinancialAccountKind) => translateAccountKind(kind, t),
      transactionKindLabel: (kind: TransactionKind) => translateTransactionKind(kind, t),
      recurrenceLabel: (recurrence: RecurrenceType) => translateRecurrence(recurrence, t),
      categoriesForKind: (kind: TransactionKind) => transactionCategoryOptions(kind, t),
    }),
    [t],
  );
}

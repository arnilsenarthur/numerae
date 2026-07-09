"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import type { SerializedAccount, SerializedTransaction } from "@/types/finance";

export type FinanceSummary = {
  totals: { currencyCode: string; income: number; expense: number; net: number }[];
  categories: { category: string; currencyCode: string; kind: string; total: number }[];
  monthly: {
    month: string;
    series: { currencyCode: string; income: number; expense: number }[];
  }[];
  count: number;
};

export type FinancePeriod = { from: string | null; to: string | null };

export function useFinanceData(period: FinancePeriod) {
  const [accounts, setAccounts] = useState<SerializedAccount[]>([]);
  const [transactions, setTransactions] = useState<SerializedTransaction[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    const txQuery = new URLSearchParams({ summary: "true", limit: "300" });
    if (period.from) txQuery.set("from", period.from);
    if (period.to) txQuery.set("to", period.to);

    // Two parallel requests instead of three — transactions+summary merged into one.
    const [accountsRes, transactionsRes] = await Promise.all([
      fetchJson<{ accounts?: SerializedAccount[]; error?: string }>("/api/accounts"),
      fetchJson<{
        transactions?: SerializedTransaction[];
        summary?: FinanceSummary;
        error?: string;
      }>(`/api/transactions?${txQuery.toString()}`),
    ]);

    setLoading(false);

    if (!accountsRes.response.ok) {
      setError(accountsRes.data?.error ?? "Erro ao carregar contas.");
      return;
    }

    setAccounts(accountsRes.data?.accounts ?? []);

    if (transactionsRes.response.ok) {
      setTransactions(transactionsRes.data?.transactions ?? []);
      setSummary(transactionsRes.data?.summary ?? null);
    } else {
      setTransactions([]);
      setSummary(null);
    }
  }, [period.from, period.to]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    accounts,
    transactions,
    summary,
    loading,
    error,
    reload,
  };
}

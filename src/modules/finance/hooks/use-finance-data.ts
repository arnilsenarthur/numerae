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

    const summaryQuery = new URLSearchParams();
    if (period.from) summaryQuery.set("from", period.from);
    if (period.to) summaryQuery.set("to", period.to);

    const txQuery = new URLSearchParams(summaryQuery);
    txQuery.set("limit", "300");

    const [accountsRes, transactionsRes, summaryRes] = await Promise.all([
      fetchJson<{ accounts?: SerializedAccount[]; error?: string }>("/api/accounts"),
      fetchJson<{ transactions?: SerializedTransaction[]; error?: string }>(
        `/api/transactions?${txQuery.toString()}`,
      ),
      fetchJson<FinanceSummary & { error?: string }>(
        `/api/transactions/summary?${summaryQuery.toString()}`,
      ),
    ]);

    setLoading(false);

    if (!accountsRes.response.ok) {
      setError(accountsRes.data?.error ?? "Erro ao carregar contas.");
      return;
    }

    setAccounts(accountsRes.data?.accounts ?? []);
    setTransactions(
      transactionsRes.response.ok ? (transactionsRes.data?.transactions ?? []) : [],
    );
    setSummary(summaryRes.response.ok ? (summaryRes.data ?? null) : null);
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

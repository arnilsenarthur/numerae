"use client";

import { useEffect, useMemo, useState } from "react";
import { ButtonGroup, ButtonGroupItem } from "@/components/ui/button-group";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Money } from "@/components/ui/money";
import { BarChart, ColumnChart, DonutChart } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { IconBarChart, IconDownload, IconTrendDown, IconTrendUp } from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import { useUrlQueryEnum } from "@/hooks/use-url-query-state";
import {
  FINANCE_REPORT_DEFAULT_PERIOD,
  FINANCE_REPORT_PERIOD_CODES,
  financeReportPeriodRange,
  normalizeFinanceReportPeriod,
  periodLabelKey,
  type FinanceReportPeriod,
} from "@/lib/finance-period";
import { useT, useLocale } from "@/i18n/locale-provider";
import type { AppLocale } from "@/i18n/locales";
import { formatMoney } from "@/lib/format-money";
import { useFinanceLabels } from "@/hooks/use-finance-labels";
import type { SerializedBudget } from "@/types/budget";

type ReportData = {
  from: string;
  to: string;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  biggestExpense: {
    amount: number;
    description: string;
    category: string;
    date: string;
  } | null;
  topExpenseCategories: { category: string; income: number; expense: number }[];
  monthly: { month: string; income: number; expense: number }[];
};

const BUDGET_COLORS = ["#22c55e", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444", "#ec4899", "#14b8a6"];

function formatMonth(monthKey: string, locale: AppLocale): string {
  const [y, m] = monthKey.split("-");
  if (!y || !m) return monthKey;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(locale, {
    month: "short",
    year: "2-digit",
  });
}

export function FinanceReports() {
  const t = useT();
  const { locale } = useLocale();
  const labels = useFinanceLabels();
  const [preset, setPreset] = useUrlQueryEnum<FinanceReportPeriod>({
    key: "period",
    validValues: ["M", "3M", "Y"] as const,
    defaultValue: FINANCE_REPORT_DEFAULT_PERIOD,
    normalize: (raw) => normalizeFinanceReportPeriod(raw, FINANCE_REPORT_DEFAULT_PERIOD),
  });
  const [report, setReport] = useState<ReportData | null>(null);
  const [budgets, setBudgets] = useState<SerializedBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const budgetMonth = now.getMonth() + 1;
  const budgetYear = now.getFullYear();

  async function load(p: FinanceReportPeriod) {
    setLoading(true);
    setError(null);
    const { from, to } = financeReportPeriodRange(p);
    try {
      const [reportRes, budgetsRes] = await Promise.all([
        fetchJson<ReportData>(
          `/api/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=json`,
        ),
        fetchJson<{ budgets?: SerializedBudget[] }>(
          `/api/budgets?month=${budgetMonth}&year=${budgetYear}`,
        ),
      ]);
      if (reportRes.response.ok) setReport(reportRes.data ?? null);
      else setError(t("finance.pages.reports.loadError"));
      if (budgetsRes.response.ok) setBudgets(budgetsRes.data?.budgets ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(preset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset]);

  async function exportCsv() {
    const { from, to } = financeReportPeriodRange(preset);
    const url = `/api/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&format=csv`;
    const res = await fetch(url);
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `relatorio.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const barData = useMemo(() => {
    if (!report) return [];
    return report.monthly.map((m) => ({
      label: formatMonth(m.month, locale),
      value: m.expense,
      segments: [
        { label: t("finance.pages.reports.segmentExpense"), value: m.expense, color: "#ef4444" },
        { label: t("finance.pages.reports.segmentIncome"), value: m.income, color: "#22c55e" },
      ],
    }));
  }, [report, locale, t]);

  const expenseDonut = useMemo(() => {
    if (!report) return [];
    return report.topExpenseCategories
      .filter((c) => c.expense > 0)
      .slice(0, 8)
      .map((c, i) => ({
        label: labels.categoryLabel(c.category),
        value: c.expense,
        color: BUDGET_COLORS[i % BUDGET_COLORS.length],
      }));
  }, [report, labels]);

  const budgetBarData = useMemo(() => {
    return budgets.map((b, i) => ({
      label: labels.categoryLabel(b.category),
      value: b.spent,
      color: BUDGET_COLORS[i % BUDGET_COLORS.length],
      segments: [
        { label: t("finance.pages.reports.segmentSpent"), value: b.spent, color: "#ef4444" },
        { label: t("finance.pages.reports.segmentLimit"), value: Math.max(b.amount - b.spent, 0), color: "#e4e4e7" },
      ],
    }));
  }, [budgets, labels, t]);

  const budgetVsSpent = useMemo(() => {
    return budgets.map((b) => ({
      label: labels.categoryLabel(b.category),
      value: Math.min((b.spent / b.amount) * 100, 100),
      spent: b.spent,
      limit: b.amount,
      pct: b.amount > 0 ? (b.spent / b.amount) * 100 : 0,
    }));
  }, [budgets, labels]);

  const currency = budgets[0]?.currencyCode ?? "BRL";
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalBudgetSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const budgetUtilization =
    totalBudget > 0 ? Math.min((totalBudgetSpent / totalBudget) * 100, 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonGroup>
          {FINANCE_REPORT_PERIOD_CODES.map((code) => (
            <ButtonGroupItem
              key={code}
              active={preset === code}
              onClick={() => setPreset(code)}
            >
              {t(periodLabelKey(code, "report"))}
            </ButtonGroupItem>
          ))}
        </ButtonGroup>
        <Button type="button" variant="secondary" size="sm" onClick={() => void exportCsv()}>
          <IconDownload size="sm" /> {t("finance.pages.reports.exportCsv")}
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : report ? (
        <>
          {/* KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <IconTrendUp size="xs" /> {t("finance.pages.reports.income")}
                </div>
                <Money
                  value={report.totalIncome}
                  currency={currency}
                  size="md"
                  tone="income"
                  className="mt-1"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                  <IconTrendDown size="xs" /> {t("finance.pages.reports.expense")}
                </div>
                <Money
                  value={report.totalExpense}
                  currency={currency}
                  size="md"
                  tone="expense"
                  className="mt-1"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs font-medium text-zinc-500">{t("finance.pages.reports.netBalance")}</p>
                <Money
                  value={report.netBalance}
                  currency={currency}
                  size="md"
                  tone={report.netBalance >= 0 ? "income" : "expense"}
                  showSign
                  className="mt-1"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-3">
                <p className="text-xs font-medium text-zinc-500">{t("finance.pages.reports.monthlyBudget")}</p>
                {budgets.length > 0 ? (
                  <>
                    <p className="mt-1 text-lg font-semibold tabular-nums">
                      {budgetUtilization.toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {t("finance.pages.reports.budgetSpentOf", {
                        spent: formatMoney(totalBudgetSpent, { currency }),
                        total: formatMoney(totalBudget, { currency }),
                      })}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-zinc-400">{t("finance.pages.reports.noBudgets")}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts row 1: monthly + expense donut */}
          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            {barData.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <IconBarChart size="sm" /> {t("finance.pages.reports.monthlyEvolution")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ColumnChart
                    data={barData}
                    formatValue={(v) => formatMoney(v, { currency })}
                    className="h-48"
                    stacked
                  />
                </CardContent>
              </Card>
            ) : null}

            {expenseDonut.length > 0 ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t("finance.pages.reports.expenseDistribution")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DonutChart
                    segments={expenseDonut}
                    size={160}
                    formatValue={(v) => formatMoney(v, { currency })}
                  />
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Budget charts */}
          {budgets.length > 0 ? (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {t("finance.pages.reports.budgetsTitle", {
                  month: new Date(budgetYear, budgetMonth - 1).toLocaleDateString(locale, {
                    month: "long",
                    year: "numeric",
                  }),
                })}
              </h3>

              <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
                {budgetBarData.length > 0 ? (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{t("finance.pages.reports.spendVsLimit")}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BarChart
                        data={budgetBarData}
                        formatValue={(v) => formatMoney(v, { currency })}
                        stacked
                      />
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="h-fit">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("finance.pages.reports.budgetUtilization")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {budgetVsSpent.map((item) => {
                      const variant =
                        item.pct >= 100 ? "danger" : item.pct >= 80 ? "warning" : "default";
                      return (
                        <div key={item.label} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{item.label}</span>
                            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                              {formatMoney(item.spent, { currency })} /{" "}
                              {formatMoney(item.limit, { currency })}
                            </span>
                          </div>
                          <Progress value={item.pct} max={100} size="sm" variant={variant} />
                          <p className="text-right text-[10px] text-zinc-400">
                            {t("finance.pages.reports.percentUsed", { pct: item.pct.toFixed(0) })}
                            {item.pct > 100 ? t("finance.pages.reports.overLimit") : ""}
                          </p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {/* Category breakdown table */}
          {report.topExpenseCategories.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("finance.pages.reports.topCategories")}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {report.topExpenseCategories.map((cat) => {
                    const pct =
                      report.totalExpense > 0
                        ? ((cat.expense / report.totalExpense) * 100).toFixed(1)
                        : "0";
                    return (
                      <div key={cat.category} className="flex items-center justify-between gap-3 px-4 py-2">
                        <p className="min-w-0 truncate text-sm">{labels.categoryLabel(cat.category)}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium tabular-nums">
                            {formatMoney(cat.expense, { currency })}
                          </span>
                          <span className="w-10 text-right text-[10px] text-zinc-400">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {report.biggestExpense ? (
            <Card>
              <CardContent className="py-3">
                <p className="text-xs font-medium text-zinc-500">{t("finance.pages.reports.biggestExpense")}</p>
                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm">{report.biggestExpense.description}</p>
                  <Money
                    value={report.biggestExpense.amount}
                    currency={currency}
                    size="sm"
                    tone="expense"
                  />
                </div>
                <p className="text-[10px] text-zinc-400">
                  {new Date(report.biggestExpense.date).toLocaleDateString(locale)} ·{" "}
                  {labels.categoryLabel(report.biggestExpense.category)}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

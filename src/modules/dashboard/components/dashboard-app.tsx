"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/ui/page-header";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, cardClickable } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { DonutChart } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { DashboardSkeleton } from "@/components/ui/panel-skeleton";
import {
  IconBuilding,
  IconChart,
  IconCoins,
  IconPercent,
  IconPlus,
  IconReceipt,
  IconTarget,
  IconInfo,
  IconTrendDown,
  IconTrendUp,
  IconWallet,
  IconInvest,
} from "@/components/ui/icons";
import { fetchJson } from "@/lib/fetch-json";
import {
  CALCULATOR_TABS,
  FINANCE_TABS,
  INVESTMENT_TABS,
  calculatorTabPath,
  financeTabPath,
  investmentTabPath,
  marketKindPath,
} from "@/lib/app-routes";
import { AppIcon, categoryDefaultIcon } from "@/lib/icon-utils";
import { InstitutionAvatar } from "@/lib/institution-visual";
import { formatMoney } from "@/lib/format-money";
import { useFinanceLabels } from "@/hooks/use-finance-labels";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  type SerializedAccount,
  type SerializedTransaction,
} from "@/types/finance";
import { translateInvestmentCategory } from "@/i18n/labels";
import {
  INVESTMENT_CATEGORY_COLOR_HEX,
  type SerializedInvestmentPosition,
} from "@/types/market";
import type { SavedCompany } from "@/types/user-company";
import type { SerializedFinancialGoal } from "@/lib/goal-serializer";
import type { SerializedTip } from "@/types/tips";
import { TipSourceLink } from "@/modules/tips/components/tip-source-link";
import type { AppLocale } from "@/i18n/locales";

function formatDateShort(iso: string, locale: AppLocale) {
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short" });
}

export function DashboardApp() {
  const labels = useFinanceLabels();
  const t = useT();
  const { locale } = useLocale();
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  const [accounts, setAccounts] = useState<SerializedAccount[]>([]);
  const [positions, setPositions] = useState<SerializedInvestmentPosition[]>([]);
  const [transactions, setTransactions] = useState<SerializedTransaction[]>([]);
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [goals, setGoals] = useState<SerializedFinancialGoal[]>([]);
  const [dailyTip, setDailyTip] = useState<SerializedTip | null>(null);
  const [showDailyTip, setShowDailyTip] = useState(true);
  const [monthlySummary, setMonthlySummary] = useState<
    { month: string; series: { currencyCode: string; income: number; expense: number }[] }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [accountsRes, positionsRes, txRes, companiesRes, goalsRes, tipRes, prefsRes, summaryRes] =
        await Promise.all([
        fetchJson<{ accounts?: SerializedAccount[] }>("/api/accounts"),
        fetchJson<{ positions?: SerializedInvestmentPosition[] }>("/api/positions"),
        fetchJson<{ transactions?: SerializedTransaction[] }>("/api/transactions?limit=8"),
        fetchJson<{ companies?: SavedCompany[] }>("/api/companies"),
        fetchJson<{ goals?: SerializedFinancialGoal[] }>("/api/goals"),
        fetchJson<{ tip?: SerializedTip | null }>("/api/tips/daily"),
        fetchJson<{ preference?: { showDailyTip?: boolean } }>("/api/user/preferences"),
        fetchJson<{
          monthly?: { month: string; series: { currencyCode: string; income: number; expense: number }[] }[];
        }>(
          `/api/transactions/summary?from=${encodeURIComponent(
            new Date(Date.UTC(new Date().getFullYear(), 0, 1)).toISOString(),
          )}`,
        ),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (accountsRes.response.ok) setAccounts(accountsRes.data?.accounts ?? []);
      if (positionsRes.response.ok) setPositions(positionsRes.data?.positions ?? []);
      if (txRes.response.ok) setTransactions(txRes.data?.transactions ?? []);
      if (companiesRes.response.ok) setCompanies(companiesRes.data?.companies ?? []);
      if (goalsRes.response.ok) setGoals(goalsRes.data?.goals ?? []);
      if (tipRes.response.ok) setDailyTip(tipRes.data?.tip ?? null);
      if (prefsRes.response.ok) {
        setShowDailyTip(prefsRes.data?.preference?.showDailyTip ?? true);
      }
      if (summaryRes.response.ok) {
        setMonthlySummary(summaryRes.data?.monthly ?? []);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  // Saldo por moeda (contas)
  const balanceByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of accounts) {
      if (acc.archived) continue;
      map.set(acc.currencyCode, (map.get(acc.currencyCode) ?? 0) + acc.balance);
    }
    return [...map.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  }, [accounts]);

  // Investimentos por moeda
  const investedByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const pos of positions) {
      map.set(pos.currencyCode, (map.get(pos.currencyCode) ?? 0) + pos.currentBalance);
    }
    return [...map.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  }, [positions]);

  const liabilitiesByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of accounts) {
      if (acc.archived || acc.kind !== "CREDIT_CARD" || acc.balance >= 0) continue;
      map.set(acc.currencyCode, (map.get(acc.currencyCode) ?? 0) + Math.abs(acc.balance));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [accounts]);

  const totalProfit = positions.reduce((sum, p) => sum + (p.profit ?? 0), 0);
  const totalDeposited = positions.reduce((sum, p) => sum + p.totalDeposited, 0);
  const profitPct = totalDeposited > 0 ? (totalProfit / totalDeposited) * 100 : null;

  const donutSegments = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const pos of positions) {
      byCategory[pos.category] = (byCategory[pos.category] ?? 0) + pos.currentBalance;
    }
    return Object.entries(byCategory)
      .filter(([, v]) => v > 0)
      .map(([cat, value]) => ({
        label: translateInvestmentCategory(cat, t),
        value,
        color: INVESTMENT_CATEGORY_COLOR_HEX[cat] ?? "#a1a1aa",
      }));
  }, [positions, t]);

  // Patrimônio líquido por moeda
  const netWorthByCurrency = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of accounts) {
      if (acc.archived) continue;
      const prev = map.get(acc.currencyCode) ?? 0;
      map.set(acc.currencyCode, prev + acc.balance);
    }
    for (const pos of positions) {
      const prev = map.get(pos.currencyCode) ?? 0;
      map.set(pos.currencyCode, prev + pos.currentBalance);
    }
    return [...map.entries()]
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  }, [accounts, positions]);

  const activeAccounts = accounts.filter((a) => !a.archived);
  const pendingGoals = goals.filter((g) => !g.achieved).slice(0, 4);

  const primaryCurrency = netWorthByCurrency[0]?.[0] ?? "BRL";

  const currentMonthFlow = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthlySummary.find((m) => m.month === key);
    const series = entry?.series.find((s) => s.currencyCode === primaryCurrency);
    return {
      income: series?.income ?? 0,
      expense: series?.expense ?? 0,
      net: (series?.income ?? 0) - (series?.expense ?? 0),
    };
  }, [monthlySummary, primaryCurrency]);

  const totalInvested = useMemo(
    () => investedByCurrency.reduce((sum, [, v]) => sum + v, 0),
    [investedByCurrency],
  );

  const totalLiabilities = useMemo(
    () => liabilitiesByCurrency.reduce((sum, [, v]) => sum + v, 0),
    [liabilitiesByCurrency],
  );

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader
        meta={{
          kicker: t("dashboard.kicker"),
          title: firstName ? t("dashboard.titleHello", { name: firstName }) : t("dashboard.title"),
          subtitle: t("dashboard.subtitle"),
        }}
      />

      {!loading && showDailyTip && dailyTip ? (
        <Card className="border-sky-200/80 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/30">
          <CardContent className="flex gap-2.5 py-3">
            <IconInfo size="sm" className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-sky-900 dark:text-sky-100">{t("dashboard.dailyTip")}</p>
                <Link
                  href="/dicas"
                  className="shrink-0 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  {t("dashboard.viewAllTips")}
                </Link>
              </div>
              <p className="text-sm leading-snug text-sky-950/90 dark:text-sky-50/90">
                <span className="font-medium">{dailyTip.author}:</span> &ldquo;{dailyTip.quote}&rdquo;
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-xs text-sky-700/60 dark:text-sky-300/60">{t("tips.disclaimer")}</p>
                {dailyTip.sourceUrl ? (
                  <TipSourceLink
                    url={dailyTip.sourceUrl}
                    label={dailyTip.sourceLabel}
                    className="text-xs font-medium text-sky-800 hover:underline dark:text-sky-200"
                  />
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Row 1: 3 mini cards */}
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Saldo em contas */}
            <Card className="min-w-0">
              <CardHeader className="pb-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-zinc-500">
                    <IconWallet size="sm" /> {t("dashboard.accountBalance")}
                  </CardTitle>
                  <Link
                    href="/finance/accounts"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    {t("common.view")} →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {balanceByCurrency.length === 0 ? (
                  <p className="text-sm text-zinc-400">{t("dashboard.noAccounts")}</p>
                ) : (
                  <div className="space-y-1">
                    {balanceByCurrency.slice(0, 2).map(([code, value]) => (
                      <div key={code} className="flex min-w-0 items-baseline justify-between gap-2">
                        <Money
                          value={value}
                          currency={code}
                          size={balanceByCurrency[0]![0] === code ? "lg" : "sm"}
                          className="min-w-0"
                        />
                        <span className="text-[10px] text-zinc-400">{code}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-zinc-400">
                  {activeAccounts.length === 1
                    ? t("dashboard.accountOne")
                    : t("dashboard.accountMany", { count: activeAccounts.length })}
                  {totalLiabilities > 0
                    ? t("dashboard.cardDebt", {
                        amount: formatMoney(totalLiabilities, { currency: primaryCurrency }),
                      })
                    : ""}
                </p>
              </CardContent>
            </Card>

            {/* Patrimônio líquido */}
            <Card className="min-w-0">
              <CardHeader className="pb-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-zinc-500">
                    <IconTarget size="sm" /> {t("dashboard.netWorth")}
                  </CardTitle>
                  <Link
                    href="/finance/reports"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    {t("common.report")} →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {netWorthByCurrency.length === 0 ? (
                  <p className="text-sm text-zinc-400">{t("dashboard.noData")}</p>
                ) : (
                  <div className="space-y-1">
                    {netWorthByCurrency.slice(0, 2).map(([code, value]) => (
                      <div key={code} className="flex min-w-0 items-baseline justify-between gap-2">
                        <Money
                          value={value}
                          currency={code}
                          size={netWorthByCurrency[0]![0] === code ? "lg" : "sm"}
                          tone={value >= 0 ? "income" : "expense"}
                          className="min-w-0"
                        />
                        <span className="text-[10px] text-zinc-400">{code}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[11px] text-zinc-400">
                  {totalInvested > 0
                    ? t("dashboard.invested", {
                        amount: formatMoney(totalInvested, { currency: primaryCurrency }),
                      })
                    : t("dashboard.accountsOnly")}
                  {totalLiabilities > 0
                    ? t("dashboard.liabilities", {
                        amount: formatMoney(totalLiabilities, { currency: primaryCurrency }),
                      })
                    : ""}
                </p>
              </CardContent>
            </Card>

            {/* Fluxo do mês */}
            <Card className="min-w-0 sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-zinc-500">
                    <IconReceipt size="sm" /> {t("dashboard.monthlyFlow")}
                  </CardTitle>
                  <Link
                    href="/finance/transactions"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    {t("common.view")} →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">{t("dashboard.income")}</span>
                    <Money value={currentMonthFlow.income} currency={primaryCurrency} size="sm" tone="income" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-red-600 dark:text-red-400">{t("dashboard.expense")}</span>
                    <Money value={currentMonthFlow.expense} currency={primaryCurrency} size="sm" tone="expense" />
                  </div>
                  <div className="flex items-baseline justify-between gap-2 border-t border-zinc-100 pt-1 dark:border-zinc-800">
                    <span className="text-xs font-medium text-zinc-500">{t("dashboard.balance")}</span>
                    <Money
                      value={currentMonthFlow.net}
                      currency={primaryCurrency}
                      size="md"
                      tone={currentMonthFlow.net >= 0 ? "income" : "expense"}
                      showSign
                    />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-zinc-400">
                  {new Date().toLocaleDateString(locale, { month: "long", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: investimentos + movimentações */}
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {/* Investimentos */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2 truncate text-base">
                    <IconInvest size="sm" /> {t("dashboard.investments")}
                  </CardTitle>
                  <Link
                    href="/investments"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    {t("dashboard.viewAllPositions")}
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="min-w-0">
                {positions.length === 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-zinc-500">{t("dashboard.noPositions")}</p>
                    <Link href="/investments">
                      <Button type="button" size="sm" variant="secondary">
                        <IconPlus size="sm" /> {t("dashboard.addPosition")}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {donutSegments.length > 0 ? (
                      <DonutChart
                        segments={donutSegments}
                        size={100}
                        formatValue={(v) => formatMoney(v, { currency: primaryCurrency })}
                      />
                    ) : null}
                    <div className="min-w-0 flex-1 space-y-2">
                      {investedByCurrency.slice(0, 2).map(([code, value]) => (
                        <div key={code} className="flex items-baseline justify-between gap-2">
                          <Money value={value} currency={code} size="md" className="min-w-0" />
                          <span className="text-[10px] text-zinc-400">{code}</span>
                        </div>
                      ))}
                      <p
                        className={`flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-medium ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        {totalProfit >= 0 ? <IconTrendUp size="xs" /> : <IconTrendDown size="xs" />}
                        {totalProfit >= 0 ? "+" : ""}
                        {formatMoney(totalProfit, { currency: primaryCurrency })}
                        {profitPct !== null ? ` (${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(1)}%)` : ""}
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {positions.length === 1
                          ? t("dashboard.positionOne")
                          : t("dashboard.positionMany", { count: positions.length })}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Últimas movimentações */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="min-w-0 truncate text-base">{t("dashboard.recentTransactions")}</CardTitle>
                  <Link
                    href="/finance"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    {t("dashboard.viewAllPositions")}
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-zinc-400">
                    {t("dashboard.noTransactions")}
                  </p>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {transactions.slice(0, 6).map((tx) => (
                      <div key={tx.id} className="flex min-w-0 items-center gap-3 px-4 py-2">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                            tx.kind === "INCOME"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                              : tx.kind === "EXPENSE"
                                ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                                : "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
                          }`}
                        >
                          {tx.kind === "INCOME" ? (
                            <IconTrendUp size="xs" />
                          ) : tx.kind === "EXPENSE" ? (
                            <IconTrendDown size="xs" />
                          ) : (
                            <IconCoins size="xs" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                            {tx.description}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            {formatDateShort(tx.date, locale)} · {labels.categoryLabel(tx.category)}
                          </p>
                        </div>
                        <Money
                          value={
                            tx.kind === "EXPENSE" ? -tx.amount : tx.amount
                          }
                          currency={tx.currencyCode}
                          showSign={tx.kind === "INCOME"}
                          tone={
                            tx.kind === "TRANSFER"
                              ? "transfer"
                              : tx.kind === "EXPENSE"
                                ? "expense"
                                : "income"
                          }
                          size="sm"
                          className="max-w-[42%] shrink-0 text-right"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Metas */}
          {pendingGoals.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{t("dashboard.goalsInProgress")}</h3>
                <Link
                  href={financeTabPath(FINANCE_TABS.goals)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  {t("dashboard.viewAllGoals")}
                </Link>
              </div>
              <div className="grid min-w-0 gap-3">
                {pendingGoals.map((goal) => (
                  <Link
                    key={goal.id}
                    href={financeTabPath(FINANCE_TABS.goals)}
                    className="block min-w-0"
                  >
                    <Card className={`min-w-0 ${cardClickable}`}>
                      <CardContent className="p-3">
                        <div className="flex min-w-0 items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                              <AppIcon name={goal.icon ?? categoryDefaultIcon(goal.category)} size="xs" />
                            </div>
                            <span className="min-w-0 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                              {goal.title}
                            </span>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            {goal.progressPercent.toFixed(0)}%
                          </span>
                        </div>
                        <Progress
                          value={goal.progressPercent}
                          max={100}
                          size="sm"
                          variant={goal.progressPercent >= 100 ? "success" : "default"}
                          className="mt-2"
                        />
                        <p className="mt-1.5 break-words text-[10px] leading-relaxed text-zinc-400">
                          {t("dashboard.goalProgress", {
                            current: formatMoney(goal.currentAmount, { currency: goal.currency }),
                            target: formatMoney(goal.targetAmount, { currency: goal.currency }),
                          })}
                          {goal.daysRemaining !== null
                            ? ` · ${
                                goal.daysRemaining < 0
                                  ? t("dashboard.goalOverdue")
                                  : goal.daysRemaining === 0
                                    ? t("dashboard.goalToday")
                                    : t("dashboard.goalDaysLeft", { days: goal.daysRemaining })
                              }`
                            : ""}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Row 3: contas */}
          {activeAccounts.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{t("dashboard.yourAccounts")}</h3>
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {activeAccounts.slice(0, 8).map((acc) => (
                  <Link
                    key={acc.id}
                    href={financeTabPath(FINANCE_TABS.accounts)}
                    className="block min-w-0"
                  >
                    <Card className={`h-full min-w-0 ${cardClickable}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2">
                          <InstitutionAvatar
                            logoUrl={acc.institutionLogoUrl}
                            institutionType={acc.institutionId ? acc.institutionType : null}
                            brandColor={acc.institutionBrandColor}
                            size="sm"
                          />
                          <p className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
                            {acc.name}
                          </p>
                        </div>
                        <div className="mt-1.5 min-w-0">
                          <Money value={acc.balance} currency={acc.currencyCode} className="min-w-0" />
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-zinc-400">
                          {labels.accountKindLabel(acc.kind)}
                          {acc.institutionName ? ` · ${acc.institutionName}` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {/* Row 4: atalhos */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{t("dashboard.tools")}</h3>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculator" className="block min-w-0">
                <Card className={`h-full min-w-0 ${cardClickable}`}>
                  <CardContent className="flex min-w-0 items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <IconPercent size="sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t("dashboard.calculators")}</p>
                      <p className="truncate text-[11px] text-zinc-400">{t("dashboard.calculatorsHint")}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={marketKindPath()} className="block min-w-0">
                <Card className={`h-full min-w-0 ${cardClickable}`}>
                  <CardContent className="flex min-w-0 items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                      <IconChart size="sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t("dashboard.market")}</p>
                      <p className="truncate text-[11px] text-zinc-400">{t("dashboard.marketHint")}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={calculatorTabPath(CALCULATOR_TABS.exchange)} className="block min-w-0">
                <Card className={`h-full min-w-0 ${cardClickable}`}>
                  <CardContent className="flex min-w-0 items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400">
                      <IconCoins size="sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t("dashboard.bestExchange")}</p>
                      <p className="truncate text-[11px] text-zinc-400">{t("dashboard.bestExchangeHint")}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href={investmentTabPath(INVESTMENT_TABS.projection)} className="block min-w-0">
                <Card className={`h-full min-w-0 ${cardClickable}`}>
                  <CardContent className="flex min-w-0 items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
                      <IconTrendUp size="sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t("dashboard.projections")}</p>
                      <p className="truncate text-[11px] text-zinc-400">{t("dashboard.projectionsHint")}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

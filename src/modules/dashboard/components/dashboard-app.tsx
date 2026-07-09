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
import {
  ACCOUNT_KIND_LABELS,
  categoryLabel,
  type SerializedAccount,
  type SerializedTransaction,
} from "@/types/finance";
import {
  INVESTMENT_CATEGORY_COLOR_HEX,
  INVESTMENT_CATEGORY_LABELS,
  type SerializedInvestmentPosition,
} from "@/types/market";
import type { SavedCompany } from "@/types/user-company";
import type { SerializedFinancialGoal } from "@/lib/goal-serializer";
import type { SerializedTip } from "@/types/tips";
import { TIP_DISCLAIMER } from "@/lib/tip-of-day";
import { TipSourceLink } from "@/modules/tips/components/tip-source-link";

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function DashboardApp() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  const [accounts, setAccounts] = useState<SerializedAccount[]>([]);
  const [positions, setPositions] = useState<SerializedInvestmentPosition[]>([]);
  const [transactions, setTransactions] = useState<SerializedTransaction[]>([]);
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [goals, setGoals] = useState<SerializedFinancialGoal[]>([]);
  const [dailyTip, setDailyTip] = useState<SerializedTip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [accountsRes, positionsRes, txRes, companiesRes, goalsRes, tipRes] = await Promise.all([
        fetchJson<{ accounts?: SerializedAccount[] }>("/api/accounts"),
        fetchJson<{ positions?: SerializedInvestmentPosition[] }>("/api/positions"),
        fetchJson<{ transactions?: SerializedTransaction[] }>("/api/transactions?limit=8"),
        fetchJson<{ companies?: SavedCompany[] }>("/api/companies"),
        fetchJson<{ goals?: SerializedFinancialGoal[] }>("/api/goals"),
        fetchJson<{ tip?: SerializedTip | null }>("/api/tips/daily"),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (accountsRes.response.ok) setAccounts(accountsRes.data?.accounts ?? []);
      if (positionsRes.response.ok) setPositions(positionsRes.data?.positions ?? []);
      if (txRes.response.ok) setTransactions(txRes.data?.transactions ?? []);
      if (companiesRes.response.ok) setCompanies(companiesRes.data?.companies ?? []);
      if (goalsRes.response.ok) setGoals(goalsRes.data?.goals ?? []);
      if (tipRes.response.ok) setDailyTip(tipRes.data?.tip ?? null);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

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
        label: INVESTMENT_CATEGORY_LABELS[cat] ?? cat,
        value,
        color: INVESTMENT_CATEGORY_COLOR_HEX[cat] ?? "#a1a1aa",
      }));
  }, [positions]);

  const activeAccounts = accounts.filter((a) => !a.archived);
  const pendingGoals = goals.filter((g) => !g.achieved).slice(0, 4);

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-6xl flex-col gap-4">
      <PageHeader
        meta={{
          kicker: "Visão geral",
          title: firstName ? `Olá, ${firstName}` : "Visão geral",
          subtitle: "Saldos, investimentos, metas e movimentações em um lugar.",
        }}
      />

      {!loading && dailyTip ? (
        <Card className="border-sky-200/80 bg-sky-50/60 dark:border-sky-900/60 dark:bg-sky-950/30">
          <CardContent className="flex gap-2.5 py-3">
            <IconInfo size="sm" className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-sky-900 dark:text-sky-100">Dica do dia</p>
                <Link
                  href="/dicas"
                  className="shrink-0 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  Ver todas →
                </Link>
              </div>
              <p className="text-sm leading-snug text-sky-950/90 dark:text-sky-50/90">
                <span className="font-medium">{dailyTip.author}:</span> &ldquo;{dailyTip.quote}&rdquo;
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <p className="text-xs text-sky-700/60 dark:text-sky-300/60">{TIP_DISCLAIMER}</p>
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
          {/* Row 1: patrimônio */}
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Saldo em contas */}
            <Card className="min-w-0">
              <CardHeader className="pb-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-zinc-500">
                    <IconWallet size="sm" /> Saldo em contas
                  </CardTitle>
                  <Link
                    href="/finance"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Ver →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {balanceByCurrency.length === 0 ? (
                  <p className="text-sm text-zinc-400">Nenhuma conta cadastrada</p>
                ) : (
                  <div className="space-y-1">
                    {balanceByCurrency.map(([code, value]) => (
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
                  {activeAccounts.length} conta{activeAccounts.length !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>

            {/* Investimentos */}
            <Card className="min-w-0">
              <CardHeader className="pb-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-zinc-500">
                    <IconChart size="sm" /> Investimentos
                  </CardTitle>
                  <Link
                    href="/investments"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Ver →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {investedByCurrency.length === 0 ? (
                  <p className="text-sm text-zinc-400">Nenhuma posição cadastrada</p>
                ) : (
                  <div className="space-y-1">
                    {investedByCurrency.map(([code, value]) => (
                      <div key={code} className="flex min-w-0 items-baseline justify-between gap-2">
                        <Money
                          value={value}
                          currency={code}
                          size={investedByCurrency[0]![0] === code ? "lg" : "sm"}
                          className="min-w-0"
                        />
                        <span className="text-[10px] text-zinc-400">{code}</span>
                      </div>
                    ))}
                  </div>
                )}
                {positions.length > 0 ? (
                  <p
                    className={`mt-2 flex min-w-0 flex-wrap items-center gap-1 text-[11px] font-medium ${totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                  >
                    {totalProfit >= 0 ? <IconTrendUp size="xs" /> : <IconTrendDown size="xs" />}
                    {totalProfit >= 0 ? "+" : ""}
                    {formatMoney(totalProfit, { currency: "BRL" })}
                    {profitPct !== null ? ` (${profitPct >= 0 ? "+" : ""}${profitPct.toFixed(1)}%)` : ""}
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {/* Empresas */}
            <Card className="min-w-0 sm:col-span-2 lg:col-span-1">
              <CardHeader className="pb-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-zinc-500">
                    <IconBuilding size="sm" /> Empresas
                  </CardTitle>
                  <Link
                    href="/companies"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Ver →
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {companies.length === 0 ? (
                  <p className="text-sm text-zinc-400">Nenhuma empresa cadastrada</p>
                ) : (
                  <div className="space-y-1.5">
                    {companies.slice(0, 3).map((company) => (
                      <div key={company.id} className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                          {company.label}
                        </span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {company.taxRate}%
                        </Badge>
                      </div>
                    ))}
                    {companies.length > 3 ? (
                      <p className="text-[11px] text-zinc-400">
                        +{companies.length - 3} outra{companies.length - 3 !== 1 ? "s" : ""}
                      </p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Row 2: composição + movimentações */}
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            {/* Composição de investimentos */}
            {donutSegments.length > 0 ? (
              <Card className="min-w-0 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Composição dos investimentos</CardTitle>
                </CardHeader>
                <CardContent className="min-w-0">
                  <DonutChart
                    segments={donutSegments}
                    size={120}
                    formatValue={(v) => formatMoney(v, { currency: "BRL" })}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="min-w-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Comece a investir</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-zinc-500">
                    Registre suas posições de investimento para acompanhar aportes e rendimento.
                  </p>
                  <Link href="/investments">
                    <Button type="button" size="sm" variant="secondary">
                      <IconPlus size="sm" /> Adicionar posição
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Últimas movimentações */}
            <Card className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <CardTitle className="min-w-0 truncate text-base">Últimas movimentações</CardTitle>
                  <Link
                    href="/finance"
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    Ver todas →
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {transactions.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-zinc-400">
                    Nenhuma movimentação registrada
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
                            {formatDateShort(tx.date)} · {categoryLabel(tx.category)}
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
                <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Metas em andamento</h3>
                <Link
                  href={financeTabPath(FINANCE_TABS.goals)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                >
                  Ver todas
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
                          {formatMoney(goal.currentAmount, { currency: goal.currency })} de{" "}
                          {formatMoney(goal.targetAmount, { currency: goal.currency })}
                          {goal.daysRemaining !== null
                            ? ` · ${goal.daysRemaining < 0 ? "Vencida" : goal.daysRemaining === 0 ? "Hoje" : `${goal.daysRemaining} dias`}`
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
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Suas contas</h3>
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
                          {ACCOUNT_KIND_LABELS[acc.kind]}
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
            <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Ferramentas</h3>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link href="/calculator" className="block min-w-0">
                <Card className={`h-full min-w-0 ${cardClickable}`}>
                  <CardContent className="flex min-w-0 items-center gap-3 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <IconPercent size="sm" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">Calculadoras</p>
                      <p className="truncate text-[11px] text-zinc-400">Câmbio, impostos, FIRE</p>
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
                      <p className="truncate text-sm font-medium">Mercado</p>
                      <p className="truncate text-[11px] text-zinc-400">Ações, ETFs, cripto</p>
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
                      <p className="truncate text-sm font-medium">Melhor câmbio</p>
                      <p className="truncate text-[11px] text-zinc-400">Compare taxas por banco</p>
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
                      <p className="truncate text-sm font-medium">Projeções</p>
                      <p className="truncate text-[11px] text-zinc-400">Simule o crescimento</p>
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

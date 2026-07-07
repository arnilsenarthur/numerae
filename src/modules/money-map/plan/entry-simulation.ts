import { monthlyAmount } from "@/modules/money-map/engines/conversion";
import { cashFlowInMonth } from "@/modules/money-map/engines/plan-analytics";
import {
  evaluateEntry,
  pickBestEvalPerEntry,
  type EntryEvalResult,
} from "@/modules/money-map/engines/treatment-eval";
import type {
  CurrencyFlow,
  MoneyMapNodeInput,
  MonthlyProjection,
  PlanAnalytics,
  PlanLineItem,
  RouteQuote,
  SimulationResult,
  TimeViewerResult,
} from "@/modules/money-map/engines/types";
import {
  defaultEntryConfig,
  parseTreatments,
  type PlanEntryConfig,
} from "@/modules/money-map/plan/entry-types";
import { formatMoney } from "@/lib/format-money";

function isPlanEntry(node: MoneyMapNodeInput): boolean {
  return node.type === "INCOME" || node.type === "EXPENSE";
}

function parseEntryConfig(config: unknown): PlanEntryConfig {
  const c = config as PlanEntryConfig;
  return {
    ...defaultEntryConfig("INCOME"),
    amount: Number(c.amount) || 0,
    currency: c.currency ?? "BRL",
    period: c.period ?? "monthly",
    category: String(c.category ?? "other"),
    onceMonth: c.onceMonth != null ? Number(c.onceMonth) : undefined,
    movement: true,
    source: c.source === "open_finance" ? "open_finance" : "manual",
    treatments: parseTreatments(c.treatments),
    actualAmount: c.actualAmount ?? null,
  };
}

function emptyCurrencyFlow(): CurrencyFlow {
  return { income: 0, expense: 0, net: 0 };
}

function addCurrencyFlow(
  map: Record<string, CurrencyFlow>,
  currency: string,
  field: keyof CurrencyFlow,
  value: number,
) {
  if (value === 0) return;
  map[currency] ??= emptyCurrencyFlow();
  map[currency][field] += value;
  if (field === "income") map[currency].net += value;
  if (field === "expense") map[currency].net -= value;
}

function findExpenseQuote(currency: string, quotes: RouteQuote[]): RouteQuote | null {
  if (currency === "BRL") return null;
  return quotes.find((q) => q.fromCurrency === currency && q.toCurrency === "BRL") ?? null;
}

function expenseMonthlyBrl(
  amount: number,
  currency: string,
  period: PlanEntryConfig["period"],
  month: number,
  onceMonth: number,
  quotes: RouteQuote[],
): { brl: number; native: number; currency: string; converted: boolean } {
  const flow = cashFlowInMonth(amount, period, month, onceMonth);
  if (flow === 0) return { brl: 0, native: 0, currency, converted: currency === "BRL" };
  if (currency === "BRL") return { brl: flow, native: flow, currency: "BRL", converted: true };
  const quote = findExpenseQuote(currency, quotes);
  if (!quote) return { brl: 0, native: flow, currency, converted: false };
  return { brl: flow * quote.effectiveRate, native: flow, currency, converted: true };
}

function buildLineItems(
  nodes: MoneyMapNodeInput[],
  incomeEvals: EntryEvalResult[],
  quotes: RouteQuote[],
): PlanLineItem[] {
  const bestByEntry = new Map(incomeEvals.map((ev) => [ev.entryId, ev]));
  const items: PlanLineItem[] = [];

  for (const node of nodes) {
    if (!node.id || !isPlanEntry(node)) continue;
    const config = parseEntryConfig(node.config);
    const monthlyNative = monthlyAmount(config.amount, config.period);
    const kind = node.type === "INCOME" ? "income" : "expense";

    if (kind === "income") {
      const ev = bestByEntry.get(node.id);
      const converted = ev ? ev.outputCurrency === "BRL" : config.currency === "BRL";
      const monthlyBrl = ev
        ? ev.netBrlMonth + ev.taxBrlMonth + ev.investedBrlMonth
        : config.currency === "BRL"
          ? monthlyNative
          : null;
      items.push({
        nodeId: node.id,
        label: node.label ?? "Entrada",
        category: config.category,
        kind,
        amount: config.amount,
        currency: config.currency,
        period: config.period,
        onceMonth: config.onceMonth,
        monthlyNative,
        monthlyBrl: converted ? monthlyBrl : null,
        monthlyEquivalentBrl: converted ? (monthlyBrl ?? 0) : 0,
        converted,
      });
      continue;
    }

    const quote = findExpenseQuote(config.currency, quotes);
    const converted = config.currency === "BRL" || Boolean(quote);
    const monthlyBrl =
      config.currency === "BRL"
        ? monthlyNative
        : quote
          ? monthlyNative * quote.effectiveRate
          : null;

    items.push({
      nodeId: node.id,
      label: node.label ?? "Saída",
      category: config.category,
      kind,
      amount: config.amount,
      currency: config.currency,
      period: config.period,
      onceMonth: config.onceMonth,
      monthlyNative,
      monthlyBrl: converted ? monthlyBrl : null,
      monthlyEquivalentBrl: converted ? (monthlyBrl ?? 0) : 0,
      converted,
    });
  }

  return items;
}

function buildConsolidatedMonthly(
  incomeEvals: EntryEvalResult[],
  expenses: MoneyMapNodeInput[],
  horizonMonths: number,
  quotes: RouteQuote[],
): MonthlyProjection[] {
  const monthly: MonthlyProjection[] = [];
  let cumulative = 0;

  for (let month = 1; month <= horizonMonths; month += 1) {
    const byCurrency: Record<string, CurrencyFlow> = {};
    let grossBrl = 0;
    let taxBrl = 0;
    let investedBrl = 0;
    let expensesBrl = 0;
    let grossInSource = 0;

    for (const ev of incomeEvals) {
      grossInSource += ev.grossInSource;
      grossBrl += ev.grossBrlMonth;
      taxBrl += ev.taxBrlMonth;
      investedBrl += ev.investedBrlMonth;

      if (ev.outputCurrency === "BRL") {
        addCurrencyFlow(byCurrency, "BRL", "income", ev.netBrlMonth + ev.taxBrlMonth + ev.investedBrlMonth);
      } else {
        addCurrencyFlow(byCurrency, ev.outputCurrency, "income", ev.outputAmount);
      }
    }

    for (const exp of expenses) {
      const config = parseEntryConfig(exp.config);
      const row = expenseMonthlyBrl(
        config.amount,
        config.currency,
        config.period,
        month,
        config.onceMonth ?? 1,
        quotes,
      );
      if (row.native === 0) continue;

      if (row.converted) {
        expensesBrl += row.brl;
        addCurrencyFlow(byCurrency, "BRL", "expense", row.brl);
      } else {
        addCurrencyFlow(byCurrency, row.currency, "expense", row.native);
      }
    }

    const netBrl = Math.max(0, grossBrl - expensesBrl - taxBrl - investedBrl);
    cumulative += netBrl;

    monthly.push({
      month,
      grossInSource,
      grossBrl,
      taxBrl,
      expensesBrl,
      netBrl,
      investedBrl,
      cumulativeNetBrl: Math.round(cumulative * 100) / 100,
      byCurrency,
    });
  }

  return monthly;
}

function buildIncomeLabel(
  incomes: MoneyMapNodeInput[],
  bestEvals: EntryEvalResult[],
  timeline: MonthlyProjection[],
): string {
  if (incomes.length === 0) return "Sem entradas";

  const monthlyGross =
    timeline.length > 0
      ? timeline.reduce((sum, row) => sum + row.grossBrl, 0) / timeline.length
      : bestEvals.reduce(
          (sum, ev) => sum + ev.grossBrlMonth,
          0,
        );

  if (monthlyGross <= 0) {
    return incomes.length === 1 ? "Sem conversão para BRL" : `${incomes.length} entradas`;
  }

  const formatted = `${formatMoney(Math.round(monthlyGross * 100) / 100)}/mês`;
  return incomes.length === 1 ? formatted : `${incomes.length} entradas · ${formatted}`;
}

function buildRouteMonthly(
  ev: EntryEvalResult,
  expenses: MoneyMapNodeInput[],
  horizonMonths: number,
  quotes: RouteQuote[],
): MonthlyProjection[] {
  return buildConsolidatedMonthly([ev], expenses, horizonMonths, quotes);
}

export function simulatePlan(input: {
  horizonMonths: number;
  nodes: MoneyMapNodeInput[];
  quotes: RouteQuote[];
}): SimulationResult {
  const entries = input.nodes.filter(isPlanEntry);
  const incomes = entries.filter((n) => n.type === "INCOME");
  const expenses = entries.filter((n) => n.type === "EXPENSE");

  const allIncomeEvals: EntryEvalResult[] = [];
  for (const node of incomes) {
    if (!node.id) continue;
    allIncomeEvals.push(
      ...evaluateEntry({
        entryId: node.id,
        entryLabel: node.label ?? "Entrada",
        kind: "INCOME",
        config: parseEntryConfig(node.config),
        quotes: input.quotes,
        horizonMonths: input.horizonMonths,
      }),
    );
  }

  const bestIncomeEvals = pickBestEvalPerEntry(allIncomeEvals);

  const routes = allIncomeEvals.map((ev) => {
    const monthly = buildRouteMonthly(ev, expenses, input.horizonMonths, input.quotes);
    const totals = monthly.reduce(
      (acc, row) => ({
        grossBrl: acc.grossBrl + row.grossBrl,
        taxBrl: acc.taxBrl + row.taxBrl,
        expensesBrl: acc.expensesBrl + row.expensesBrl,
        netBrl: acc.netBrl + row.netBrl,
        investedBrl: acc.investedBrl + row.investedBrl,
      }),
      { grossBrl: 0, taxBrl: 0, expensesBrl: 0, netBrl: 0, investedBrl: 0 },
    );

    return {
      pathId: `${ev.entryId}:${ev.routeId}`,
      pathLabel: `${ev.entryLabel} · ${ev.routeLabel}`,
      pathSteps: ev.steps.map((step, index) => ({
        nodeId: `${ev.entryId}-step-${index}`,
        type: "INCOME" as const,
        label: step.label,
        monthlyBrl: step.currency === "BRL" ? step.amount : 0,
      })),
      institutionId: ev.institutionId,
      institutionName: ev.institutionName,
      quote:
        ev.quote ??
        ({
          institutionId: ev.institutionId,
          institutionName: ev.institutionName,
          institutionSlug: ev.institutionId,
          fromCurrency: ev.sourceCurrency,
          toCurrency: ev.outputCurrency,
          rate: 1,
          spreadPercent: 0,
          effectiveRate: 1,
          feeFixed: null,
          feePercent: null,
          stale: false,
        } satisfies RouteQuote),
      monthly,
      totals,
    };
  });

  if (routes.length === 0 && expenses.length > 0) {
    const monthly = buildConsolidatedMonthly([], expenses, input.horizonMonths, input.quotes);
    routes.push({
      pathId: "expenses",
      pathLabel: "Saídas",
      pathSteps: [],
      institutionId: "direct",
      institutionName: "Plano",
      quote: {
        institutionId: "direct",
        institutionName: "Plano",
        institutionSlug: "direct",
        fromCurrency: "BRL",
        toCurrency: "BRL",
        rate: 1,
        spreadPercent: 0,
        effectiveRate: 1,
        feeFixed: null,
        feePercent: null,
        stale: false,
      },
      monthly,
      totals: monthly.reduce(
        (acc, row) => ({
          grossBrl: acc.grossBrl + row.grossBrl,
          taxBrl: acc.taxBrl + row.taxBrl,
          expensesBrl: acc.expensesBrl + row.expensesBrl,
          netBrl: acc.netBrl + row.netBrl,
          investedBrl: acc.investedBrl + row.investedBrl,
        }),
        { grossBrl: 0, taxBrl: 0, expensesBrl: 0, netBrl: 0, investedBrl: 0 },
      ),
    });
  }

  const sorted = [...routes].sort((a, b) => b.totals.netBrl - a.totals.netBrl);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const deltaVsWorstBrl =
    best && worst && sorted.length > 1
      ? Math.round((best.totals.netBrl - worst.totals.netBrl) * 100) / 100
      : 0;

  const consolidatedTimeline = buildConsolidatedMonthly(
    bestIncomeEvals,
    expenses,
    input.horizonMonths,
    input.quotes,
  );

  const lineItems = buildLineItems(entries, bestIncomeEvals, input.quotes);
  const currencies = [
    ...new Set([
      ...lineItems.map((item) => item.currency),
      ...consolidatedTimeline.flatMap((row) => Object.keys(row.byCurrency)),
    ]),
  ].sort((a, b) => (a === "BRL" ? -1 : b === "BRL" ? 1 : a.localeCompare(b)));

  const byCategoryMap = new Map<
    string,
    { category: string; label: string; incomeBrl: number; expenseBrl: number }
  >();
  for (const item of lineItems) {
    const key = item.category;
    const row = byCategoryMap.get(key) ?? { category: key, label: key, incomeBrl: 0, expenseBrl: 0 };
    const brl = item.monthlyBrl ?? 0;
    if (item.kind === "income" && item.converted) row.incomeBrl += brl;
    if (item.kind === "expense" && item.converted) row.expenseBrl += brl;
    byCategoryMap.set(key, row);
  }

  const analytics: PlanAnalytics = {
    horizonMonths: input.horizonMonths,
    timeline: consolidatedTimeline,
    lineItems,
    currencies,
    byCategory: [...byCategoryMap.values()].map((row) => ({
      ...row,
      netBrl: row.incomeBrl - row.expenseBrl,
      label: row.label,
    })),
    totals: consolidatedTimeline.reduce(
      (acc, row) => ({
        grossBrl: acc.grossBrl + row.grossBrl,
        taxBrl: acc.taxBrl + row.taxBrl,
        expensesBrl: acc.expensesBrl + row.expensesBrl,
        netBrl: acc.netBrl + row.netBrl,
        investedBrl: acc.investedBrl + row.investedBrl,
        cumulativeNetBrl: row.cumulativeNetBrl,
      }),
      { grossBrl: 0, taxBrl: 0, expensesBrl: 0, netBrl: 0, investedBrl: 0, cumulativeNetBrl: 0 },
    ),
    accumulatedForGoals: 0,
  };
  analytics.accumulatedForGoals =
    analytics.totals.cumulativeNetBrl + analytics.totals.investedBrl;

  const viewers: TimeViewerResult[] = [];
  for (const ev of bestIncomeEvals) {
    if (!ev.accumulator) continue;
    viewers.push({
      nodeId: ev.entryId,
      label: ev.entryLabel,
      sourceNodeId: ev.entryId,
      sourceLabel: ev.entryLabel,
      months: ev.accumulator.months,
      monthlyNetBrl: ev.netBrlMonth,
      cumulativeNetBrl: ev.accumulator.cumulativeBrl,
    });
  }

  const incomeLabel = buildIncomeLabel(incomes, bestIncomeEvals, consolidatedTimeline);

  return {
    horizonMonths: input.horizonMonths,
    incomeLabel,
    routes: sorted,
    viewers,
    nodeOutputs: {},
    nodeDetails: {},
    nodeMaxDetails: {},
    nodeErrors: {},
    analytics,
    recommendation: {
      bestRouteInstitutionId: best?.institutionId ?? "",
      bestRouteLabel: best?.pathLabel ?? "Plano",
      summary:
        sorted.length > 1
          ? `Melhor rota: ${best?.pathLabel ?? "—"}.`
          : entries.length === 0
            ? "Adicione entradas e saídas para projetar."
            : "Projeção com base nos movimentos cadastrados.",
      deltaVsWorstBrl,
    },
  };
}

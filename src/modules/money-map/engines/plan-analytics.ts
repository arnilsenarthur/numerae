import { convertWithQuote, monthlyAmount } from "@/modules/money-map/engines/conversion";
import type {
  ExpenseCategory,
  MoneyMapNodeInput,
  MonthlyProjection,
  PlanAnalytics,
  PlanCategoryBreakdown,
  PlanLineItem,
  RouteQuote,
} from "@/modules/money-map/engines/types";
import {
  parseExpense,
  parseIncome,
  parseInvestment,
} from "@/modules/money-map/engines/node-eval-core";

function isPlanEntry(node: MoneyMapNodeInput) {
  return (
    (node.type === "INCOME" || node.type === "EXPENSE") &&
    (node.config as { movement?: boolean }).movement !== false
  );
}

const INCOME_CATEGORY_LABELS: Record<string, string> = {
  salary: "Salário",
  business: "Empresa",
  investment: "Investimentos",
  other: "Outros",
};

function categoryLabel(category: string | undefined): string {
  if (!category) return "Outros";
  if (category in INCOME_CATEGORY_LABELS) {
    return INCOME_CATEGORY_LABELS[category]!;
  }
  const expenseLabels = {
    housing: "Moradia",
    food: "Alimentação",
    transport: "Transporte",
    health: "Saúde",
    education: "Educação",
    leisure: "Lazer",
    tax: "Impostos",
    business: "Empresa",
    investment: "Investimento",
    other: "Outros",
  } satisfies Record<ExpenseCategory, string>;
  return expenseLabels[category as ExpenseCategory] ?? category;
}

function findQuoteForCurrency(quotes: RouteQuote[], currency: string): RouteQuote | null {
  if (currency === "BRL") return null;
  return (
    quotes.find((quote) => quote.fromCurrency === currency && quote.toCurrency === "BRL") ??
    quotes[0] ??
    null
  );
}

function toBrl(
  amount: number,
  currency: string,
  quotes: RouteQuote[],
): number {
  if (currency === "BRL") return amount;
  const quote = findQuoteForCurrency(quotes, currency);
  if (!quote) return amount;
  return convertWithQuote(amount, quote).converted;
}

/** Valor em BRL que entra/sai no mês indicado (1-based). */
export function cashFlowInMonth(
  amount: number,
  period: "monthly" | "annual" | "once",
  month: number,
  onceMonth = 1,
): number {
  if (period === "monthly") return amount;
  if (period === "annual") return month % 12 === 0 ? amount : 0;
  if (period === "once") return month === onceMonth ? amount : 0;
  return 0;
}

function buildLineItems(
  nodes: MoneyMapNodeInput[],
  quotes: RouteQuote[],
): PlanLineItem[] {
  const items: PlanLineItem[] = [];

  for (const node of nodes) {
    if (!node.id) continue;

    const serialized = node as MoneyMapNodeInput;

    if (node.type === "INCOME" || node.type === "EXPENSE") {
      if (!isPlanEntry(serialized)) continue;

      if (node.type === "INCOME") {
        const income = parseIncome(node.config);
        const monthlyEq = toBrl(monthlyAmount(income.amount, income.period), income.currency, quotes);
        items.push({
          nodeId: node.id,
          label: node.label ?? "Entrada",
          category: income.category ?? "other",
          kind: "income",
          amount: income.amount,
          currency: income.currency,
          period: income.period,
          onceMonth: income.onceMonth,
          monthlyNative: monthlyAmount(income.amount, income.period),
          monthlyBrl: monthlyEq,
          monthlyEquivalentBrl: monthlyEq,
          converted: income.currency === "BRL" || Boolean(quotes.find((q) => q.fromCurrency === income.currency)),
        });
        continue;
      }

      const expense = parseExpense(node.config);
      const monthlyEq = toBrl(monthlyAmount(expense.amount, expense.period), expense.currency, quotes);
      items.push({
        nodeId: node.id,
        label: node.label ?? "Saída",
        category: expense.category ?? "other",
        kind: "expense",
        amount: expense.amount,
        currency: expense.currency,
        period: expense.period,
        onceMonth: expense.onceMonth,
        monthlyNative: monthlyAmount(expense.amount, expense.period),
        monthlyBrl: monthlyEq,
        monthlyEquivalentBrl: monthlyEq,
        converted: expense.currency === "BRL" || Boolean(quotes.find((q) => q.fromCurrency === expense.currency)),
      });
      continue;
    }

    if (node.type === "INVESTMENT") {
      const parentMovementId = (node.config as { parentMovementId?: string }).parentMovementId;
      if (parentMovementId) continue;
      const inv = parseInvestment(node.config);
      items.push({
        nodeId: node.id,
        label: node.label ?? inv.label ?? "Investimento",
        category: "investment",
        kind: "investment",
        amount: inv.percentOfNet,
        currency: "BRL",
        period: "monthly",
        monthlyNative: inv.percentOfNet,
        monthlyBrl: inv.percentOfNet,
        monthlyEquivalentBrl: inv.percentOfNet,
        converted: true,
      });
    }
  }

  return items;
}

function aggregateByCategory(
  lineItems: PlanLineItem[],
  timeline: MonthlyProjection[],
): PlanCategoryBreakdown[] {
  const map = new Map<string, PlanCategoryBreakdown>();

  for (const item of lineItems) {
    const key = item.category;
    const existing = map.get(key) ?? {
      category: key,
      label: categoryLabel(key),
      incomeBrl: 0,
      expenseBrl: 0,
      netBrl: 0,
    };

    if (item.kind === "income") existing.incomeBrl += item.monthlyEquivalentBrl;
    if (item.kind === "expense") existing.expenseBrl += item.monthlyEquivalentBrl;
    existing.netBrl = existing.incomeBrl - existing.expenseBrl;
    map.set(key, existing);
  }

  if (map.size === 0 && timeline.length > 0) {
    map.set("other", {
      category: "other",
      label: "Outros",
      incomeBrl: timeline.reduce((sum, row) => sum + row.grossBrl, 0) / timeline.length,
      expenseBrl: timeline.reduce((sum, row) => sum + row.expensesBrl, 0) / timeline.length,
      netBrl: timeline.reduce((sum, row) => sum + row.netBrl, 0) / timeline.length,
    });
  }

  return [...map.values()].sort((a, b) => b.expenseBrl + b.incomeBrl - (a.expenseBrl + a.incomeBrl));
}

function totalInvestPercent(nodes: MoneyMapNodeInput[]): number {
  return nodes
    .filter((node) => node.type === "INVESTMENT")
    .reduce((sum, node) => sum + parseInvestment(node.config).percentOfNet, 0);
}

export function buildPlanAnalytics(input: {
  horizonMonths: number;
  nodes: MoneyMapNodeInput[];
  quotes: RouteQuote[];
}): PlanAnalytics {
  const horizonMonths = input.horizonMonths;
  const lineItems = buildLineItems(input.nodes, input.quotes);
  const investPercent = 0;
  const taxRatio = 0;

  const timeline: MonthlyProjection[] = [];
  let cumulative = 0;
  let grossInSource = 0;

  for (let month = 1; month <= horizonMonths; month += 1) {
    let grossBrl = 0;
    let expensesBrl = 0;

    for (const item of lineItems) {
      const flow = cashFlowInMonth(
        item.amount,
        item.period,
        month,
        item.onceMonth ?? 1,
      );
      if (flow === 0) continue;
      const brl = toBrl(flow, item.currency, input.quotes);
      if (item.kind === "income") grossBrl += brl;
      if (item.kind === "expense") expensesBrl += brl;
    }

    if (grossBrl === 0) {
      grossBrl = 0;
    }
    if (expensesBrl === 0) {
      expensesBrl = 0;
    }

    const taxBrl = Math.round(grossBrl * taxRatio * 100) / 100;
    const netBeforeInvest = Math.max(0, grossBrl - expensesBrl - taxBrl);
    const investedBrl = Math.round((netBeforeInvest * investPercent) / 100 * 100) / 100;
    const netBrl = Math.round((netBeforeInvest - investedBrl) * 100) / 100;
    cumulative += netBrl;

    if (month === 1 && grossInSource === 0) {
      grossInSource = grossBrl;
    }

    timeline.push({
      month,
      grossInSource,
      grossBrl,
      taxBrl,
      expensesBrl,
      netBrl,
      investedBrl,
      cumulativeNetBrl: Math.round(cumulative * 100) / 100,
      byCurrency: {
        BRL: { income: grossBrl, expense: expensesBrl, net: grossBrl - expensesBrl },
      },
    });
  }

  const totals = timeline.reduce(
    (acc, row) => ({
      grossBrl: acc.grossBrl + row.grossBrl,
      taxBrl: acc.taxBrl + row.taxBrl,
      expensesBrl: acc.expensesBrl + row.expensesBrl,
      netBrl: acc.netBrl + row.netBrl,
      investedBrl: acc.investedBrl + row.investedBrl,
      cumulativeNetBrl: row.cumulativeNetBrl,
    }),
    {
      grossBrl: 0,
      taxBrl: 0,
      expensesBrl: 0,
      netBrl: 0,
      investedBrl: 0,
      cumulativeNetBrl: 0,
    },
  );

  const accumulatedForGoals = totals.cumulativeNetBrl + totals.investedBrl;

  return {
    horizonMonths,
    timeline,
    lineItems,
    currencies: [...new Set(lineItems.map((item) => item.currency))],
    byCategory: aggregateByCategory(lineItems, timeline),
    totals,
    accumulatedForGoals,
  };
}

export function buildIncomeLabel(nodes: MoneyMapNodeInput[]): string {
  const incomes = nodes.filter((node) => node.type === "INCOME" && isPlanEntry(node));
  if (incomes.length === 0) return "Sem entradas";

  if (incomes.length === 1) {
    const income = parseIncome(incomes[0]!.config);
    const suffix =
      income.period === "monthly" ? "/mês" : income.period === "annual" ? "/ano" : " (única)";
    return `${income.amount.toLocaleString("pt-BR")} ${income.currency}${suffix}`;
  }

  const totalMonthly = incomes.reduce((sum, node) => {
    const income = parseIncome(node.config);
    return sum + monthlyAmount(income.amount, income.period);
  }, 0);

  return `${incomes.length} entradas · ~${totalMonthly.toLocaleString("pt-BR")}/mês`;
}

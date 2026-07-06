import { calculatePjBr } from "@/modules/calculator/engines/br/pj";
import {
  convertWithQuote,
  monthlyAmount,
} from "@/modules/money-map/engines/conversion";
import type {
  ConversionNodeConfig,
  ExpenseNodeConfig,
  IncomeNodeConfig,
  InvestmentNodeConfig,
  MoneyMapNodeInput,
  RouteQuote,
  SimulationResult,
  TaxPjNodeConfig,
} from "@/modules/money-map/engines/types";
import { MONEY_MAP_TEMPLATES } from "@/modules/money-map/engines/types";

export const DEFAULT_COMPARE_INSTITUTIONS = ["inst_wise", "inst_inter", "inst_btg"];

export function createTemplateNodes(templateId: string): MoneyMapNodeInput[] {
  if (templateId === MONEY_MAP_TEMPLATES.PJ_USD_INCOME) {
    return [
      {
        type: "INCOME",
        label: "Receita cliente",
        sortOrder: 0,
        config: {
          amount: 5000,
          currency: "USD",
          period: "monthly",
        } satisfies IncomeNodeConfig,
      },
      {
        type: "CONVERSION",
        label: "Onde receber e converter",
        sortOrder: 1,
        config: {
          institutionIds: DEFAULT_COMPARE_INSTITUTIONS,
          fromCurrency: "USD",
          toCurrency: "BRL",
        } satisfies ConversionNodeConfig,
      },
      {
        type: "TAX_PJ",
        label: "Simples Nacional",
        sortOrder: 2,
        config: {
          taxRatePercent: 6,
          taxRegime: "simples",
        } satisfies TaxPjNodeConfig,
      },
      {
        type: "EXPENSE",
        label: "Contador",
        sortOrder: 3,
        config: {
          amount: 400,
          currency: "BRL",
          period: "monthly",
          label: "Contador",
        } satisfies ExpenseNodeConfig,
      },
      {
        type: "INVESTMENT",
        label: "Reserva / investimento",
        sortOrder: 4,
        config: {
          percentOfNet: 20,
          label: "Investir",
        } satisfies InvestmentNodeConfig,
      },
    ];
  }

  return [
    {
      type: "INCOME",
      label: "Entrada",
      sortOrder: 0,
      config: { amount: 0, currency: "BRL", period: "monthly" } satisfies IncomeNodeConfig,
    },
  ];
}

function getNode<T>(nodes: MoneyMapNodeInput[], type: MoneyMapNodeInput["type"]) {
  return nodes.find((node) => node.type === type);
}

function parseIncome(config: unknown): IncomeNodeConfig {
  const c = config as IncomeNodeConfig;
  return {
    amount: Number(c.amount) || 0,
    currency: c.currency ?? "BRL",
    period: c.period ?? "monthly",
  };
}

function parseConversion(config: unknown): ConversionNodeConfig {
  const c = config as ConversionNodeConfig;
  return {
    institutionIds:
      Array.isArray(c.institutionIds) && c.institutionIds.length > 0
        ? c.institutionIds
        : DEFAULT_COMPARE_INSTITUTIONS,
    fromCurrency: c.fromCurrency ?? "USD",
    toCurrency: c.toCurrency ?? "BRL",
  };
}

function parseTax(config: unknown): TaxPjNodeConfig {
  const c = config as TaxPjNodeConfig;
  return {
    cnpjId: c.cnpjId ?? null,
    taxRatePercent: Number(c.taxRatePercent) || 6,
    taxRegime: c.taxRegime ?? "simples",
    cnaeCode: c.cnpjId ? c.cnaeCode : c.cnaeCode ?? null,
  };
}

function parseExpenses(nodes: MoneyMapNodeInput[]): ExpenseNodeConfig[] {
  return nodes
    .filter((node) => node.type === "EXPENSE")
    .map((node) => {
      const c = node.config as ExpenseNodeConfig;
      return {
        amount: Number(c.amount) || 0,
        currency: c.currency ?? "BRL",
        period: c.period ?? "monthly",
        label: node.label ?? c.label,
      };
    });
}

function parseInvestment(nodes: MoneyMapNodeInput[]): InvestmentNodeConfig | null {
  const node = getNode(nodes, "INVESTMENT");
  if (!node) return null;
  const c = node.config as InvestmentNodeConfig;
  return {
    percentOfNet: Math.min(100, Math.max(0, Number(c.percentOfNet) || 0)),
    label: node.label ?? c.label,
  };
}

function grossBrlFromIncome(income: IncomeNodeConfig, quote: RouteQuote | null) {
  const monthly = monthlyAmount(income.amount, income.period);

  if (income.currency === "BRL") return monthly;
  if (!quote) return 0;

  return convertWithQuote(monthly, quote).converted;
}

function expensesBrlMonthly(expenses: ExpenseNodeConfig[], quote: RouteQuote | null) {
  return expenses.reduce((sum, expense) => {
    const monthly = monthlyAmount(expense.amount, expense.period);
    if (expense.currency === "BRL") return sum + monthly;
    if (!quote || expense.currency !== quote.fromCurrency) return sum + monthly;
    return sum + convertWithQuote(monthly, quote).converted;
  }, 0);
}

export function simulateMoneyMap(input: {
  horizonMonths: number;
  nodes: MoneyMapNodeInput[];
  quotes: RouteQuote[];
}): SimulationResult {
  const incomeNode = getNode(input.nodes, "INCOME");
  const conversionNode = getNode(input.nodes, "CONVERSION");
  const taxNode = getNode(input.nodes, "TAX_PJ");

  const income = parseIncome(incomeNode?.config ?? { amount: 0, currency: "BRL", period: "monthly" });
  const conversion = parseConversion(conversionNode?.config ?? {});
  const tax = parseTax(taxNode?.config ?? { taxRatePercent: 6 });
  const expenses = parseExpenses(input.nodes);
  const investment = parseInvestment(input.nodes);

  const institutionIds =
    conversion.institutionIds.length > 0
      ? conversion.institutionIds
      : input.quotes.map((q) => q.institutionId);

  const quotes = institutionIds
    .map((id) => input.quotes.find((q) => q.institutionId === id))
    .filter((q): q is RouteQuote => Boolean(q));

  if (quotes.length === 0 && income.currency !== "BRL") {
    return {
      horizonMonths: input.horizonMonths,
      incomeLabel: `${income.amount} ${income.currency}/${income.period === "monthly" ? "mês" : "ano"}`,
      routes: [],
      recommendation: {
        bestRouteInstitutionId: "",
        bestRouteLabel: "—",
        summary: "Cadastre taxas de câmbio para comparar rotas.",
        deltaVsWorstBrl: 0,
      },
    };
  }

  const routes = quotes.map((quote) => {
    const monthlyIncomeSource = monthlyAmount(income.amount, income.period);
    const grossBrlMonth = grossBrlFromIncome(income, quote);
    const expenseMonth = expensesBrlMonthly(expenses, quote);

    const monthly = [];
    let cumulative = 0;

    for (let month = 1; month <= input.horizonMonths; month += 1) {
      const pj = calculatePjBr({
        grossRevenue: grossBrlMonth,
        taxRatePercent: tax.taxRatePercent,
        taxRegime: tax.taxRegime ?? "simples",
        cnaeCode: tax.cnaeCode ?? undefined,
      });

      const net = pj.net - expenseMonth;
      const invested = investment ? (net * investment.percentOfNet) / 100 : 0;
      cumulative += net;

      monthly.push({
        month,
        grossInSource: monthlyIncomeSource,
        grossBrl: grossBrlMonth,
        taxBrl: pj.totalDeductions,
        expensesBrl: expenseMonth,
        netBrl: net,
        investedBrl: invested,
        cumulativeNetBrl: cumulative,
      });
    }

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
      institutionId: quote.institutionId,
      institutionName: quote.institutionName,
      quote,
      monthly,
      totals,
    };
  });

  if (income.currency === "BRL" && routes.length === 0) {
    const grossBrlMonth = monthlyAmount(income.amount, income.period);
    const expenseMonth = expensesBrlMonthly(expenses, null);
    const monthly = [];
    let cumulative = 0;

    for (let month = 1; month <= input.horizonMonths; month += 1) {
      const pj = calculatePjBr({
        grossRevenue: grossBrlMonth,
        taxRatePercent: tax.taxRatePercent,
        taxRegime: tax.taxRegime ?? "simples",
        cnaeCode: tax.cnaeCode ?? undefined,
      });
      const net = pj.net - expenseMonth;
      const invested = investment ? (net * investment.percentOfNet) / 100 : 0;
      cumulative += net;
      monthly.push({
        month,
        grossInSource: grossBrlMonth,
        grossBrl: grossBrlMonth,
        taxBrl: pj.totalDeductions,
        expensesBrl: expenseMonth,
        netBrl: net,
        investedBrl: invested,
        cumulativeNetBrl: cumulative,
      });
    }

    routes.push({
      institutionId: "direct-brl",
      institutionName: "Receita em BRL",
      quote: {
        institutionId: "direct-brl",
        institutionName: "Receita em BRL",
        institutionSlug: "direct-brl",
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
    best && worst ? Math.round((best.totals.netBrl - worst.totals.netBrl) * 100) / 100 : 0;

  const incomeLabel = `${income.amount.toLocaleString("pt-BR")} ${income.currency}${
    income.period === "monthly" ? "/mês" : income.period === "annual" ? "/ano" : " (única)"
  }`;

  return {
    horizonMonths: input.horizonMonths,
    incomeLabel,
    routes: sorted,
    recommendation: best
      ? {
          bestRouteInstitutionId: best.institutionId,
          bestRouteLabel: best.institutionName,
          summary:
            sorted.length > 1
              ? `Em ${input.horizonMonths} meses, ${best.institutionName} deixa cerca de R$ ${deltaVsWorstBrl.toLocaleString("pt-BR")} a mais que a pior rota.`
              : `Projeção em ${input.horizonMonths} meses com líquido acumulado de R$ ${Math.round(best.totals.netBrl).toLocaleString("pt-BR")}.`,
          deltaVsWorstBrl,
        }
      : {
          bestRouteInstitutionId: "",
          bestRouteLabel: "—",
          summary: "Configure entradas e rotas para simular.",
          deltaVsWorstBrl: 0,
        },
  };
}

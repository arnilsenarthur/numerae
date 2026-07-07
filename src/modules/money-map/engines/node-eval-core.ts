import { calculatePjToPfBr } from "@/modules/calculator/engines/br/pj-to-pf";
import { calculatePjBr } from "@/modules/calculator/engines/br/pj";
import {
  accumulateDeposits,
  compoundAnnuity,
  compoundLump,
  simpleInterestLump,
} from "@/modules/money-map/engines/financial-math";
import {
  convertWithQuote,
  monthlyAmount,
} from "@/modules/money-map/engines/conversion";
import type {
  ConversionNodeConfig,
  ExpenseNodeConfig,
  IncomeNodeConfig,
  InterestNodeConfig,
  InvestmentNodeConfig,
  MaxValueNodeConfig,
  MaxValueNodeDetail,
  MoneyMapEdgeInput,
  MoneyMapNodeInput,
  MoneyPeriod,
  PjToPfNodeConfig,
  PjToPfNodeDetail,
  RouteQuote,
  SplitNodeConfig,
  TaxPjNodeConfig,
  TimeNodeConfig,
} from "@/modules/money-map/engines/types";
import {
  SOCKET_IN_VALOR,
  SOCKET_OUT_VALOR,
} from "@/modules/money-map/lib/node-definitions";

export type FlowCurrency = "USD" | "BRL" | "EUR";

export type NodeOutputRecord = {
  monthlyAmount: number;
  currency: FlowCurrency;
  period: MoneyPeriod;
  handles?: Record<
    string,
    { monthlyAmount: number; currency: FlowCurrency; period: MoneyPeriod }
  >;
};

export type NodeEvalSideEffects = {
  grossInSource?: number;
  grossBrlMonth?: number;
  taxBrlMonth?: number;
  expenseBrlMonth?: number;
  investedBrlMonth?: number;
  pjToPfDetail?: PjToPfNodeDetail;
  maxDetail?: MaxValueNodeDetail;
  pathStep?: { label: string; monthlyBrl: number };
  quote?: RouteQuote | null;
};

export function parseIncome(config: unknown): IncomeNodeConfig {
  const c = config as IncomeNodeConfig;
  return {
    amount: Number(c.amount) || 0,
    currency: c.currency ?? "BRL",
    period: c.period ?? "monthly",
    category: c.category ?? "other",
    onceMonth: c.onceMonth != null ? Math.max(1, Number(c.onceMonth) || 1) : undefined,
  };
}

export function parseConversion(config: unknown): ConversionNodeConfig {
  const c = config as ConversionNodeConfig;
  const legacyIds = Array.isArray(c.institutionIds) ? c.institutionIds : [];
  return {
    institutionId: c.institutionId ?? legacyIds[0] ?? "",
    fromCurrency: c.fromCurrency ?? "USD",
    toCurrency: c.toCurrency ?? "BRL",
    institutionIds: legacyIds,
  };
}

export function parseTax(config: unknown): TaxPjNodeConfig {
  const c = config as TaxPjNodeConfig;
  return {
    cnpjId: c.companyId ?? c.cnpjId ?? null,
    companyId: c.companyId ?? c.cnpjId ?? null,
    taxRatePercent: Number(c.taxRatePercent) || 6,
    taxRegime: c.taxRegime ?? "simples",
    cnaeCode: c.cnaeCode ?? null,
  };
}

export function parsePjToPf(config: unknown): PjToPfNodeConfig {
  const c = config as PjToPfNodeConfig & { proLaboreMonthly?: number };
  return {
    mode: c.mode === "distribution" ? "distribution" : "full",
    companyId: c.companyId ?? c.cnpjId ?? null,
    cnpjId: c.companyId ?? c.cnpjId ?? null,
    proLaboreOverride:
      c.proLaboreOverride != null
        ? Number(c.proLaboreOverride)
        : c.proLaboreMonthly != null
          ? Number(c.proLaboreMonthly)
          : null,
    payrollMonthly: Math.max(0, Number(c.payrollMonthly) || 0),
    payrollChargesPercent: Math.min(100, Math.max(0, Number(c.payrollChargesPercent) || 20)),
    revenue12Months: c.revenue12Months ? Number(c.revenue12Months) : undefined,
    dependents: Math.max(0, Math.min(20, Number(c.dependents) || 0)),
    taxRatePercent: Number(c.taxRatePercent) || 6,
    taxRegime: c.taxRegime ?? "simples",
    cnaeCode: c.cnaeCode ?? null,
  };
}

export function parseExpense(config: unknown): ExpenseNodeConfig {
  const c = config as ExpenseNodeConfig;
  return {
    amount: Number(c.amount) || 0,
    currency: c.currency ?? "BRL",
    period: c.period ?? "monthly",
    category: c.category ?? "other",
    onceMonth: c.onceMonth != null ? Math.max(1, Number(c.onceMonth) || 1) : undefined,
  };
}

export function parseInvestment(config: unknown): InvestmentNodeConfig {
  const c = config as InvestmentNodeConfig;
  return {
    percentOfNet: Math.min(100, Math.max(0, Number(c.percentOfNet) || 0)),
    annualRatePercent: Math.max(0, Number(c.annualRatePercent) || 0),
    projectionMonths: Math.min(120, Math.max(1, Number(c.projectionMonths) || 12)),
    label: c.label,
  };
}

export function parseSplit(config: unknown): SplitNodeConfig {
  const c = config as SplitNodeConfig;
  const a = Math.max(0, Number(c.branchA) || 50);
  const b = Math.max(0, Number(c.branchB) || 50);
  const total = a + b || 100;
  return { branchA: (a / total) * 100, branchB: (b / total) * 100 };
}

export function parseTime(config: unknown): TimeNodeConfig {
  const c = config as TimeNodeConfig;
  return {
    months: Math.min(120, Math.max(1, Number(c.months) || 12)),
    annualRatePercent: Math.max(0, Number(c.annualRatePercent) || 0),
  };
}

export function parseInterest(config: unknown): InterestNodeConfig {
  const c = config as InterestNodeConfig;
  const mode = c.mode === "simple" || c.mode === "annuity" ? c.mode : "compound";
  return {
    annualRatePercent: Math.max(0, Number(c.annualRatePercent) || 0),
    months: Math.min(120, Math.max(1, Number(c.months) || 12)),
    mode,
  };
}

export function parseMax(config: unknown): MaxValueNodeConfig {
  const c = config as MaxValueNodeConfig;
  return { compareCurrency: c.compareCurrency ?? "BRL" };
}

export function findQuote(
  quotes: RouteQuote[],
  institutionId: string,
  fromCurrency: string,
  toCurrency: string,
): RouteQuote | null {
  return (
    quotes.find(
      (q) =>
        q.institutionId === institutionId &&
        q.fromCurrency === fromCurrency &&
        q.toCurrency === toCurrency,
    ) ?? null
  );
}

export function resolveOutput(
  record: NodeOutputRecord | undefined,
  sourceHandle?: string | null,
): NodeOutputRecord | undefined {
  if (!record) return undefined;
  if (sourceHandle && record.handles?.[sourceHandle]) {
    const handle = record.handles[sourceHandle];
    return {
      monthlyAmount: handle.monthlyAmount,
      currency: handle.currency,
      period: handle.period,
    };
  }
  return record;
}

export function toBrlAmount(
  output: NodeOutputRecord,
  quotes: RouteQuote[],
  quoteHint: RouteQuote | null,
): number {
  const amount = output.monthlyAmount;
  if (output.currency === "BRL") return amount;
  if (quoteHint && output.currency === quoteHint.fromCurrency) {
    return convertWithQuote(amount, quoteHint).converted;
  }
  const direct = quotes.find((q) => q.fromCurrency === output.currency && q.toCurrency === "BRL");
  if (direct) return convertWithQuote(amount, direct).converted;
  return amount;
}

export function incomingMoneyEdges(nodeId: string, edges: MoneyMapEdgeInput[]) {
  return edges.filter(
    (edge) =>
      edge.toNodeId === nodeId &&
      (edge.targetHandle ?? SOCKET_IN_VALOR.id) === SOCKET_IN_VALOR.id,
  );
}

function expenseToBrl(
  expense: ExpenseNodeConfig,
  quote: RouteQuote | null,
): number {
  const monthly = monthlyAmount(expense.amount, expense.period);
  if (expense.currency === "BRL") return monthly;
  if (quote && expense.currency === quote.fromCurrency) {
    return convertWithQuote(monthly, quote).converted;
  }
  return monthly;
}

function taxBaseAmount(
  src: NodeOutputRecord,
  quotes: RouteQuote[],
  quote: RouteQuote | null,
): number {
  const amount =
    src.period === "once"
      ? src.monthlyAmount
      : monthlyAmount(src.monthlyAmount, src.period);
  if (src.currency === "BRL") return amount;
  return toBrlAmount({ ...src, monthlyAmount: amount, period: "monthly" }, quotes, quote);
}

type EvalContext = {
  node: MoneyMapNodeInput & { id: string };
  edges: MoneyMapEdgeInput[];
  outputs: Map<string, NodeOutputRecord>;
  quotes: RouteQuote[];
  quotesByNodeId: Map<string, RouteQuote | null>;
  nodeById: Map<string, MoneyMapNodeInput>;
};

function getSourceOutput(ctx: EvalContext, edgeIndex = 0): {
  output: NodeOutputRecord | undefined;
  quote: RouteQuote | null;
  sourceId: string | undefined;
} {
  const inEdge = incomingMoneyEdges(ctx.node.id, ctx.edges)[edgeIndex];
  if (!inEdge) return { output: undefined, quote: null, sourceId: undefined };
  const output = resolveOutput(
    ctx.outputs.get(inEdge.fromNodeId),
    inEdge.sourceHandle ?? SOCKET_OUT_VALOR.id,
  );
  const quote = ctx.quotesByNodeId.get(inEdge.fromNodeId) ?? null;
  return { output, quote, sourceId: inEdge.fromNodeId };
}

function compareInCurrency(
  output: NodeOutputRecord,
  brl: number,
  compareCurrency: "BRL" | "USD" | "EUR",
  quotes: RouteQuote[],
  quote: RouteQuote | null,
): number {
  if (compareCurrency === "BRL") return brl;
  if (output.currency === compareCurrency) return output.monthlyAmount;
  const viaQuote = quotes.find((q) => q.fromCurrency === "BRL" && q.toCurrency === compareCurrency);
  if (viaQuote) return brl * viaQuote.effectiveRate;
  if (quote && quote.toCurrency === "BRL" && quote.fromCurrency === compareCurrency) {
    return output.monthlyAmount;
  }
  return brl;
}

type AggregateMode = "max" | "min" | "sum";

function evaluateAggregate(
  ctx: EvalContext,
  mode: AggregateMode,
): { output: NodeOutputRecord; effects: NodeEvalSideEffects } | null {
  const inEdges = incomingMoneyEdges(ctx.node.id, ctx.edges);
  type Candidate = {
    sourceId: string;
    sourceLabel: string;
    output: NodeOutputRecord;
    brl: number;
    compare: number;
  };

  const maxCfg = parseMax(ctx.node.config);
  const candidates: Candidate[] = [];

  for (const edge of inEdges) {
    const srcOut = resolveOutput(
      ctx.outputs.get(edge.fromNodeId),
      edge.sourceHandle ?? SOCKET_OUT_VALOR.id,
    );
    if (!srcOut) continue;
    const source = ctx.nodeById.get(edge.fromNodeId);
    const quote = ctx.quotesByNodeId.get(edge.fromNodeId) ?? null;
    const brl = toBrlAmount(srcOut, ctx.quotes, quote);
    candidates.push({
      sourceId: edge.fromNodeId,
      sourceLabel: source?.label ?? edge.fromNodeId,
      output: srcOut,
      brl,
      compare: compareInCurrency(srcOut, brl, maxCfg.compareCurrency ?? "BRL", ctx.quotes, quote),
    });
  }

  if (candidates.length === 0) return null;

  let picked: Candidate;
  let detailLabel: string;

  if (mode === "sum") {
    const totalBrl = candidates.reduce((acc, item) => acc + item.brl, 0);
    picked = {
      ...candidates[0]!,
      output: { monthlyAmount: totalBrl, currency: "BRL", period: "monthly" },
      brl: totalBrl,
      compare: totalBrl,
    };
    detailLabel = `${candidates.length} entradas`;
  } else if (mode === "min") {
    picked = candidates.reduce((acc, item) => (item.compare < acc.compare ? item : acc));
    detailLabel = picked.sourceLabel;
  } else {
    picked = candidates.reduce((acc, item) => (item.compare > acc.compare ? item : acc));
    detailLabel = picked.sourceLabel;
  }

  const effects: NodeEvalSideEffects = {
    grossBrlMonth: picked.brl,
    pathStep: {
      label: ctx.node.label ?? ctx.node.type,
      monthlyBrl: picked.brl,
    },
    quote: ctx.quotesByNodeId.get(picked.sourceId) ?? null,
  };

  if (mode === "max" || mode === "min") {
    effects.maxDetail = {
      winnerNodeId: picked.sourceId,
      winnerLabel: detailLabel,
      winnerAmount: picked.output.monthlyAmount,
      winnerCurrency: picked.output.currency,
      winnerBrl: picked.brl,
      candidateCount: candidates.length,
    };
  }

  return {
    output: {
      monthlyAmount: picked.output.monthlyAmount,
      currency: picked.output.currency,
      period: picked.output.period,
    },
    effects,
  };
}

export function evaluateNode(
  ctx: EvalContext,
): { output: NodeOutputRecord; effects: NodeEvalSideEffects } | null {
  const { node } = ctx;

  switch (node.type) {
    case "INCOME": {
      const income = parseIncome(node.config);
      const amount = monthlyAmount(income.amount, income.period);
      return {
        output: { monthlyAmount: amount, currency: income.currency, period: income.period },
        effects: {
          grossInSource: amount,
          pathStep: {
            label: node.label ?? "Entrada",
            monthlyBrl: income.currency === "BRL" ? amount : 0,
          },
        },
      };
    }
    case "CONVERSION": {
      const conv = parseConversion(node.config);
      const { output: srcOut } = getSourceOutput(ctx);
      let flow = srcOut
        ? { amount: srcOut.monthlyAmount, currency: srcOut.currency }
        : { amount: 0, currency: conv.fromCurrency as FlowCurrency };

      let quote: RouteQuote | null = null;
      if (flow.currency !== conv.toCurrency) {
        quote = findQuote(ctx.quotes, conv.institutionId, flow.currency, conv.toCurrency);
        if (!quote) return null;
        flow = {
          amount: convertWithQuote(flow.amount, quote).converted,
          currency: conv.toCurrency as FlowCurrency,
        };
      }

      return {
        output: { monthlyAmount: flow.amount, currency: flow.currency, period: "monthly" },
        effects: {
          quote,
          grossBrlMonth: flow.currency === "BRL" ? flow.amount : undefined,
          pathStep: {
            label: node.label ?? conv.institutionId,
            monthlyBrl: flow.currency === "BRL" ? flow.amount : 0,
          },
        },
      };
    }
    case "MAX":
      return evaluateAggregate(ctx, "max");
    case "MIN":
      return evaluateAggregate(ctx, "min");
    case "SUM":
      return evaluateAggregate(ctx, "sum");
    case "TAX_PJ": {
      const tax = parseTax(node.config);
      const { output: srcOut, quote } = getSourceOutput(ctx);
      const base = srcOut ? taxBaseAmount(srcOut, ctx.quotes, quote) : 0;
      const pj = calculatePjBr({
        grossRevenue: base,
        taxRatePercent: tax.taxRatePercent,
        taxRegime: tax.taxRegime ?? "simples",
        cnaeCode: tax.cnaeCode ?? undefined,
      });
      return {
        output: { monthlyAmount: pj.net, currency: "BRL", period: srcOut?.period ?? "monthly" },
        effects: {
          taxBrlMonth: pj.totalDeductions,
          grossBrlMonth: base || undefined,
          pathStep: { label: node.label ?? "Imposto PJ", monthlyBrl: pj.net },
        },
      };
    }
    case "PJ_TO_PF": {
      const cfg = parsePjToPf(node.config);
      const { output: srcOut, quote } = getSourceOutput(ctx);
      const base = srcOut ? taxBaseAmount(srcOut, ctx.quotes, quote) : 0;
      const result = calculatePjToPfBr({
        monthlyAmount: base,
        mode: cfg.mode,
        proLaboreOverride: cfg.proLaboreOverride,
        payrollMonthly: cfg.payrollMonthly,
        payrollChargesPercent: cfg.payrollChargesPercent,
        revenue12Months: cfg.revenue12Months,
        dependents: cfg.dependents,
        taxRatePercent: cfg.taxRatePercent,
        cnaeCode: cfg.cnaeCode ?? undefined,
      });
      return {
        output: { monthlyAmount: result.net, currency: "BRL", period: "monthly" },
        effects: {
          taxBrlMonth: result.pjTaxBrl + result.pfTaxBrl,
          grossBrlMonth: cfg.mode === "full" && base ? base : undefined,
          pjToPfDetail: {
            fatorR: result.fatorR,
            fatorRMet: result.fatorRMet,
            proLaboreGross: result.proLaboreGross,
            proLaboreNet: result.proLaboreNet,
            lucrosDistribuidos: result.lucrosDistribuidos,
            pjTaxBrl: result.pjTaxBrl,
            pfTaxBrl: result.pfTaxBrl,
            annex: result.annex,
            strategyLabel: result.optimization.strategyLabel,
            taxSavingsBrl: result.optimization.taxSavingsBrl,
          },
          pathStep: { label: node.label ?? "PJ → PF", monthlyBrl: result.net },
        },
      };
    }
    case "EXPENSE": {
      const expense = parseExpense(node.config);
      const { output: srcOut, quote } = getSourceOutput(ctx);
      const current = srcOut ? taxBaseAmount(srcOut, ctx.quotes, quote) : 0;
      const expenseBrl = expenseToBrl(expense, quote);
      const net = Math.max(0, current - expenseBrl);
      return {
        output: { monthlyAmount: net, currency: "BRL", period: "monthly" },
        effects: {
          expenseBrlMonth: expenseBrl,
          pathStep: { label: node.label ?? "Saída", monthlyBrl: net },
        },
      };
    }
    case "INVESTMENT": {
      const inv = parseInvestment(node.config);
      const { output: srcOut, quote } = getSourceOutput(ctx);
      const base = srcOut ? taxBaseAmount(srcOut, ctx.quotes, quote) : 0;
      const invested = (base * inv.percentOfNet) / 100;
      const available = Math.max(0, base - invested);
      const investedWithGrowth = accumulateDeposits(
        invested,
        inv.projectionMonths ?? 12,
        inv.annualRatePercent ?? 0,
      );

      return {
        output: {
          monthlyAmount: available,
          currency: "BRL",
          period: "monthly",
          handles: {
            "out-invest": {
              monthlyAmount: investedWithGrowth,
              currency: "BRL",
              period: "once",
            },
            "out-livre": {
              monthlyAmount: available,
              currency: "BRL",
              period: "monthly",
            },
          },
        },
        effects: {
          investedBrlMonth: invested,
          pathStep: { label: node.label ?? "Investimento", monthlyBrl: available },
        },
      };
    }
    case "SPLIT": {
      const split = parseSplit(node.config);
      const { output: srcOut } = getSourceOutput(ctx);
      const base = srcOut
        ? srcOut.period === "once"
          ? srcOut.monthlyAmount
          : monthlyAmount(srcOut.monthlyAmount, srcOut.period)
        : 0;
      const currency = srcOut?.currency ?? "BRL";
      const period = srcOut?.period ?? "monthly";
      const aAmount = (base * split.branchA) / 100;
      const bAmount = (base * split.branchB) / 100;

      return {
        output: {
          monthlyAmount: aAmount,
          currency: currency === "BRL" ? "BRL" : currency,
          period,
          handles: {
            "out-a": { monthlyAmount: aAmount, currency, period },
            "out-b": { monthlyAmount: bAmount, currency, period },
          },
        },
        effects: {
          pathStep: { label: node.label ?? "Divisão", monthlyBrl: base },
        },
      };
    }
    case "TIME": {
      const time = parseTime(node.config);
      const { output: srcOut, quote } = getSourceOutput(ctx);
      if (!srcOut) {
        return {
          output: { monthlyAmount: 0, currency: "BRL", period: "once" },
          effects: { pathStep: { label: node.label ?? "Acumulador", monthlyBrl: 0 } },
        };
      }

      const monthly =
        srcOut.period === "once"
          ? srcOut.monthlyAmount / time.months
          : monthlyAmount(srcOut.monthlyAmount, srcOut.period);
      const currency = srcOut.currency;
      const monthlyBrl =
        currency === "BRL" ? monthly : toBrlAmount(
          { monthlyAmount: monthly, currency, period: "monthly" },
          ctx.quotes,
          quote,
        );
      const cumulative = accumulateDeposits(monthly, time.months, time.annualRatePercent);
      const cumulativeBrl =
        currency === "BRL"
          ? cumulative
          : toBrlAmount(
              { monthlyAmount: cumulative, currency, period: "once" },
              ctx.quotes,
              quote,
            );

      return {
        output: {
          monthlyAmount: cumulative,
          currency,
          period: "once",
        },
        effects: {
          pathStep: {
            label: node.label ?? `${time.months} meses`,
            monthlyBrl: cumulativeBrl,
          },
        },
      };
    }
    case "INTEREST": {
      const interest = parseInterest(node.config);
      const { output: srcOut, quote } = getSourceOutput(ctx);
      const principal = srcOut?.monthlyAmount ?? 0;
      const currency = srcOut?.currency ?? "BRL";

      let total = principal;
      if (interest.mode === "annuity") {
        total = compoundAnnuity(principal, interest.annualRatePercent, interest.months);
      } else if (interest.mode === "simple") {
        total = simpleInterestLump(principal, interest.annualRatePercent, interest.months);
      } else {
        total = compoundLump(principal, interest.annualRatePercent, interest.months);
      }

      const totalBrl =
        currency === "BRL"
          ? total
          : toBrlAmount(
              { monthlyAmount: total, currency, period: "once" },
              ctx.quotes,
              quote,
            );

      return {
        output: { monthlyAmount: total, currency, period: "once" },
        effects: {
          pathStep: { label: node.label ?? "Juros", monthlyBrl: totalBrl },
        },
      };
    }
    default:
      return null;
  }
}

export function isAggregateGraphNode(type: MoneyMapNodeInput["type"]) {
  return type === "MAX" || type === "MIN" || type === "SUM";
}

export function usesUnifiedGraphEval(nodes: MoneyMapNodeInput[], edges: MoneyMapEdgeInput[] = []) {
  if (edges.length === 0) return false;
  return (
    nodes.some(
      (node) =>
        isAggregateGraphNode(node.type) ||
        node.type === "SPLIT" ||
        node.type === "INVESTMENT" ||
        node.type === "TIME" ||
        node.type === "INTEREST",
    ) ||
    nodes.filter((node) => node.type === "INCOME").length > 1 ||
    nodes.filter((node) => node.type === "EXPENSE").length > 1
  );
}

export function topologicalOrder(
  nodes: MoneyMapNodeInput[],
  edges: MoneyMapEdgeInput[],
): string[] {
  const ids = nodes.filter((n) => n.id).map((n) => n.id!);
  const inDegree = new Map<string, number>();
  for (const id of ids) inDegree.set(id, 0);
  for (const edge of edges) {
    if (inDegree.has(edge.toNodeId)) {
      inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1);
    }
  }

  const queue = ids.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    outgoing.set(edge.fromNodeId, [...(outgoing.get(edge.fromNodeId) ?? []), edge.toNodeId]);
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const target of outgoing.get(id) ?? []) {
      if (!inDegree.has(target)) continue;
      const next = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, next);
      if (next === 0) queue.push(target);
    }
  }

  return order;
}

export function recordToSimulationOutput(record: NodeOutputRecord) {
  return {
    amount: record.monthlyAmount,
    currency: record.currency,
    period: record.period,
    handles: record.handles
      ? Object.fromEntries(
          Object.entries(record.handles).map(([key, value]) => [
            key,
            { amount: value.monthlyAmount, currency: value.currency, period: value.period },
          ]),
        )
      : undefined,
  };
}

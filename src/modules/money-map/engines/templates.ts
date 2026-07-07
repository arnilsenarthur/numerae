import type {
  ConversionNodeConfig,
  ExpenseNodeConfig,
  IncomeNodeConfig,
  InvestmentNodeConfig,
  MoneyMapEdgeInput,
  MoneyMapNodeInput,
  PjToPfNodeConfig,
  TaxPjNodeConfig,
  TimeNodeConfig,
} from "@/modules/money-map/engines/types";
import { MONEY_MAP_TEMPLATES } from "@/modules/money-map/engines/types";

export const DEFAULT_COMPARE_INSTITUTIONS = ["inst_wise", "inst_inter", "inst_btg"];

const BRANCHES = [
  { key: "wise", institutionId: "inst_wise", label: "Wise", y: 60 },
  { key: "inter", institutionId: "inst_inter", label: "Banco Inter", y: 180 },
  { key: "btg", institutionId: "inst_btg", label: "BTG Pactual", y: 300 },
] as const;

const sharedPjToPf: Omit<PjToPfNodeConfig, "position"> = {
  mode: "full",
  companyId: null,
  proLaboreOverride: null,
  payrollMonthly: 0,
  dependents: 0,
  taxRatePercent: 6,
};

const sharedTime: Omit<TimeNodeConfig, "position"> = {
  months: 12,
  annualRatePercent: 0,
};

/** Plano completo: várias entradas, impostos, gastos variados, investimentos e longo prazo */
function createFullPlanGraph(): {
  nodes: MoneyMapNodeInput[];
  edges: MoneyMapEdgeInput[];
} {
  const incomeMain = "node_income_main";
  const incomeUsd = "node_income_usd";
  const incomeSide = "node_income_side";
  const sumId = "node_sum";
  const taxId = "node_tax";
  const expRent = "node_exp_rent";
  const expInsurance = "node_exp_insurance";
  const expOnce = "node_exp_once";
  const investId = "node_invest";
  const timeShort = "node_time_12";
  const timeLong = "node_time_60";

  const nodes: MoneyMapNodeInput[] = [
    {
      id: incomeMain,
      type: "INCOME",
      label: "Empresa A (BRL)",
      sortOrder: 0,
      config: {
        amount: 15000,
        currency: "BRL",
        period: "monthly",
        category: "business",
        position: { x: 40, y: 80 },
      } satisfies IncomeNodeConfig,
    },
    {
      id: incomeUsd,
      type: "INCOME",
      label: "Empresa B (USD)",
      sortOrder: 1,
      config: {
        amount: 3000,
        currency: "USD",
        period: "monthly",
        category: "business",
        position: { x: 40, y: 200 },
      } satisfies IncomeNodeConfig,
    },
    {
      id: incomeSide,
      type: "INCOME",
      label: "Freelance",
      sortOrder: 2,
      config: {
        amount: 2500,
        currency: "BRL",
        period: "monthly",
        category: "other",
        position: { x: 40, y: 320 },
      } satisfies IncomeNodeConfig,
    },
    {
      id: sumId,
      type: "SUM",
      label: "Total entradas",
      sortOrder: 3,
      config: { compareCurrency: "BRL", position: { x: 260, y: 200 } },
    },
    {
      id: taxId,
      type: "TAX_PJ",
      label: "Imposto PJ",
      sortOrder: 4,
      config: {
        taxRatePercent: 6,
        taxRegime: "simples",
        position: { x: 440, y: 200 },
      } satisfies TaxPjNodeConfig,
    },
    {
      id: expRent,
      type: "EXPENSE",
      label: "Moradia",
      sortOrder: 5,
      config: {
        amount: 3500,
        currency: "BRL",
        period: "monthly",
        category: "housing",
        position: { x: 620, y: 120 },
      } satisfies ExpenseNodeConfig,
    },
    {
      id: expInsurance,
      type: "EXPENSE",
      label: "Seguro anual",
      sortOrder: 6,
      config: {
        amount: 2400,
        currency: "BRL",
        period: "annual",
        category: "health",
        position: { x: 620, y: 200 },
      } satisfies ExpenseNodeConfig,
    },
    {
      id: expOnce,
      type: "EXPENSE",
      label: "Equipamento",
      sortOrder: 7,
      config: {
        amount: 8000,
        currency: "BRL",
        period: "once",
        onceMonth: 3,
        category: "business",
        position: { x: 620, y: 280 },
      } satisfies ExpenseNodeConfig,
    },
    {
      id: investId,
      type: "INVESTMENT",
      label: "Investir 25%",
      sortOrder: 8,
      config: {
        percentOfNet: 25,
        annualRatePercent: 12,
        projectionMonths: 60,
        position: { x: 800, y: 200 },
      } satisfies InvestmentNodeConfig,
    },
    {
      id: timeShort,
      type: "TIME",
      label: "12 meses",
      sortOrder: 9,
      config: { months: 12, annualRatePercent: 0, position: { x: 980, y: 140 } },
    },
    {
      id: timeLong,
      type: "TIME",
      label: "60 meses",
      sortOrder: 10,
      config: { months: 60, annualRatePercent: 10, position: { x: 980, y: 280 } },
    },
  ];

  const edges: MoneyMapEdgeInput[] = [
    { fromNodeId: incomeMain, toNodeId: sumId },
    { fromNodeId: incomeUsd, toNodeId: sumId },
    { fromNodeId: incomeSide, toNodeId: sumId },
    { fromNodeId: sumId, toNodeId: taxId },
    { fromNodeId: taxId, toNodeId: expRent },
    { fromNodeId: expRent, toNodeId: expInsurance },
    { fromNodeId: expInsurance, toNodeId: expOnce },
    { fromNodeId: expOnce, toNodeId: investId },
    { fromNodeId: investId, toNodeId: timeShort, sourceHandle: "out-livre", targetHandle: "in-valor" },
    { fromNodeId: investId, toNodeId: timeLong, sourceHandle: "out-invest", targetHandle: "in-valor" },
  ];

  return { nodes, edges };
}

/** Compara Wise / Inter / BTG → escolhe o maior → otimiza imposto PJ→PF */
function createUsdOptimizeGraph(): {
  nodes: MoneyMapNodeInput[];
  edges: MoneyMapEdgeInput[];
} {
  const incomeId = "node_income";
  const maxId = "node_max";
  const pjPfId = "node_pjpf";
  const timeId = "node_time";

  const nodes: MoneyMapNodeInput[] = [
    {
      id: incomeId,
      type: "INCOME",
      label: "Cliente EUA",
      sortOrder: 0,
      config: {
        amount: 5000,
        currency: "USD",
        period: "monthly",
        position: { x: 40, y: 180 },
      } satisfies IncomeNodeConfig,
    },
    {
      id: maxId,
      type: "MAX",
      label: "Melhor câmbio",
      sortOrder: 4,
      config: { compareCurrency: "BRL", position: { x: 420, y: 180 } },
    },
    {
      id: pjPfId,
      type: "PJ_TO_PF",
      label: "Menos imposto",
      sortOrder: 5,
      config: { ...sharedPjToPf, position: { x: 620, y: 180 } },
    },
    {
      id: timeId,
      type: "TIME",
      label: "12 meses",
      sortOrder: 6,
      config: { ...sharedTime, position: { x: 820, y: 260 } },
    },
  ];

  const edges: MoneyMapEdgeInput[] = [];
  let sortOrder = 1;

  for (const branch of BRANCHES) {
    const convId = `node_conv_${branch.key}`;
    nodes.push({
      id: convId,
      type: "CONVERSION",
      label: branch.label,
      sortOrder: sortOrder++,
      config: {
        institutionId: branch.institutionId,
        fromCurrency: "USD",
        toCurrency: "BRL",
        position: { x: 220, y: branch.y },
      } satisfies ConversionNodeConfig,
    });

    edges.push(
      { fromNodeId: incomeId, toNodeId: convId },
      { fromNodeId: convId, toNodeId: maxId },
    );
  }

  edges.push(
    { fromNodeId: maxId, toNodeId: pjPfId },
    { fromNodeId: pjPfId, toNodeId: timeId },
  );

  return { nodes, edges };
}

/** Grafo com 3 rotas paralelas (Wise, Inter, BTG) a partir de uma entrada USD */
export function createTemplateGraph(templateId: string): {
  nodes: MoneyMapNodeInput[];
  edges: MoneyMapEdgeInput[];
} {
  if (templateId === MONEY_MAP_TEMPLATES.USD_OPTIMIZE) {
    return createUsdOptimizeGraph();
  }

  if (templateId === MONEY_MAP_TEMPLATES.FULL_PLAN) {
    return createFullPlanGraph();
  }

  if (templateId !== MONEY_MAP_TEMPLATES.PJ_USD_INCOME) {
    const incomeId = "node_income";
    return {
      nodes: [
        {
          id: incomeId,
          type: "INCOME",
          label: "Salário",
          sortOrder: 0,
          config: {
            amount: 0,
            currency: "BRL",
            period: "monthly",
            position: { x: 40, y: 160 },
          } satisfies IncomeNodeConfig,
        },
      ],
      edges: [],
    };
  }

  const incomeId = "node_income";
  const nodes: MoneyMapNodeInput[] = [
    {
      id: incomeId,
      type: "INCOME",
      label: "Cliente EUA",
      sortOrder: 0,
      config: {
        amount: 5000,
        currency: "USD",
        period: "monthly",
        position: { x: 40, y: 168 },
      } satisfies IncomeNodeConfig,
    },
  ];

  const edges: MoneyMapEdgeInput[] = [];
  let sortOrder = 1;

  for (const branch of BRANCHES) {
    const convId = `node_conv_${branch.key}`;
    const pjPfId = `node_pjpf_${branch.key}`;
    const expId = `node_exp_${branch.key}`;
    const timeId = `node_time_${branch.key}`;

    nodes.push(
      {
        id: convId,
        type: "CONVERSION",
        label: branch.label,
        sortOrder: sortOrder++,
        config: {
          institutionId: branch.institutionId,
          fromCurrency: "USD",
          toCurrency: "BRL",
          position: { x: 260, y: branch.y },
        } satisfies ConversionNodeConfig,
      },
      {
        id: pjPfId,
        type: "PJ_TO_PF",
        label: "Otimizar PF",
        sortOrder: sortOrder++,
        config: { ...sharedPjToPf, position: { x: 480, y: branch.y } },
      },
      {
        id: expId,
        type: "EXPENSE",
        label: "Contador",
        sortOrder: sortOrder++,
        config: {
          amount: 400,
          currency: "BRL",
          period: "monthly",
          position: { x: 700, y: branch.y },
        },
      },
      {
        id: timeId,
        type: "TIME",
        label: "12 meses",
        sortOrder: sortOrder++,
        config: { ...sharedTime, position: { x: 760, y: branch.y + 110 } },
      },
    );

    edges.push(
      { fromNodeId: incomeId, toNodeId: convId },
      { fromNodeId: convId, toNodeId: pjPfId },
      { fromNodeId: pjPfId, toNodeId: expId },
      { fromNodeId: expId, toNodeId: timeId },
    );
  }

  return { nodes, edges };
}

/** @deprecated use createTemplateGraph */
export function createTemplateNodes(templateId: string): MoneyMapNodeInput[] {
  return createTemplateGraph(templateId).nodes;
}

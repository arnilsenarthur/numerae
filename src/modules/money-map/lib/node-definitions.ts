import type { MoneyMapNodeType } from "@/modules/money-map/engines/types";

export type SocketValueType = "money" | "time";
export type SocketShape = "circle" | "square";

export type NodeSocket = {
  id: string;
  label: string;
  valueType: SocketValueType;
  shape: SocketShape;
  /** Aceita várias conexões de entrada no mesmo socket. */
  multiple?: boolean;
};

export type ParamOptionSource = "currency" | "institution" | "taxRegime" | "cnpj";

export type ParamField = {
  key: string;
  label: string;
  editor: "number" | "select" | "text" | "cnpj";
  options?: { value: string; label: string }[];
  optionSource?: ParamOptionSource;
  /** When set, changing this field also updates the node label (e.g. institution name). */
  syncLabel?: boolean;
};

export type NodeRole = "source" | "transform" | "aggregate" | "viewer";

export const NODE_ROLE_LABELS: Record<NodeRole, string> = {
  source: "Entradas",
  transform: "Transformação",
  aggregate: "Agregação",
  viewer: "Acumuladores",
};

export const NODE_ROLE_ORDER: NodeRole[] = ["source", "transform", "aggregate", "viewer"];

export type NodeDefinition = {
  type: MoneyMapNodeType;
  role: NodeRole;
  label: string;
  description: string;
  className: string;
  defaultLabel: string;
  defaultConfig: Record<string, unknown>;
  inputs: NodeSocket[];
  outputs: NodeSocket[];
  params: ParamField[];
  fallbackWhenDisconnected?: ParamField[];
};

export const SOCKET_IN_VALOR: NodeSocket = {
  id: "in-valor",
  label: "Valor",
  valueType: "money",
  shape: "circle",
};

export const SOCKET_OUT_VALOR: NodeSocket = {
  id: "out-valor",
  label: "Valor",
  valueType: "money",
  shape: "circle",
};

export const SOCKET_IN_TEMPO: NodeSocket = {
  id: "in-tempo",
  label: "Tempo",
  valueType: "time",
  shape: "square",
};

export const SOCKET_OUT_A: NodeSocket = {
  id: "out-a",
  label: "A",
  valueType: "money",
  shape: "circle",
};

export const SOCKET_OUT_B: NodeSocket = {
  id: "out-b",
  label: "B",
  valueType: "money",
  shape: "circle",
};

export const SOCKET_OUT_INVEST: NodeSocket = {
  id: "out-invest",
  label: "Invest.",
  valueType: "money",
  shape: "circle",
};

export const SOCKET_OUT_LIVRE: NodeSocket = {
  id: "out-livre",
  label: "Livre",
  valueType: "money",
  shape: "circle",
};

export const PERIOD_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "annual", label: "Anual" },
  { value: "once", label: "Única" },
] as const;

export const EXPENSE_CATEGORY_OPTIONS = [
  { value: "housing", label: "Moradia" },
  { value: "food", label: "Alimentação" },
  { value: "transport", label: "Transporte" },
  { value: "health", label: "Saúde" },
  { value: "education", label: "Educação" },
  { value: "leisure", label: "Lazer" },
  { value: "tax", label: "Impostos" },
  { value: "business", label: "Empresa" },
  { value: "investment", label: "Investimento" },
  { value: "other", label: "Outros" },
] as const;

export const INCOME_CATEGORY_OPTIONS = [
  { value: "salary", label: "Salário" },
  { value: "business", label: "Empresa" },
  { value: "investment", label: "Investimentos" },
  { value: "other", label: "Outros" },
] as const;

export const INTEREST_MODE_OPTIONS = [
  { value: "compound", label: "Composto" },
  { value: "simple", label: "Simples" },
  { value: "annuity", label: "Aportes mensais" },
] as const;

export const ACTIVE_NODE_TYPES: MoneyMapNodeType[] = [
  "INCOME",
  "EXPENSE",
  "CONVERSION",
  "TAX_PJ",
  "PJ_TO_PF",
  "INTEREST",
  "INVESTMENT",
  "SPLIT",
  "MAX",
  "MIN",
  "SUM",
  "TIME",
];

export const ACTIVE_NODE_TYPES_BY_ROLE: Record<NodeRole, MoneyMapNodeType[]> = {
  source: ["INCOME"],
  transform: [
    "CONVERSION",
    "TAX_PJ",
    "PJ_TO_PF",
    "EXPENSE",
    "INTEREST",
    "INVESTMENT",
    "SPLIT",
  ],
  aggregate: ["MAX", "MIN", "SUM"],
  viewer: ["TIME"],
};

export const NODE_DEFINITIONS: Record<MoneyMapNodeType, NodeDefinition> = {
  INCOME: {
    type: "INCOME",
    role: "source",
    label: "Entrada",
    description: "Valor que entra (qtd + moeda)",
    className: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40",
    defaultLabel: "Salário",
    defaultConfig: { amount: 5000, currency: "USD", period: "monthly" },
    inputs: [],
    outputs: [SOCKET_OUT_VALOR],
    params: [
      { key: "amount", label: "Valor", editor: "number" },
      { key: "currency", label: "Moeda", editor: "select", optionSource: "currency" },
      {
        key: "period",
        label: "Período",
        editor: "select",
        options: [...PERIOD_OPTIONS],
      },
      {
        key: "category",
        label: "Categoria",
        editor: "select",
        options: [...INCOME_CATEGORY_OPTIONS],
      },
      { key: "onceMonth", label: "Mês (única)", editor: "number" },
    ],
  },
  EXPENSE: {
    type: "EXPENSE",
    role: "transform",
    label: "Saída",
    description: "Subtrai um custo fixo",
    className: "border-rose-500 bg-rose-50 dark:bg-rose-950/40",
    defaultLabel: "Despesa",
    defaultConfig: { amount: 400, currency: "BRL", period: "monthly" },
    inputs: [SOCKET_IN_VALOR],
    outputs: [SOCKET_OUT_VALOR],
    params: [
      { key: "amount", label: "Custo", editor: "number" },
      { key: "currency", label: "Moeda", editor: "select", optionSource: "currency" },
      {
        key: "period",
        label: "Período",
        editor: "select",
        options: [...PERIOD_OPTIONS],
      },
      {
        key: "category",
        label: "Categoria",
        editor: "select",
        options: [...EXPENSE_CATEGORY_OPTIONS],
      },
      { key: "onceMonth", label: "Mês (única)", editor: "number" },
    ],
    fallbackWhenDisconnected: [
      { key: "fallbackAmount", label: "Saldo", editor: "number" },
      { key: "fallbackCurrency", label: "Moeda", editor: "select", optionSource: "currency" },
    ],
  },
  CONVERSION: {
    type: "CONVERSION",
    role: "transform",
    label: "Conversão",
    description: "Troca moeda via instituição",
    className: "border-sky-500 bg-sky-50 dark:bg-sky-950/40",
    defaultLabel: "Wise",
    defaultConfig: {
      institutionId: "inst_wise",
      fromCurrency: "USD",
      toCurrency: "BRL",
    },
    inputs: [SOCKET_IN_VALOR],
    outputs: [SOCKET_OUT_VALOR],
    params: [
      {
        key: "institutionId",
        label: "Inst.",
        editor: "select",
        optionSource: "institution",
        syncLabel: true,
      },
      { key: "toCurrency", label: "Para", editor: "select", optionSource: "currency" },
    ],
    fallbackWhenDisconnected: [
      { key: "fallbackAmount", label: "Valor", editor: "number" },
      { key: "fallbackCurrency", label: "Moeda", editor: "select", optionSource: "currency" },
    ],
  },
  TAX_PJ: {
    type: "TAX_PJ",
    role: "transform",
    label: "Imposto PJ",
    description: "Tributação sobre receita",
    className: "border-amber-500 bg-amber-50 dark:bg-amber-950/40",
    defaultLabel: "Simples Nacional",
    defaultConfig: { taxRatePercent: 6, taxRegime: "simples", companyId: null },
    inputs: [SOCKET_IN_VALOR],
    outputs: [SOCKET_OUT_VALOR],
    params: [
      { key: "companyId", label: "Empresa", editor: "cnpj", optionSource: "cnpj" },
      { key: "taxRegime", label: "Regime", editor: "select", optionSource: "taxRegime" },
      { key: "taxRatePercent", label: "Alíquota %", editor: "number" },
    ],
    fallbackWhenDisconnected: [
      { key: "fallbackAmount", label: "Receita", editor: "number" },
      { key: "fallbackCurrency", label: "Moeda", editor: "select", optionSource: "currency" },
    ],
  },
  PJ_TO_PF: {
    type: "PJ_TO_PF",
    role: "transform",
    label: "PJ → PF",
    description: "Otimiza pró-labore (Fator R) para pagar menos imposto",
    className: "border-teal-500 bg-teal-50 dark:bg-teal-950/40",
    defaultLabel: "Otimizar PF",
    defaultConfig: {
      mode: "full",
      companyId: null,
      proLaboreOverride: null,
      payrollMonthly: 0,
      payrollChargesPercent: 20,
      dependents: 0,
      taxRatePercent: 6,
    },
    inputs: [SOCKET_IN_VALOR],
    outputs: [{ ...SOCKET_OUT_VALOR, label: "PF" }],
    params: [
      { key: "companyId", label: "Empresa", editor: "cnpj", optionSource: "cnpj" },
      { key: "payrollMonthly", label: "Folha", editor: "number" },
      { key: "dependents", label: "Dep.", editor: "number" },
    ],
    fallbackWhenDisconnected: [
      { key: "fallbackAmount", label: "Valor", editor: "number" },
      { key: "fallbackCurrency", label: "Moeda", editor: "select", optionSource: "currency" },
    ],
  },
  MAX: {
    type: "MAX",
    role: "aggregate",
    label: "Máximo",
    description: "Escolhe o maior valor entre várias entradas",
    className: "border-violet-500 bg-violet-50 dark:bg-violet-950/40",
    defaultLabel: "Melhor opção",
    defaultConfig: { compareCurrency: "BRL" },
    inputs: [{ ...SOCKET_IN_VALOR, label: "Opções", multiple: true }],
    outputs: [SOCKET_OUT_VALOR],
    params: [
      { key: "compareCurrency", label: "Comparar em", editor: "select", optionSource: "currency" },
    ],
  },
  MIN: {
    type: "MIN",
    role: "aggregate",
    label: "Mínimo",
    description: "Escolhe o menor valor entre várias entradas",
    className: "border-violet-400 bg-violet-50 dark:bg-violet-950/30",
    defaultLabel: "Pior opção",
    defaultConfig: { compareCurrency: "BRL" },
    inputs: [{ ...SOCKET_IN_VALOR, label: "Opções", multiple: true }],
    outputs: [SOCKET_OUT_VALOR],
    params: [
      { key: "compareCurrency", label: "Comparar em", editor: "select", optionSource: "currency" },
    ],
  },
  SUM: {
    type: "SUM",
    role: "aggregate",
    label: "Soma",
    description: "Soma várias entradas (ex.: várias rendas)",
    className: "border-violet-600 bg-violet-50 dark:bg-violet-950/40",
    defaultLabel: "Total",
    defaultConfig: { compareCurrency: "BRL" },
    inputs: [{ ...SOCKET_IN_VALOR, label: "Entradas", multiple: true }],
    outputs: [SOCKET_OUT_VALOR],
    params: [],
  },
  TIME: {
    type: "TIME",
    role: "viewer",
    label: "Acumulador",
    description: "Total após N meses (com juros opcional)",
    className: "border-dashed border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/30",
    defaultLabel: "12 meses",
    defaultConfig: { months: 12, annualRatePercent: 0 },
    inputs: [SOCKET_IN_VALOR],
    outputs: [SOCKET_OUT_VALOR],
    params: [
      { key: "months", label: "Meses", editor: "number" },
      { key: "annualRatePercent", label: "Juros %/ano", editor: "number" },
    ],
  },
  INTEREST: {
    type: "INTEREST",
    role: "transform",
    label: "Juros",
    description: "Aplica juros simples, compostos ou aportes mensais",
    className: "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/40",
    defaultLabel: "Rendimento",
    defaultConfig: { annualRatePercent: 10, months: 12, mode: "compound" },
    inputs: [SOCKET_IN_VALOR],
    outputs: [SOCKET_OUT_VALOR],
    params: [
      { key: "annualRatePercent", label: "Taxa %/ano", editor: "number" },
      { key: "months", label: "Meses", editor: "number" },
      {
        key: "mode",
        label: "Modo",
        editor: "select",
        options: [...INTEREST_MODE_OPTIONS],
      },
    ],
    fallbackWhenDisconnected: [
      { key: "fallbackAmount", label: "Capital", editor: "number" },
      { key: "fallbackCurrency", label: "Moeda", editor: "select", optionSource: "currency" },
    ],
  },
  INVESTMENT: {
    type: "INVESTMENT",
    role: "transform",
    label: "Investimento",
    description: "Separa % para investir e o restante livre",
    className: "border-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/40",
    defaultLabel: "Investir",
    defaultConfig: { percentOfNet: 20, annualRatePercent: 10, projectionMonths: 12 },
    inputs: [SOCKET_IN_VALOR],
    outputs: [SOCKET_OUT_INVEST, SOCKET_OUT_LIVRE],
    params: [
      { key: "percentOfNet", label: "% alocar", editor: "number" },
      { key: "annualRatePercent", label: "Rend. %/ano", editor: "number" },
      { key: "projectionMonths", label: "Meses proj.", editor: "number" },
    ],
    fallbackWhenDisconnected: [
      { key: "fallbackAmount", label: "Base", editor: "number" },
      { key: "fallbackCurrency", label: "Moeda", editor: "select", optionSource: "currency" },
    ],
  },
  SPLIT: {
    type: "SPLIT",
    role: "transform",
    label: "Divisão",
    description: "Divide o valor em dois ramos (%, ex.: gastos vs reserva)",
    className: "border-zinc-500 bg-zinc-50 dark:bg-zinc-900/40",
    defaultLabel: "Divisão",
    defaultConfig: { branchA: 70, branchB: 30 },
    inputs: [SOCKET_IN_VALOR],
    outputs: [SOCKET_OUT_A, SOCKET_OUT_B],
    params: [
      { key: "branchA", label: "Ramo A %", editor: "number" },
      { key: "branchB", label: "Ramo B %", editor: "number" },
    ],
    fallbackWhenDisconnected: [
      { key: "fallbackAmount", label: "Valor", editor: "number" },
      { key: "fallbackCurrency", label: "Moeda", editor: "select", optionSource: "currency" },
    ],
  },
};

export function nodeRole(type: MoneyMapNodeType): NodeRole {
  return NODE_DEFINITIONS[type].role;
}

export function isViewerNode(type: MoneyMapNodeType) {
  return nodeRole(type) === "viewer";
}

/** Nodes whose edges render as dashed (read-mostly projection). */
export function isProjectionEdgeTarget(type: MoneyMapNodeType) {
  return type === "TIME";
}

export function getSocket(
  type: MoneyMapNodeType,
  handleId: string | null | undefined,
  side: "input" | "output",
): NodeSocket | null {
  const def = NODE_DEFINITIONS[type];
  const list = side === "input" ? def.inputs : def.outputs;
  return list.find((socket) => socket.id === handleId) ?? null;
}

export type FlowEdgeRef = {
  fromNodeId: string;
  toNodeId: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export function canConnectSockets(
  sourceType: MoneyMapNodeType,
  sourceHandle: string | null | undefined,
  targetType: MoneyMapNodeType,
  targetHandle: string | null | undefined,
  edges: FlowEdgeRef[],
  sourceId: string,
  targetId: string,
  ignoreEdgeId?: string,
): boolean {
  if (sourceId === targetId) return false;

  const outSocket = getSocket(sourceType, sourceHandle ?? SOCKET_OUT_VALOR.id, "output");
  const inSocket = getSocket(targetType, targetHandle ?? SOCKET_IN_VALOR.id, "input");
  if (!outSocket || !inSocket) return false;
  if (outSocket.valueType !== inSocket.valueType) return false;

  const duplicate = edges.some(
    (edge) =>
      edge.fromNodeId === sourceId &&
      edge.toNodeId === targetId &&
      (edge.sourceHandle ?? SOCKET_OUT_VALOR.id) === outSocket.id &&
      (edge.targetHandle ?? SOCKET_IN_VALOR.id) === inSocket.id,
  );
  if (duplicate) return false;

  const targetInUse =
    !inSocket.multiple &&
    edges.some(
      (edge) =>
        edge.toNodeId === targetId &&
        (edge.targetHandle ?? SOCKET_IN_VALOR.id) === inSocket.id &&
        edge.fromNodeId !== sourceId,
    );
  if (targetInUse) return false;

  return true;
}

export function formatIncomeOutput(config: Record<string, unknown>) {
  const amount = Number(config.amount) || 0;
  const currency = String(config.currency ?? "BRL");
  return formatMoneyValue(amount, currency);
}

export function formatMoneyValue(amount: number, currency: string) {
  return `${amount.toLocaleString("pt-BR")} ${currency}`;
}

export function edgeIdForConnection(
  sourceId: string,
  sourceHandle: string,
  targetId: string,
  targetHandle: string,
) {
  return `${sourceId}:${sourceHandle}->${targetId}:${targetHandle}`;
}

export function handleShapeClass(shape: SocketShape) {
  return shape === "circle"
    ? "!rounded-full !h-[10px] !w-[10px]"
    : "!rounded-[2px] !h-[10px] !w-[10px]";
}

import type { MoneyPeriod } from "@/modules/money-map/engines/types";

export type EntryKind = "INCOME" | "EXPENSE";
export type EntrySource = "manual" | "open_finance";

export type ConversionTreatment = {
  id: string;
  type: "conversion";
  institutionIds: string[];
  fromCurrency: "USD" | "BRL" | "EUR";
  toCurrency: "USD" | "BRL" | "EUR";
};

export type TaxPjTreatment = {
  id: string;
  type: "tax_pj";
  taxRatePercent: number;
  taxRegime: "simples" | "presumido" | "manual";
  companyId?: string | null;
  cnaeCode?: string | null;
};

export type InvestmentTreatment = {
  id: string;
  type: "investment";
  percentOfNet: number;
  annualRatePercent?: number;
};

export type AccumulatorTreatment = {
  id: string;
  type: "accumulator";
  months: number;
  annualRatePercent?: number;
};

export type PlanTreatment =
  | ConversionTreatment
  | TaxPjTreatment
  | InvestmentTreatment
  | AccumulatorTreatment;

export type PlanEntryConfig = {
  amount: number;
  currency: "USD" | "BRL" | "EUR";
  period: MoneyPeriod;
  category: string;
  onceMonth?: number;
  movement: true;
  source: EntrySource;
  treatments: PlanTreatment[];
  /** Valor realizado (Open Finance / manual futuro) */
  actualAmount?: number | null;
};

export const TREATMENT_TYPE_LABELS: Record<PlanTreatment["type"], string> = {
  conversion: "Conversão de moeda",
  tax_pj: "Imposto PJ",
  investment: "Investir % do líquido",
  accumulator: "Acumular no tempo",
};

export type TreatmentPresetId =
  | "compare-conversion"
  | "tax-and-invest"
  | "tax-only"
  | "invest-only";

export type TreatmentDraft =
  | Omit<ConversionTreatment, "id">
  | Omit<TaxPjTreatment, "id">
  | Omit<InvestmentTreatment, "id">
  | Omit<AccumulatorTreatment, "id">;

export type TreatmentPreset = {
  id: TreatmentPresetId;
  title: string;
  description: string;
  incomeOnly?: boolean;
  treatments: TreatmentDraft[];
};

export const TREATMENT_PRESETS: TreatmentPreset[] = [
  {
    id: "compare-conversion",
    title: "Comparar conversão",
    description: "Escolha instituições — a simulação compara rotas.",
    incomeOnly: true,
    treatments: [
      {
        type: "conversion",
        institutionIds: [],
        fromCurrency: "USD",
        toCurrency: "BRL",
      },
    ],
  },
  {
    id: "tax-only",
    title: "Imposto PJ",
    description: "Aplica imposto sobre o valor convertido.",
    incomeOnly: true,
    treatments: [{ type: "tax_pj", taxRatePercent: 0, taxRegime: "manual" }],
  },
  {
    id: "invest-only",
    title: "Investir parte",
    description: "Separa % do líquido para investimento.",
    incomeOnly: true,
    treatments: [{ type: "investment", percentOfNet: 0, annualRatePercent: 0 }],
  },
  {
    id: "tax-and-invest",
    title: "Imposto + investimento",
    description: "Encadeia imposto PJ e investimento do restante.",
    incomeOnly: true,
    treatments: [
      { type: "tax_pj", taxRatePercent: 0, taxRegime: "manual" },
      { type: "investment", percentOfNet: 0, annualRatePercent: 0 },
    ],
  },
];

export function newTreatmentId() {
  return `tr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTreatment(partial: TreatmentDraft & { id?: string }): PlanTreatment {
  return { ...partial, id: partial.id ?? newTreatmentId() } as PlanTreatment;
}

export function parseTreatments(raw: unknown): PlanTreatment[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (item): item is Record<string, unknown> =>
        Boolean(item && typeof item === "object" && "type" in item),
    )
    .map((item) => ({
      ...item,
      id: typeof item.id === "string" && item.id ? item.id : newTreatmentId(),
    })) as PlanTreatment[];
}

export function defaultEntryConfig(
  kind: EntryKind,
  overrides?: Partial<{
    label: string;
    amount: number;
    currency: string;
    period: MoneyPeriod;
    category: string;
  }>,
): PlanEntryConfig & { label: string } {
  return {
    label: overrides?.label ?? (kind === "INCOME" ? "Entrada" : "Saída"),
    amount: overrides?.amount ?? 0,
    currency: (overrides?.currency as PlanEntryConfig["currency"]) ?? "BRL",
    period: overrides?.period ?? "once",
    category: overrides?.category ?? "other",
    movement: true,
    source: "manual",
    treatments: [],
  };
}

export function applyTreatmentPreset(
  existing: PlanTreatment[],
  presetId: TreatmentPresetId,
): PlanTreatment[] {
  const preset = TREATMENT_PRESETS.find((item) => item.id === presetId);
  if (!preset) return existing;
  const added = preset.treatments.map((t) => createTreatment(t));
  return [...existing, ...added];
}

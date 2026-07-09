/** Tabelas fiscais de referência — Brasil 2025. Atualizar anualmente. */

export const TAX_YEAR_BR = 2025;

export type SimplesRange = {
  maxRevenue: number;
  nominalRate: number;
  deduction: number;
};

export const SIMPLES_ANNEX_III: SimplesRange[] = [
  { maxRevenue: 180_000, nominalRate: 0.06, deduction: 0 },
  { maxRevenue: 360_000, nominalRate: 0.112, deduction: 9_360 },
  { maxRevenue: 720_000, nominalRate: 0.135, deduction: 17_640 },
  { maxRevenue: 1_800_000, nominalRate: 0.16, deduction: 35_640 },
  { maxRevenue: 3_600_000, nominalRate: 0.21, deduction: 125_640 },
  { maxRevenue: 4_800_000, nominalRate: 0.33, deduction: 648_000 },
];

export const SIMPLES_ANNEX_V: SimplesRange[] = [
  { maxRevenue: 180_000, nominalRate: 0.155, deduction: 0 },
  { maxRevenue: 360_000, nominalRate: 0.18, deduction: 4_500 },
  { maxRevenue: 720_000, nominalRate: 0.195, deduction: 9_900 },
  { maxRevenue: 1_800_000, nominalRate: 0.205, deduction: 17_100 },
  { maxRevenue: 3_600_000, nominalRate: 0.23, deduction: 62_100 },
  { maxRevenue: 4_800_000, nominalRate: 0.305, deduction: 540_000 },
];

export const MEI_DAS_MONTHLY = 75.9;
export const MEI_ANNUAL_LIMIT = 81_000;

/** INSS sobre pró-labore do sócio/administrador (11%, com teto). */
export const PROLABORE_INSS_RATE = 0.11;
export const PROLABORE_INSS_CEILING = 7_786.02;

/** IRPF mensal sobre pró-labore (tabela 2025). */
export const PROLABORE_IRPF_BRACKETS = [
  { max: 2_259.2, rate: 0, deduction: 0 },
  { max: 2_826.65, rate: 0.075, deduction: 169.44 },
  { max: 3_751.05, rate: 0.15, deduction: 381.44 },
  { max: 4_664.68, rate: 0.225, deduction: 662.77 },
  { max: Infinity, rate: 0.275, deduction: 896 },
] as const;

/** Lucro presumido — serviços (32% de presunção). */
export const LUCRO_PRESUMIDO = {
  presumptionRate: 0.32,
  irpjRate: 0.15,
  irpjSurchargeThreshold: 240_000,
  irpjSurchargeRate: 0.1,
  csllRate: 0.09,
  pisRate: 0.0065,
  cofinsRate: 0.03,
  issRate: 0.05,
} as const;

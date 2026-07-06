import { z } from "zod";

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{3,8}$/, "Use código de moeda (ex: USD, USDT).");

export const institutionSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido.")
    .optional(),
  type: z.enum(["BANK", "FINTECH", "BROKER", "REMITTANCE", "EXCHANGE", "OTHER"]),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use código de país ISO (ex: BR)."),
  website: z.string().trim().url("URL inválida.").optional().or(z.literal("")),
  logoUrl: z.string().trim().url("URL da logo inválida.").optional().or(z.literal("")),
  brandColor: z
    .string()
    .trim()
    .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, "Use cor hex (#RRGGBB).")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
});

export const institutionUpdateSchema = institutionSchema.partial();

export const exchangeRateSchema = z.object({
  fromCurrency: currencyCode,
  toCurrency: currencyCode,
  rate: z.number().positive("Taxa deve ser maior que zero."),
  spreadPercent: z.number().min(0).max(100).default(0),
  feeFixed: z.number().min(0).optional().nullable(),
  feePercent: z.number().min(0).max(100).optional().nullable(),
  notes: z.string().trim().max(300).optional(),
  active: z.boolean().optional(),
});

export const exchangeRateUpdateSchema = exchangeRateSchema.partial();

export type InstitutionInput = z.infer<typeof institutionSchema>;
export type ExchangeRateInput = z.infer<typeof exchangeRateSchema>;

export const institutionProductSchema = z.object({
  name: z.string().trim().min(2, "Nome obrigatório.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido.")
    .optional(),
  kind: z.enum(["CHECKING", "SAVINGS", "INVESTMENT", "CREDIT", "PAYMENT", "OTHER"]),
  currencyCode: currencyCode.optional().nullable().or(z.literal("")),
  description: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
});

export const institutionProductUpdateSchema = institutionProductSchema.partial();

export type InstitutionProductInput = z.infer<typeof institutionProductSchema>;

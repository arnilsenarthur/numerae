import { z } from "zod";

const countryCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}$/, "Use código ISO de 2 letras (ex: BR).");

export const countrySchema = z.object({
  code: countryCode,
  name: z.string().trim().min(2, "Nome obrigatório.").max(120),
  active: z.boolean().optional(),
});

export const countryUpdateSchema = countrySchema.omit({ code: true }).partial().extend({
  code: countryCode.optional(),
});

const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{3,8}$/, "Use código de moeda (ex: USD, USDT).");

export const currencySchema = z.object({
  code: currencyCode,
  name: z.string().trim().min(2, "Nome obrigatório.").max(120),
  countryCode: countryCode,
  symbol: z.string().trim().max(8).optional().nullable().or(z.literal("")),
  usdRate: z.union([z.null(), z.coerce.number().positive()]).optional(),
  usdRateTtlSeconds: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});

export const currencyUpdateSchema = currencySchema.partial();

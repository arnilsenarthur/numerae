import { z } from "zod";

export const createBudgetSchema = z.object({
  category: z.string().trim().min(1, "Informe a categoria").max(40),
  amount: z.number().positive("Valor deve ser positivo"),
  currencyCode: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .transform((v) => v.toUpperCase())
    .default("BRL"),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export const userPreferenceSchema = z.object({
  showDailyTip: z.boolean().optional(),
  defaultCurrency: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .transform((v) => v.toUpperCase())
    .optional(),
  language: z.string().trim().min(2).max(10).optional(),
});

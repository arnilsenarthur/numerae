import { z } from "zod";
import { resolveAppLocale } from "@/i18n/locales";
import type { TipCategory } from "@/types/tips";

const tipCategoryValues = [
  "saving",
  "taxes",
  "investing",
  "timing",
  "general",
] as const satisfies readonly TipCategory[];

const tipCategory = z.enum(tipCategoryValues);

const sourceUrl = z
  .string()
  .trim()
  .url("Informe uma URL válida para a fonte.")
  .max(500);

const sourceLabel = z
  .string()
  .trim()
  .min(2, "Descrição da fonte obrigatória.")
  .max(160);

export const tipSchema = z.object({
  quote: z.string().trim().min(8, "A dica deve ter pelo menos 8 caracteres.").max(500),
  author: z.string().trim().min(2, "Autor obrigatório.").max(120),
  category: tipCategory.optional(),
  locale: z
    .string()
    .trim()
    .transform((value) => resolveAppLocale(value))
    .optional(),
  sourceUrl,
  sourceLabel,
  active: z.boolean().optional(),
});

export const tipUpdateSchema = tipSchema.partial();

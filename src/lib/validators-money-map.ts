import { z } from "zod";

const periodSchema = z.enum(["monthly", "annual", "once"]);
const currencySchema = z.enum(["USD", "BRL", "EUR"]);

const nodeSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["INCOME", "CONVERSION", "TAX_PJ", "EXPENSE", "INVESTMENT", "SPLIT"]),
  label: z.string().trim().max(120).nullable().optional(),
  sortOrder: z.number().int().min(0),
  config: z.record(z.string(), z.unknown()),
});

export const moneyMapCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  templateId: z.string().trim().optional().nullable(),
  horizonMonths: z.number().int().min(1).max(120).default(12),
  nodes: z.array(nodeSchema).min(1),
});

export const moneyMapUpdateSchema = moneyMapCreateSchema.partial();

export const moneyMapSimulateSchema = z.object({
  mapId: z.string().optional(),
  horizonMonths: z.number().int().min(1).max(120).optional(),
  nodes: z.array(nodeSchema).optional(),
});

export type MoneyMapCreateInput = z.infer<typeof moneyMapCreateSchema>;
export type MoneyMapSimulateInput = z.infer<typeof moneyMapSimulateSchema>;

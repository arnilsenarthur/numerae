import { z } from "zod";

const periodSchema = z.enum(["monthly", "annual", "once"]);
const currencySchema = z.enum(["USD", "BRL", "EUR"]);

const nodeSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["INCOME", "CONVERSION", "TAX_PJ", "PJ_TO_PF", "MAX", "MIN", "SUM", "EXPENSE", "INVESTMENT", "SPLIT", "INTEREST", "TIME"]),
  label: z.string().trim().max(120).nullable().optional(),
  sortOrder: z.number().int().min(0),
  config: z.record(z.string(), z.unknown()),
});

const edgeSchema = z.object({
  id: z.string().optional(),
  fromNodeId: z.string().min(1),
  toNodeId: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const moneyMapCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  templateId: z.string().trim().optional().nullable(),
  horizonMonths: z.number().int().min(1).max(120).default(12),
  viewMode: z.enum(["simple", "advanced"]).optional(),
  nodes: z.array(nodeSchema).default([]),
  edges: z.array(edgeSchema).default([]),
});

export const moneyMapUpdateSchema = moneyMapCreateSchema.partial();

export const moneyMapSimulateSchema = z.object({
  mapId: z.string().optional(),
  horizonMonths: z.number().int().min(1).max(120).optional(),
  nodes: z.array(nodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
});

export type MoneyMapCreateInput = z.infer<typeof moneyMapCreateSchema>;
export type MoneyMapSimulateInput = z.infer<typeof moneyMapSimulateSchema>;

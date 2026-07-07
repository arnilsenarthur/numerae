import { z } from "zod";

const currencySchema = z.enum(["BRL", "USD", "EUR"]);

export const goalCategorySchema = z.enum([
  "reserve",
  "travel",
  "investment",
  "purchase",
  "debt",
  "other",
]);

export const createGoalSchema = z.object({
  title: z.string().trim().min(2).max(120),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  currency: currencySchema.default("BRL"),
  deadline: z.string().datetime().optional().nullable(),
  category: goalCategorySchema.default("other"),
  moneyMapId: z.string().optional().nullable(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

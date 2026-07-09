import { z } from "zod";

export const accountKindSchema = z.enum([
  "CHECKING",
  "SAVINGS",
  "INVESTMENT",
  "CREDIT_CARD",
  "CASH",
  "OTHER",
]);

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da conta").max(80),
  kind: accountKindSchema.default("CHECKING"),
  currencyCode: z.string().trim().min(2).max(8).transform((v) => v.toUpperCase()),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase())
    .default("BR"),
  institutionId: z.string().trim().optional().nullable(),
  initialBalance: z.number().finite().default(0),
  creditLimit: z.number().positive().optional().nullable(),
  color: z.string().trim().max(16).optional().nullable(),
  icon: z.string().trim().max(32).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  archived: z.boolean().optional(),
});

export const transactionKindSchema = z.enum(["INCOME", "EXPENSE", "TRANSFER"]);

export const createTransactionSchema = z
  .object({
    accountId: z.string().trim().min(1, "Informe a conta"),
    kind: transactionKindSchema,
    amount: z.number().positive("Valor deve ser positivo"),
    category: z.string().trim().max(40).default("other"),
    description: z.string().trim().min(1, "Informe uma descrição").max(160),
    icon: z.string().trim().max(32).optional().nullable(),
    date: z.coerce.date(),
    counterAccountId: z.string().trim().optional().nullable(),
    counterAmount: z.number().positive().optional().nullable(),
    planEntryId: z.string().trim().optional().nullable(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "TRANSFER" && !data.counterAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Transferência exige conta de destino.",
        path: ["counterAccountId"],
      });
    }
    if (data.kind === "TRANSFER" && data.counterAccountId === data.accountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Conta de destino deve ser diferente da origem.",
        path: ["counterAccountId"],
      });
    }
  });

export const updateTransactionSchema = z.object({
  accountId: z.string().trim().min(1).optional(),
  kind: transactionKindSchema.optional(),
  amount: z.number().positive().optional(),
  category: z.string().trim().max(40).optional(),
  description: z.string().trim().min(1).max(160).optional(),
  icon: z.string().trim().max(32).optional().nullable(),
  date: z.coerce.date().optional(),
  counterAccountId: z.string().trim().optional().nullable(),
  counterAmount: z.number().positive().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const recurrenceTypeSchema = z.enum([
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "BIMONTHLY",
  "QUARTERLY",
  "YEARLY",
]);

const recurringBaseSchema = z.object({
  accountId: z.string().trim().min(1, "Informe a conta"),
  kind: transactionKindSchema,
  amount: z.number().positive("Valor deve ser positivo"),
  category: z.string().trim().max(40).default("other"),
  description: z.string().trim().min(1, "Informe uma descrição").max(160),
  icon: z.string().trim().max(32).optional().nullable(),
  recurrence: recurrenceTypeSchema.default("MONTHLY"),
  dayOfPeriod: z.number().int().min(1).max(31).default(1),
  nextDueAt: z.coerce.date(),
  endAt: z.coerce.date().optional().nullable(),
  counterAccountId: z.string().trim().optional().nullable(),
  counterAmount: z.number().positive().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const createRecurringSchema = recurringBaseSchema.superRefine((data, ctx) => {
  if (data.kind === "TRANSFER" && !data.counterAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Transferência exige conta de destino.",
      path: ["counterAccountId"],
    });
  }
});

export const updateRecurringSchema = recurringBaseSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createInvestmentPlanSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do plano").max(80),
  currencyCode: z.string().trim().min(2).max(8).transform((v) => v.toUpperCase()).default("BRL"),
  initialAmount: z.number().min(0).default(0),
  monthlyDeposit: z.number().min(0).default(0),
  horizonMonths: z.number().int().min(1).max(600).default(60),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"]).default("moderate"),
  targetAmount: z.number().positive().optional().nullable(),
});

export const updateInvestmentPlanSchema = createInvestmentPlanSchema.partial().extend({
  active: z.boolean().optional(),
});

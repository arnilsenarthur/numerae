import { z } from "zod";
import { isValidCnpj, stripCnpj } from "@/lib/cnpj";

export const companyRegistrationKindSchema = z.enum([
  "CNPJ",
  "EIN",
  "VAT_ID",
  "COMPANY_NUMBER",
  "OTHER",
]);

export const taxRegimeSchema = z.enum(["simples", "presumido", "manual"]);

const companySchemaBase = z.object({
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  label: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(120),
  legalName: z.string().trim().max(160).optional().nullable(),
  registrationId: z.string().trim().min(2, "Informe o identificador fiscal").max(64),
  registrationKind: companyRegistrationKindSchema.optional(),
  activityCode: z.string().trim().max(32).optional().nullable(),
  activityDescription: z.string().trim().max(200).optional().nullable(),
  taxRate: z.number().min(0).max(100),
  taxRegime: taxRegimeSchema.default("simples"),
  isDefault: z.boolean().optional(),
});

type CompanySchemaInput = z.infer<typeof companySchemaBase>;

function refineRegistrationId(
  data: Pick<CompanySchemaInput, "countryCode" | "registrationId" | "registrationKind">,
  ctx: z.RefinementCtx,
) {
  const kind = data.registrationKind ?? defaultRegistrationKind(data.countryCode);

  if (kind === "CNPJ") {
    const digits = stripCnpj(data.registrationId);
    if (!isValidCnpj(digits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CNPJ inválido.",
        path: ["registrationId"],
      });
    }
  }
}

export const createCompanySchema = companySchemaBase.superRefine((data, ctx) => {
  refineRegistrationId(data, ctx);
});

export const updateCompanySchema = companySchemaBase.partial().superRefine((data, ctx) => {
  if (!data.registrationId || !data.countryCode) return;
  refineRegistrationId(
    {
      countryCode: data.countryCode,
      registrationId: data.registrationId,
      registrationKind: data.registrationKind,
    },
    ctx,
  );
});

export function normalizeRegistrationId(
  registrationId: string,
  kind: z.infer<typeof companyRegistrationKindSchema>,
) {
  if (kind === "CNPJ") return stripCnpj(registrationId);
  return registrationId.replace(/\s+/g, " ").trim();
}

export function defaultRegistrationKind(countryCode: string) {
  switch (countryCode) {
    case "BR":
      return "CNPJ" as const;
    case "US":
      return "EIN" as const;
    case "GB":
    case "DE":
    case "FR":
    case "PT":
    case "EU":
      return "VAT_ID" as const;
    default:
      return "OTHER" as const;
  }
}

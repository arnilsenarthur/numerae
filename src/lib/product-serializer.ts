export type SerializedInstitutionProduct = {
  id: string;
  institutionId: string;
  name: string;
  slug: string;
  kind: string;
  currencyCode: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type InstitutionProductRecord = {
  id: string;
  institutionId: string;
  name: string;
  slug: string;
  kind: string;
  currencyCode: string | null;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function serializeInstitutionProduct(
  record: InstitutionProductRecord,
): SerializedInstitutionProduct {
  return {
    id: record.id,
    institutionId: record.institutionId,
    name: record.name,
    slug: record.slug,
    kind: record.kind,
    currencyCode: record.currencyCode,
    description: record.description,
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export const INSTITUTION_PRODUCT_KINDS = [
  { value: "CHECKING", label: "Conta corrente" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "CREDIT", label: "Crédito" },
  { value: "PAYMENT", label: "Pagamentos" },
  { value: "OTHER", label: "Outro" },
] as const;

export function institutionProductKindLabel(kind: string) {
  return INSTITUTION_PRODUCT_KINDS.find((item) => item.value === kind)?.label ?? kind;
}

export const institutionProductKindOptions = INSTITUTION_PRODUCT_KINDS.map((item) => ({
  key: item.value,
  value: item.value,
  label: item.label,
}));

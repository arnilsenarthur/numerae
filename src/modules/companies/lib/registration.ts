import type { CompanyRegistrationKind, TaxRegime } from "@/types/user-company";
import type { SelectOption } from "@/components/ui/select";

export type RegistrationFieldMeta = {
  kind: CompanyRegistrationKind;
  label: string;
  placeholder: string;
  hint?: string;
};

const REGISTRATION_BY_COUNTRY: Record<string, RegistrationFieldMeta> = {
  BR: {
    kind: "CNPJ",
    label: "CNPJ",
    placeholder: "00.000.000/0000-00",
    hint: "Consulta automática de CNAE e razão social.",
  },
  US: {
    kind: "EIN",
    label: "EIN",
    placeholder: "XX-XXXXXXX",
    hint: "Employer Identification Number.",
  },
  GB: {
    kind: "VAT_ID",
    label: "Company number / VAT",
    placeholder: "12345678",
  },
  DE: {
    kind: "VAT_ID",
    label: "USt-IdNr / Handelsregister",
    placeholder: "DE123456789",
  },
  PT: {
    kind: "VAT_ID",
    label: "NIF / NIPC",
    placeholder: "123456789",
  },
  EU: {
    kind: "VAT_ID",
    label: "VAT ID",
    placeholder: "EU123456789",
  },
};

export function registrationMetaForCountry(countryCode: string): RegistrationFieldMeta {
  return (
    REGISTRATION_BY_COUNTRY[countryCode] ?? {
      kind: "OTHER",
      label: "ID fiscal / registro",
      placeholder: "Número de registro da empresa",
      hint: "Use o identificador oficial do país.",
    }
  );
}

export const TAX_REGIME_OPTIONS: SelectOption[] = [
  { value: "simples", label: "Simples Nacional" },
  { value: "presumido", label: "Lucro Presumido" },
  { value: "manual", label: "Manual / outro" },
];

export const GLOBAL_TAX_REGIME_OPTIONS: SelectOption[] = [
  { value: "manual", label: "Alíquota manual" },
  { value: "simples", label: "Regime simplificado" },
  { value: "presumido", label: "Regime presumido" },
];

export function taxRegimeOptionsForCountry(countryCode: string): SelectOption[] {
  return countryCode === "BR" ? TAX_REGIME_OPTIONS : GLOBAL_TAX_REGIME_OPTIONS;
}

export function taxRegimeLabel(regime: TaxRegime, countryCode: string): string {
  const options = taxRegimeOptionsForCountry(countryCode);
  return options.find((option) => option.value === regime)?.label ?? regime;
}

export const REGISTRATION_KIND_OPTIONS: SelectOption[] = [
  { value: "CNPJ", label: "CNPJ (Brasil)" },
  { value: "EIN", label: "EIN (EUA)" },
  { value: "VAT_ID", label: "VAT / NIF" },
  { value: "COMPANY_NUMBER", label: "Company number" },
  { value: "OTHER", label: "Outro" },
];

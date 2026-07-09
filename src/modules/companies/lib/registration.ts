import type { CompanyRegistrationKind, TaxRegime } from "@/types/user-company";
import type { SelectOption } from "@/components/ui/select";
import type { TranslateFn } from "@/i18n/translate";

export type RegistrationFieldMeta = {
  kind: CompanyRegistrationKind;
  label: string;
  placeholder: string;
  hint?: string;
};

const REGISTRATION_COUNTRY_KEYS = ["BR", "US", "GB", "DE", "PT", "EU"] as const;

export function registrationMetaForCountry(
  countryCode: string,
  t: TranslateFn,
): RegistrationFieldMeta {
  const key = REGISTRATION_COUNTRY_KEYS.includes(
    countryCode as (typeof REGISTRATION_COUNTRY_KEYS)[number],
  )
    ? countryCode
    : null;

  if (key) {
    const hintKey = `companies.ui.form.registration.${key}.hint`;
    const hint =
      key === "BR" || key === "US"
        ? t(hintKey)
        : undefined;
    return {
      kind:
        key === "BR"
          ? "CNPJ"
          : key === "US"
            ? "EIN"
            : "VAT_ID",
      label: t(`companies.ui.form.registration.${key}.label`),
      placeholder: t(`companies.ui.form.registration.${key}.placeholder`),
      hint,
    };
  }

  return {
    kind: "OTHER",
    label: t("companies.ui.form.registration.fallback.label"),
    placeholder: t("companies.ui.form.registration.fallback.placeholder"),
    hint: t("companies.ui.form.registration.fallback.hint"),
  };
}

export function taxRegimeOptionsForCountry(countryCode: string, t: TranslateFn): SelectOption[] {
  if (countryCode === "BR") {
    return [
      { value: "simples", label: t("companies.ui.form.taxRegime.simples") },
      { value: "presumido", label: t("companies.ui.form.taxRegime.presumido") },
      { value: "manual", label: t("companies.ui.form.taxRegime.manual") },
    ];
  }
  return [
    { value: "manual", label: t("companies.ui.form.taxRegime.globalManual") },
    { value: "simples", label: t("companies.ui.form.taxRegime.globalSimples") },
    { value: "presumido", label: t("companies.ui.form.taxRegime.globalPresumido") },
  ];
}

export function taxRegimeLabel(regime: TaxRegime, countryCode: string, t: TranslateFn): string {
  const options = taxRegimeOptionsForCountry(countryCode, t);
  return options.find((option) => option.value === regime)?.label ?? regime;
}

export function registrationKindOptions(t: TranslateFn): SelectOption[] {
  return ["CNPJ", "EIN", "VAT_ID", "COMPANY_NUMBER", "OTHER"].map((value) => ({
    value,
    label: t(`companies.ui.form.registrationKind.${value}`),
  }));
}

import type { CompanyRegistrationKind, SavedCompany, SavedCnpj } from "@/types/user-company";

type CompanyRecord = {
  id: string;
  countryCode: string;
  label: string;
  legalName: string | null;
  registrationId: string;
  registrationKind: CompanyRegistrationKind;
  activityCode: string | null;
  activityDescription: string | null;
  taxRegime: string;
  taxRate: { toNumber(): number } | number;
  isDefault: boolean;
};

function readTaxRate(taxRate: CompanyRecord["taxRate"]) {
  return typeof taxRate === "number" ? taxRate : taxRate.toNumber();
}

export function serializeCompany(record: CompanyRecord): SavedCompany {
  return {
    id: record.id,
    countryCode: record.countryCode,
    label: record.label,
    legalName: record.legalName,
    registrationId: record.registrationId,
    registrationKind: record.registrationKind,
    activityCode: record.activityCode,
    activityDescription: record.activityDescription,
    taxRegime: record.taxRegime as SavedCompany["taxRegime"],
    taxRate: readTaxRate(record.taxRate),
    isDefault: record.isDefault,
  };
}

export function toLegacyCnpjShape(company: SavedCompany): SavedCnpj {
  return {
    ...company,
    cnpj: company.registrationId,
    cnaeCode: company.activityCode,
    cnaeDescription: company.activityDescription,
  };
}

export function serializeCompanyAsCnpj(record: CompanyRecord): SavedCnpj {
  return toLegacyCnpjShape(serializeCompany(record));
}

export type CompanyRegistrationKind =
  | "CNPJ"
  | "EIN"
  | "VAT_ID"
  | "COMPANY_NUMBER"
  | "OTHER";

export type TaxRegime = "simples" | "presumido" | "manual";

export type SavedCompany = {
  id: string;
  countryCode: string;
  label: string;
  legalName: string | null;
  registrationId: string;
  registrationKind: CompanyRegistrationKind;
  activityCode: string | null;
  activityDescription: string | null;
  taxRegime: TaxRegime;
  taxRate: number;
  isDefault: boolean;
};

/** @deprecated Use SavedCompany — kept for calculator / legacy UI fields */
export type SavedCnpj = SavedCompany & {
  cnpj: string;
  cnaeCode: string | null;
  cnaeDescription: string | null;
};

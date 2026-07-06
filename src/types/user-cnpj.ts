export type SavedCnpj = {
  id: string;
  cnpj: string;
  label: string;
  cnaeCode: string | null;
  cnaeDescription: string | null;
  taxRegime: string;
  taxRate: number;
  isDefault: boolean;
};

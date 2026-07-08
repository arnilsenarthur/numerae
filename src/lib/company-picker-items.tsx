import { IconBuilding } from "@/components/ui/icons";
import type { RegistryPickerItem } from "@/components/ui/registry-picker";
import { formatCnpj } from "@/lib/cnpj";
import { getCountryFlagUrl } from "@/lib/country-flags";
import type { SavedCompany } from "@/types/user-company";

export const MANUAL_COMPANY_ID = "__manual__";

export function formatCompanyDescription(company: SavedCompany) {
  const registration =
    company.countryCode === "BR" && company.registrationKind === "CNPJ"
      ? formatCnpj(company.registrationId)
      : company.registrationId;

  const regime =
    company.taxRegime === "simples"
      ? "Simples"
      : company.taxRegime === "presumido"
        ? "Presumido"
        : "Manual";

  return `${registration} · ${regime} · ${company.taxRate.toLocaleString("pt-BR")}%`;
}

export function buildCompanyPickerItems(companies: SavedCompany[]): RegistryPickerItem[] {
  return companies.map((company) => {
    const flag = getCountryFlagUrl(company.countryCode, 40);

    return {
      id: company.id,
      label: company.label,
      description: formatCompanyDescription(company),
      image: flag ?? undefined,
      icon: flag ? undefined : <IconBuilding size="sm" />,
    };
  });
}

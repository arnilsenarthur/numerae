"use client";

import { useMemo } from "react";
import {
  RegistryPicker,
} from "@/components/ui/registry-picker";
import { IconPercent } from "@/components/ui/icons";
import {
  MANUAL_COMPANY_ID,
  buildCompanyPickerItems,
} from "@/lib/company-picker-items";
import type { SavedCompany } from "@/types/user-company";
import { useT } from "@/i18n/locale-provider";

type CompanyPickerProps = {
  companies: SavedCompany[];
  loading?: boolean;
  valueId: string | null;
  onSelect: (company: SavedCompany | null) => void;
  label?: string;
  placeholder?: string;
  allowManual?: boolean;
  className?: string;
  menuZIndex?: number;
};

export function CompanyPicker({
  companies,
  loading,
  valueId,
  onSelect,
  label,
  placeholder,
  allowManual = true,
  className,
  menuZIndex,
}: CompanyPickerProps) {
  const t = useT();
  const resolvedLabel = label ?? t("ui.pickers.company.label");
  const resolvedPlaceholder = placeholder ?? t("ui.pickers.company.placeholder");
  const items = useMemo(() => buildCompanyPickerItems(companies), [companies]);

  function handleSelect(id: string) {
    if (id === MANUAL_COMPANY_ID) {
      onSelect(null);
      return;
    }

    onSelect(companies.find((company) => company.id === id) ?? null);
  }

  const resolvedValueId =
    valueId === null || valueId === MANUAL_COMPANY_ID ? MANUAL_COMPANY_ID : valueId;

  return (
    <RegistryPicker
      label={resolvedLabel}
      placeholder={resolvedPlaceholder}
      items={items}
      valueId={resolvedValueId}
      onSelect={handleSelect}
      loading={loading}
      className={className}
      menuZIndex={menuZIndex}
      searchPlaceholder={t("ui.pickers.company.search")}
      emptyMessage={t("ui.pickers.company.empty")}
      specialOptions={
        allowManual
          ? [
              {
                id: MANUAL_COMPANY_ID,
                label: t("ui.pickers.company.manual"),
                description: t("ui.pickers.company.manualDescription"),
                icon: <IconPercent size="sm" />,
              },
            ]
          : undefined
      }
    />
  );
}

export { MANUAL_COMPANY_ID };

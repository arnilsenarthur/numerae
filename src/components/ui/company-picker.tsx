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
  label = "Empresa",
  placeholder = "Selecione a empresa…",
  allowManual = true,
  className,
  menuZIndex,
}: CompanyPickerProps) {
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
      label={label}
      placeholder={placeholder}
      items={items}
      valueId={resolvedValueId}
      onSelect={handleSelect}
      loading={loading}
      className={className}
      menuZIndex={menuZIndex}
      searchPlaceholder="Buscar empresa ou registro…"
      emptyMessage="Nenhuma empresa cadastrada."
      specialOptions={
        allowManual
          ? [
              {
                id: MANUAL_COMPANY_ID,
                label: "Inserir manualmente",
                description: "Sem vincular a uma empresa cadastrada",
                icon: <IconPercent size="sm" />,
              },
            ]
          : undefined
      }
    />
  );
}

export { MANUAL_COMPANY_ID };

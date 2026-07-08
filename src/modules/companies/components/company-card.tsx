"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IconPencil, IconTrash } from "@/components/ui/icons";
import { getCountryFlagUrl } from "@/lib/country-flags";
import { formatCnpj } from "@/lib/cnpj";
import {
  registrationMetaForCountry,
  taxRegimeLabel,
} from "@/modules/companies/lib/registration";
import type { SavedCompany } from "@/types/user-company";

function formatRegistration(company: SavedCompany) {
  if (company.registrationKind === "CNPJ") {
    return formatCnpj(company.registrationId);
  }
  return company.registrationId;
}

type CompanyCardProps = {
  company: SavedCompany;
  countryName: string;
  deleting?: boolean;
  onEdit: () => void;
  onDelete: () => void;
};

export function CompanyCard({
  company,
  countryName,
  deleting,
  onEdit,
  onDelete,
}: CompanyCardProps) {
  const meta = registrationMetaForCountry(company.countryCode);
  const regime = taxRegimeLabel(company.taxRegime, company.countryCode);
  const activity =
    company.activityCode || company.activityDescription
      ? [company.activityCode, company.activityDescription].filter(Boolean).join(" — ")
      : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 pb-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getCountryFlagUrl(company.countryCode)}
                  alt={company.countryCode}
                  className="h-full w-full object-cover"
                />
              </span>
              <CardTitle className="truncate text-sm">{company.label}</CardTitle>
              {company.isDefault ? (
                <Badge variant="success" className="shrink-0 text-[10px]">
                  Padrão
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 truncate pl-8 text-[10px] text-zinc-400">
              {countryName}
              {company.legalName && company.legalName !== company.label
                ? ` · ${company.legalName}`
                : ""}
            </p>
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px]">
            {company.countryCode}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5 px-3 pb-2 pt-0">
        <div>
          <p className="text-[10px] text-zinc-500">Alíquota efetiva</p>
          <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
            {company.taxRate.toLocaleString("pt-BR")}%
          </p>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-500">{meta.label}</p>
            <p className="truncate font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {formatRegistration(company)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] text-zinc-500">Regime</p>
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{regime}</p>
          </div>
        </div>

        {activity ? <p className="truncate text-[11px] text-zinc-400">{activity}</p> : null}
      </CardContent>

      <div className="flex gap-1.5 border-t border-zinc-100 p-2 dark:border-zinc-800">
        <Button type="button" variant="secondary" size="sm" className="flex-1" onClick={onEdit}>
          <IconPencil size="xs" />
          Editar
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="flex-1"
          loading={deleting}
          onClick={onDelete}
        >
          <IconTrash size="xs" />
          Remover
        </Button>
      </div>
    </Card>
  );
}

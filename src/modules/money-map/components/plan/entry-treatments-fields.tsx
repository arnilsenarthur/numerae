"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MultiSelect, Select } from "@/components/ui";
import { NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RegistryPicker,
  type RegistryPickerItem,
} from "@/components/ui/registry-picker";
import { IconBuilding, IconPercent } from "@/components/ui/icons";
import { formatCnpj } from "@/lib/cnpj";
import type { SavedCompany } from "@/types/user-company";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IconPlus, IconX } from "@/components/ui/icons";
import { evaluateEntryPipeline } from "@/modules/money-map/engines/treatment-eval";
import type { MoneyPeriod, RouteQuote } from "@/modules/money-map/engines/types";
import type { MoneyMapCatalogData } from "@/modules/money-map/hooks/use-money-map-catalog";
import { formatEntryAmount } from "@/modules/money-map/components/plan/plan-timeline-table";
import {
  TREATMENT_TYPE_LABELS,
  createTreatment,
  type PlanEntryConfig,
  type PlanTreatment,
  type TaxPjTreatment,
} from "@/modules/money-map/plan/entry-types";

const CURRENCY_OPTIONS = [
  { value: "BRL", label: "BRL" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
];

const MANUAL_COMPANY_ID = "__manual__";

function formatCompanyDescription(company: SavedCompany) {
  const registration =
    company.countryCode === "BR" && company.registrationKind === "CNPJ"
      ? formatCnpj(company.registrationId)
      : company.registrationId;
  return `${registration} · ${company.taxRate.toLocaleString("pt-BR")}%`;
}

function buildCompanyPickerItems(companies: SavedCompany[]): RegistryPickerItem[] {
  return companies.map((company) => ({
    id: company.id,
    label: company.label,
    description: formatCompanyDescription(company),
    icon: <IconBuilding size="sm" />,
  }));
}

type EntryTreatmentsFieldsProps = {
  treatments: PlanTreatment[];
  onChange: (treatments: PlanTreatment[]) => void;
  entryLabel: string;
  entryAmount: number;
  entryCurrency: PlanEntryConfig["currency"];
  entryPeriod: MoneyPeriod;
  catalog: MoneyMapCatalogData;
  quotes?: RouteQuote[];
};

export function EntryTreatmentsFields({
  treatments,
  onChange,
  entryLabel,
  entryAmount,
  entryCurrency,
  entryPeriod,
  catalog,
  quotes = [],
}: EntryTreatmentsFieldsProps) {
  const companyPickerItems = useMemo(
    () => buildCompanyPickerItems(catalog.companies),
    [catalog.companies],
  );

  const preview = useMemo(() => {
    const config: PlanEntryConfig = {
      amount: entryAmount,
      currency: entryCurrency,
      period: entryPeriod,
      category: "other",
      movement: true,
      source: "manual",
      treatments,
    };
    const institutionId = treatments.find((t) => t.type === "conversion")?.institutionIds[0] ?? "direct";
    return evaluateEntryPipeline({
      entryId: "preview",
      entryLabel,
      config,
      treatments,
      quotes,
      institutionId,
      horizonMonths: 12,
    });
  }, [treatments, entryAmount, entryCurrency, entryPeriod, entryLabel, quotes]);

  function updateTreatment(id: string, patch: Partial<PlanTreatment>) {
    onChange(treatments.map((item) => (item.id === id ? ({ ...item, ...patch } as PlanTreatment) : item)));
  }

  function removeTreatment(id: string) {
    onChange(treatments.filter((item) => item.id !== id));
  }

  function moveTreatment(id: string, direction: -1 | 1) {
    const index = treatments.findIndex((item) => item.id === id);
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= treatments.length) return;
    const copy = [...treatments];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item!);
    onChange(copy);
  }

  function addTreatment(type: PlanTreatment["type"]) {
    switch (type) {
      case "conversion":
        onChange([
          ...treatments,
          createTreatment({
            type: "conversion",
            institutionIds: [],
            fromCurrency: entryCurrency,
            toCurrency: "BRL",
          }),
        ]);
        break;
      case "tax_pj":
        onChange([
          ...treatments,
          createTreatment({
            type: "tax_pj",
            taxRatePercent: 0,
            taxRegime: "manual",
            companyId: null,
          }),
        ]);
        break;
      case "investment":
        onChange([
          ...treatments,
          createTreatment({ type: "investment", percentOfNet: 0, annualRatePercent: 0 }),
        ]);
        break;
      case "accumulator":
        onChange([
          ...treatments,
          createTreatment({ type: "accumulator", months: 12, annualRatePercent: 0 }),
        ]);
        break;
    }
  }

  function applyCompany(treatment: TaxPjTreatment, companyId: string) {
    if (!companyId) {
      updateTreatment(treatment.id, { companyId: null });
      return;
    }
    const company = catalog.companies.find((item) => item.id === companyId);
    updateTreatment(treatment.id, {
      companyId,
      taxRatePercent: company?.taxRate ?? treatment.taxRatePercent,
      taxRegime: company?.taxRegime ?? treatment.taxRegime,
      cnaeCode: company?.activityCode ?? null,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Otimizações</p>
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="secondary" size="sm" onClick={() => addTreatment("conversion")}>
            <IconPlus size="sm" /> Conversão
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => addTreatment("tax_pj")}>
            <IconPlus size="sm" /> Imposto PJ
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => addTreatment("investment")}>
            <IconPlus size="sm" /> Investimento
          </Button>
        </div>
      </div>

      {treatments.length === 0 ? (
        <p className="text-sm text-zinc-500">Opcional — encadeie conversão, imposto ou investimento.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Configuração</TableHead>
              <TableHead className="w-24 text-right">Ordem</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {treatments.map((treatment, index) => (
              <TableRow key={treatment.id}>
                <TableCell className="text-zinc-500">{index + 1}</TableCell>
                <TableCell className="whitespace-nowrap font-medium">
                  {TREATMENT_TYPE_LABELS[treatment.type]}
                </TableCell>
                <TableCell>
                  <TreatmentFields
                    treatment={treatment}
                    catalog={catalog}
                    companyPickerItems={companyPickerItems}
                    onCompanyChange={(companyId) =>
                      treatment.type === "tax_pj" && applyCompany(treatment, companyId)
                    }
                    onChange={(patch) => updateTreatment(treatment.id, patch)}
                  />
                </TableCell>
                <TableCell align="right">
                  <div className="flex justify-end gap-0.5">
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveTreatment(treatment.id, -1)}>
                      ↑
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => moveTreatment(treatment.id, 1)}>
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTreatment(treatment.id)}
                      aria-label="Remover"
                    >
                      <IconX size="sm" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {preview.steps.length > 1 ? (
        <p className="text-xs text-zinc-500">
          Resultado estimado:{" "}
          <span className="font-medium tabular-nums text-zinc-800 dark:text-zinc-200">
            {formatEntryAmount(preview.outputAmount, preview.outputCurrency)}
          </span>
        </p>
      ) : null}
    </div>
  );
}

function TreatmentFields({
  treatment,
  catalog,
  companyPickerItems,
  onCompanyChange,
  onChange,
}: {
  treatment: PlanTreatment;
  catalog: MoneyMapCatalogData;
  companyPickerItems: RegistryPickerItem[];
  onCompanyChange: (companyId: string) => void;
  onChange: (patch: Partial<PlanTreatment>) => void;
}) {
  if (treatment.type === "conversion") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Para</Label>
          <Select
            size="sm"
            options={CURRENCY_OPTIONS}
            value={treatment.toCurrency}
            onChange={(value) => onChange({ toCurrency: value as "USD" | "BRL" | "EUR" })}
          />
        </div>
        <MultiSelect
          className="sm:col-span-2"
          size="sm"
          label="Instituições"
          placeholder="Comparar rotas…"
          options={catalog.institutionOptions}
          value={treatment.institutionIds}
          onChange={(institutionIds) => onChange({ institutionIds })}
        />
      </div>
    );
  }

  if (treatment.type === "tax_pj") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <RegistryPicker
            label="Empresa"
            placeholder="Selecione a empresa…"
            items={companyPickerItems}
            valueId={treatment.companyId ?? MANUAL_COMPANY_ID}
            onSelect={(id) => onCompanyChange(id === MANUAL_COMPANY_ID ? "" : id)}
            loading={catalog.loading}
            searchPlaceholder="Buscar empresa ou registro…"
            emptyMessage="Nenhuma empresa cadastrada."
            specialOptions={[
              {
                id: MANUAL_COMPANY_ID,
                label: "Manual (sem empresa)",
                description: "Informe alíquota e regime abaixo",
                icon: <IconPercent size="sm" />,
              },
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Alíquota (%)</Label>
          <NumberInput
            value={String(treatment.taxRatePercent)}
            onChange={(e) => onChange({ taxRatePercent: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Regime</Label>
          <Select
            size="sm"
            options={catalog.taxRegimeOptions}
            value={treatment.taxRegime}
            onChange={(value) =>
              onChange({ taxRegime: value as "simples" | "presumido" | "manual" })
            }
          />
        </div>
      </div>
    );
  }

  if (treatment.type === "investment") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">% do líquido</Label>
          <NumberInput
            value={String(treatment.percentOfNet)}
            onChange={(e) => onChange({ percentOfNet: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Rendimento anual (%)</Label>
          <NumberInput
            value={String(treatment.annualRatePercent ?? 0)}
            onChange={(e) => onChange({ annualRatePercent: Number(e.target.value) || 0 })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="space-y-1">
        <Label className="text-xs">Meses</Label>
        <NumberInput
          value={String(treatment.months)}
          onChange={(e) => onChange({ months: Number(e.target.value) || 12 })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Taxa anual (%)</Label>
        <NumberInput
          value={String(treatment.annualRatePercent ?? 0)}
          onChange={(e) => onChange({ annualRatePercent: Number(e.target.value) || 0 })}
        />
      </div>
    </div>
  );
}

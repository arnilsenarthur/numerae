"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCnpj } from "@/lib/cnpj";
import { CnpjInlineCreate } from "@/components/ui/cnpj-inline-create";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RegistryPicker,
  type RegistryPickerItem,
} from "@/components/ui/registry-picker";
import { IconBuilding, IconPercent } from "@/components/ui/icons";

import type { SavedCnpj } from "@/types/user-cnpj";

export type { SavedCnpj };

const MANUAL_ONLY_ID = "__manual__";

type CnpjSelectorProps = {
  value: SavedCnpj | null;
  onChange: (cnpj: SavedCnpj | null) => void;
  manualRate: number;
  onManualRateChange: (rate: number) => void;
  useManualRate: boolean;
  onUseManualRateChange: (value: boolean) => void;
};

export function CnpjSelector({
  value,
  onChange,
  manualRate,
  onManualRateChange,
  useManualRate,
  onUseManualRateChange,
}: CnpjSelectorProps) {
  const [saved, setSaved] = useState<SavedCnpj[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectionId, setSelectionId] = useState<string>(MANUAL_ONLY_ID);

  async function loadCnpjs() {
    setLoading(true);
    const response = await fetch("/api/cnpjs");
    const data = await response.json();
    setLoading(false);

    if (!response.ok) return;

    const list = (data.cnpjs ?? []) as SavedCnpj[];
    setSaved(list);

    const defaultItem = list.find((item) => item.isDefault) ?? list[0];
    if (defaultItem && selectionId === MANUAL_ONLY_ID && !value) {
      setSelectionId(defaultItem.id);
      onChange(defaultItem);
      onManualRateChange(defaultItem.taxRate);
      onUseManualRateChange(false);
    }
  }

  useEffect(() => {
    void loadCnpjs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickerItems: RegistryPickerItem[] = useMemo(
    () =>
      saved.map((item) => ({
        id: item.id,
        label: item.label,
        description: `${formatCnpj(item.cnpj)} · ${item.taxRate.toLocaleString("pt-BR")}%`,
        icon: <IconBuilding size="sm" />,
      })),
    [saved],
  );

  function handleSelect(id: string, item: RegistryPickerItem | null) {
    setSelectionId(id);

    if (id === MANUAL_ONLY_ID) {
      onChange(null);
      onUseManualRateChange(true);
      return;
    }

    const picked = saved.find((entry) => entry.id === id) ?? null;
    onChange(picked);
    onUseManualRateChange(false);
    if (picked) onManualRateChange(picked.taxRate);
  }

  function handleInlineSaved(created: SavedCnpj) {
    setSaved((current) => [...current.filter((item) => item.id !== created.id), created]);
    setSelectionId(created.id);
    onChange(created);
    onManualRateChange(created.taxRate);
    onUseManualRateChange(false);
  }

  return (
    <div className="space-y-4">
      <RegistryPicker
        label="CNPJ / empresa"
        placeholder="Selecione um CNPJ"
        items={pickerItems}
        valueId={selectionId}
        onSelect={handleSelect}
        loading={loading}
        searchPlaceholder="Buscar empresa ou CNPJ..."
        emptyMessage="Nenhum CNPJ salvo ainda."
        specialOptions={[
          {
            id: MANUAL_ONLY_ID,
            label: "Só alíquota manual",
            description: "Informe a % sem vincular CNPJ",
            icon: <IconPercent size="sm" />,
          },
        ]}
        inlineCreate={() => (
          <CnpjInlineCreate
            isFirst={saved.length === 0}
            onSaved={handleInlineSaved}
          />
        )}
      />

      {value && !useManualRate ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">{value.label}</p>
          <p className="mt-1 text-zinc-500">{formatCnpj(value.cnpj)}</p>
          {value.cnaeCode ? (
            <p className="mt-2 text-xs text-zinc-500">
              CNAE {value.cnaeCode}
              {value.cnaeDescription ? ` — ${value.cnaeDescription}` : ""}
            </p>
          ) : null}
          <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Alíquota: {value.taxRate.toLocaleString("pt-BR")}%
          </p>
        </div>
      ) : null}

      {(useManualRate || selectionId === MANUAL_ONLY_ID) ? (
        <div className="space-y-2">
          <Label htmlFor="manual-rate">Alíquota efetiva (%)</Label>
          <Input
            id="manual-rate"
            inputMode="decimal"
            value={String(manualRate)}
            onChange={(event) => {
              const next = Number(event.target.value.replace(",", "."));
              onManualRateChange(Number.isNaN(next) ? 0 : next);
            }}
            placeholder="Ex: 6"
          />
        </div>
      ) : null}
    </div>
  );
}

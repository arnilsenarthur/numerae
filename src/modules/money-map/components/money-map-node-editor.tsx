"use client";

import { Input, NumberInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { SerializedMoneyMapNode } from "@/lib/money-map-serializer";
import { CnpjSelector, type SavedCnpj } from "@/modules/calculator/components/cnpj-selector";
import { MONEY_MAP_NODE_LABELS } from "@/modules/money-map/engines/types";

const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD" },
  { value: "BRL", label: "BRL" },
  { value: "EUR", label: "EUR" },
];

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "annual", label: "Anual" },
  { value: "once", label: "Única" },
];

const INSTITUTION_OPTIONS = [
  { value: "inst_wise", label: "Wise" },
  { value: "inst_inter", label: "Banco Inter" },
  { value: "inst_btg", label: "BTG Pactual" },
  { value: "inst_nomad", label: "Nomad" },
  { value: "inst_nubank", label: "Nubank" },
  { value: "inst_avenue", label: "Avenue" },
];

const TAX_REGIME_OPTIONS = [
  { value: "simples", label: "Simples Nacional" },
  { value: "presumido", label: "Lucro Presumido" },
  { value: "manual", label: "Manual" },
];

type MoneyMapNodeEditorProps = {
  node: SerializedMoneyMapNode;
  cnpj: SavedCnpj | null;
  manualRate: number;
  useManualRate: boolean;
  onCnpjChange: (value: SavedCnpj | null) => void;
  onManualRateChange: (rate: number) => void;
  onUseManualRateChange: (value: boolean) => void;
  onLabelChange: (label: string) => void;
  onConfigChange: (patch: Record<string, unknown>) => void;
};

export function MoneyMapNodeEditor({
  node,
  cnpj,
  manualRate,
  useManualRate,
  onCnpjChange,
  onManualRateChange,
  onUseManualRateChange,
  onLabelChange,
  onConfigChange,
}: MoneyMapNodeEditorProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {MONEY_MAP_NODE_LABELS[node.type]}
      </p>

      <div className="space-y-1.5">
        <Label>Rótulo</Label>
        <Input
          value={node.label ?? ""}
          placeholder={
            node.type === "INCOME"
              ? "Ex: Salário, Cliente EUA"
              : node.type === "EXPENSE"
                ? "Ex: Contador, Aluguel"
                : "Nome do bloco"
          }
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>

      {node.type === "INCOME" ? (
        <>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <NumberInput
              value={String(node.config.amount ?? 0)}
              min={0}
              step="100"
              onChange={(e) => onConfigChange({ amount: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Moeda</Label>
              <Select
                options={CURRENCY_OPTIONS}
                value={String(node.config.currency ?? "USD")}
                onChange={(value) => onConfigChange({ currency: value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select
                options={PERIOD_OPTIONS}
                value={String(node.config.period ?? "monthly")}
                onChange={(value) => onConfigChange({ period: value })}
              />
            </div>
          </div>
        </>
      ) : null}

      {node.type === "EXPENSE" ? (
        <>
          <div className="space-y-1.5">
            <Label>Valor</Label>
            <NumberInput
              value={String(node.config.amount ?? 0)}
              min={0}
              step="50"
              onChange={(e) => onConfigChange({ amount: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Moeda</Label>
              <Select
                options={CURRENCY_OPTIONS}
                value={String(node.config.currency ?? "BRL")}
                onChange={(value) => onConfigChange({ currency: value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select
                options={PERIOD_OPTIONS}
                value={String(node.config.period ?? "monthly")}
                onChange={(value) => onConfigChange({ period: value })}
              />
            </div>
          </div>
        </>
      ) : null}

      {node.type === "CONVERSION" ? (
        <>
          <div className="space-y-1.5">
            <Label>Instituição</Label>
            <Select
              options={INSTITUTION_OPTIONS}
              value={String(node.config.institutionId ?? "inst_wise")}
              onChange={(value) => {
                const label = INSTITUTION_OPTIONS.find((o) => o.value === value)?.label ?? value;
                onConfigChange({ institutionId: value });
                onLabelChange(label);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>De</Label>
              <Select
                options={CURRENCY_OPTIONS}
                value={String(node.config.fromCurrency ?? "USD")}
                onChange={(value) => onConfigChange({ fromCurrency: value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Para</Label>
              <Select
                options={CURRENCY_OPTIONS}
                value={String(node.config.toCurrency ?? "BRL")}
                onChange={(value) => onConfigChange({ toCurrency: value })}
              />
            </div>
          </div>
        </>
      ) : null}

      {node.type === "TIME" ? (
        <div className="space-y-1.5">
          <Label>Meses a acumular</Label>
          <p className="text-xs text-zinc-500">
            Conecte um valor mensal. A saída é o total acumulado (com juros opcional) — pode ligar a outros blocos.
          </p>
          <NumberInput
            value={String(node.config.months ?? 12)}
            min={1}
            max={120}
            step={1}
            onChange={(e) => {
              const months = Number(e.target.value) || 12;
              onConfigChange({ months });
              onLabelChange(`${months} meses`);
            }}
          />
          <Label>Juros %/ano (opcional)</Label>
          <NumberInput
            value={String(node.config.annualRatePercent ?? 0)}
            min={0}
            max={100}
            step={0.1}
            onChange={(e) => onConfigChange({ annualRatePercent: Number(e.target.value) || 0 })}
          />
        </div>
      ) : null}

      {node.type === "TAX_PJ" ? (
        <>
          <CnpjSelector
            value={cnpj}
            onChange={(value) => {
              onCnpjChange(value);
              onConfigChange({
                companyId: value?.id ?? null,
                cnpjId: value?.id ?? null,
                taxRatePercent: useManualRate ? manualRate : value?.taxRate ?? manualRate,
                taxRegime: value?.taxRegime ?? node.config.taxRegime ?? "simples",
                cnaeCode: value?.cnaeCode ?? null,
              });
            }}
            manualRate={manualRate}
            onManualRateChange={(rate) => {
              onManualRateChange(rate);
              onConfigChange({ taxRatePercent: rate });
            }}
            useManualRate={useManualRate}
            onUseManualRateChange={onUseManualRateChange}
          />
          <div className="space-y-1.5">
            <Label>Regime</Label>
            <Select
              options={TAX_REGIME_OPTIONS}
              value={String(node.config.taxRegime ?? "simples")}
              onChange={(value) => onConfigChange({ taxRegime: value })}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

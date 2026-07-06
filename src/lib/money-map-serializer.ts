import type { MoneyMapNodeType } from "@/modules/money-map/engines/types";

export type SerializedMoneyMapNode = {
  id: string;
  type: MoneyMapNodeType;
  label: string | null;
  sortOrder: number;
  config: Record<string, unknown>;
};

export type SerializedMoneyMap = {
  id: string;
  name: string;
  templateId: string | null;
  horizonMonths: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: SerializedMoneyMapNode[];
};

type MoneyMapRecord = {
  id: string;
  name: string;
  templateId: string | null;
  horizonMonths: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  nodes?: {
    id: string;
    type: string;
    label: string | null;
    sortOrder: number;
    config: unknown;
  }[];
};

export function serializeMoneyMap(record: MoneyMapRecord): SerializedMoneyMap {
  return {
    id: record.id,
    name: record.name,
    templateId: record.templateId,
    horizonMonths: record.horizonMonths,
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    nodes: (record.nodes ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((node) => ({
        id: node.id,
        type: node.type as MoneyMapNodeType,
        label: node.label,
        sortOrder: node.sortOrder,
        config: (node.config ?? {}) as Record<string, unknown>,
      })),
  };
}

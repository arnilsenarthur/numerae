import type { TranslateFn } from "@/i18n/translate";
import { translateTipCategory } from "@/i18n/labels";

export const TIP_CATEGORIES = {
  saving: "saving",
  taxes: "taxes",
  investing: "investing",
  timing: "timing",
  general: "general",
} as const;

export type TipCategory = keyof typeof TIP_CATEGORIES;

export type SerializedTip = {
  id: string;
  quote: string;
  author: string;
  category: TipCategory;
  locale: string;
  sourceUrl: string | null;
  sourceLabel: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const TIP_CATEGORY_VALUES = Object.keys(TIP_CATEGORIES) as TipCategory[];

export function tipCategoryLabel(category: string, t: TranslateFn): string {
  return translateTipCategory(category, t);
}

export function tipCategoryOptions(t: TranslateFn) {
  return TIP_CATEGORY_VALUES.map((value) => ({
    value,
    label: tipCategoryLabel(value, t),
  }));
}

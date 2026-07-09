export const TIP_CATEGORIES = {
  saving: "Economia",
  taxes: "Impostos",
  investing: "Investimentos",
  timing: "Momento",
  general: "Geral",
} as const;

export type TipCategory = keyof typeof TIP_CATEGORIES;

export type SerializedTip = {
  id: string;
  quote: string;
  author: string;
  category: TipCategory;
  sourceUrl: string | null;
  sourceLabel: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export const TIP_CATEGORY_OPTIONS = Object.entries(TIP_CATEGORIES).map(([value, label]) => ({
  value,
  label,
}));

export function tipCategoryLabel(category: string): string {
  return TIP_CATEGORIES[category as TipCategory] ?? category;
}

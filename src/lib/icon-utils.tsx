import { icons, type IconProps } from "@/components/ui/icons";
import { ICON_ALIASES, type IconAliasKey } from "@/lib/icon-aliases";

export type IconName = keyof typeof icons;

export type IconSuggestionPurpose = "goal" | "transaction";

const CATEGORY_ICON: Record<string, IconName> = {
  salary: "salary",
  business: "building",
  investment_income: "trendUp",
  gift: "gift",
  other_income: "coins",
  housing: "house",
  food: "food",
  transport: "transport",
  health: "health",
  education: "education",
  leisure: "tag",
  shopping: "shopping",
  subscription: "subscription",
  taxes: "percent",
  investment: "invest",
  other: "tag",
  emergency: "shield",
  travel: "plane",
  home: "house",
  car: "car",
  retirement: "piggyBank",
  business_goal: "building",
};

const GOAL_CATEGORY_ICON: Partial<Record<string, IconName>> = {
  other: "target",
};

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function scoreAliasMatch(hay: string, tokens: Set<string>, alias: string): number {
  const needle = normalizeText(alias);
  if (!needle) return 0;

  if (tokens.has(needle)) {
    return 100 + needle.length;
  }

  if (needle.includes(" ") && hay.includes(needle)) {
    return 80 + needle.length;
  }

  if (hay === needle) {
    return 90 + needle.length;
  }

  if (needle.length >= 4 && hay.includes(needle)) {
    return 50 + needle.length;
  }

  return 0;
}

function matchIconFromText(text: string): IconName | null {
  const hay = normalizeText(text.trim());
  if (!hay) return null;

  const tokens = new Set(tokenize(text));
  let best: { icon: IconName; score: number } | null = null;

  for (const [icon, aliases] of Object.entries(ICON_ALIASES) as [
    IconAliasKey,
    readonly string[],
  ][]) {
    if (!(icon in icons)) continue;

    for (const alias of aliases) {
      const score = scoreAliasMatch(hay, tokens, alias);
      if (score > 0 && (!best || score > best.score)) {
        best = { icon, score };
      }
    }
  }

  return best?.icon ?? null;
}

function categoryFallbackIcon(
  category: string | null | undefined,
  purpose: IconSuggestionPurpose,
): IconName | null {
  if (!category) return null;

  if (purpose === "goal" && GOAL_CATEGORY_ICON[category]) {
    return GOAL_CATEGORY_ICON[category]!;
  }

  return CATEGORY_ICON[category] ?? null;
}

/** Suggest an icon from title/description text, with category as fallback. */
export function suggestIcon(
  text: string,
  category?: string | null,
  options?: { purpose?: IconSuggestionPurpose },
): IconName {
  const purpose = options?.purpose ?? "transaction";
  const fromText = matchIconFromText(text);
  if (fromText) return fromText;

  const fromCategory = categoryFallbackIcon(category, purpose);
  if (fromCategory) return fromCategory;

  return purpose === "goal" ? "target" : "tag";
}

export function isIconName(value: string | null | undefined): value is IconName {
  return Boolean(value && value in icons);
}

export function categoryDefaultIcon(
  category: string,
  purpose: IconSuggestionPurpose = "transaction",
): IconName {
  return categoryFallbackIcon(category, purpose) ?? (purpose === "goal" ? "target" : "tag");
}

export function AppIcon({
  name,
  ...props
}: IconProps & { name: string | null | undefined }) {
  const key: IconName = isIconName(name) ? name : "tag";
  const Component = icons[key] ?? icons.tag;
  return <Component {...props} />;
}

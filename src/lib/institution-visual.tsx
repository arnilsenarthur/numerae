import { createElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  IconBank,
  IconBuilding,
  IconChart,
  IconCoins,
  IconExchange,
  IconWallet,
  type IconProps,
} from "@/components/ui/icons";
import type { SelectOption } from "@/components/ui/select";
import { institutionTypeLabel } from "@/modules/admin/institutions/institution-form";
import type { SerializedInstitution } from "@/lib/institution-serializer";

const INSTITUTION_TYPE_ICONS = {
  BANK: IconBank,
  FINTECH: IconWallet,
  BROKER: IconChart,
  REMITTANCE: IconExchange,
  EXCHANGE: IconCoins,
  OTHER: IconBuilding,
} as const;

type InstitutionTypeKey = keyof typeof INSTITUTION_TYPE_ICONS;

export function institutionTypeIcon(type: string | null | undefined) {
  const key = (type ?? "OTHER") as InstitutionTypeKey;
  return INSTITUTION_TYPE_ICONS[key in INSTITUTION_TYPE_ICONS ? key : "OTHER"];
}

function iconSizeClass(size: InstitutionAvatarProps["size"]) {
  switch (size) {
    case "lg":
      return "h-9 w-9";
    case "md":
      return "h-8 w-8";
    default:
      return "h-6 w-6";
  }
}

function iconGlyphSize(size: InstitutionAvatarProps["size"]): IconProps["size"] {
  switch (size) {
    case "lg":
      return "sm";
    case "md":
      return "sm";
    default:
      return "xs";
  }
}

export type InstitutionAvatarProps = {
  logoUrl?: string | null;
  institutionType?: string | null;
  brandColor?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Logo da instituição ou ícone do tipo com fundo na cor da marca (cinza se sem tipo). */
export function InstitutionAvatar({
  logoUrl,
  institutionType,
  brandColor,
  size = "md",
  className,
}: InstitutionAvatarProps) {
  const boxClass = cn(
    "flex shrink-0 items-center justify-center overflow-hidden",
    iconSizeClass(size),
    ui.innerRadius,
    className,
  );

  if (logoUrl) {
    return (
      <span
        className={cn(boxClass, "ring-1 ring-zinc-200 dark:ring-zinc-700")}
        style={
          brandColor
            ? { boxShadow: `inset 0 0 0 1px ${brandColor}33` }
            : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
      </span>
    );
  }

  if (!institutionType) {
    return (
      <span
        className={cn(
          boxClass,
          "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
        )}
      >
        <IconBank size={iconGlyphSize(size)} />
      </span>
    );
  }

  const Icon = institutionTypeIcon(institutionType);
  const tint = brandColor
    ? { backgroundColor: `${brandColor}22`, color: brandColor }
    : undefined;

  return (
    <span
      className={cn(
        boxClass,
        !brandColor && "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
      )}
      style={tint}
    >
      <Icon size={iconGlyphSize(size)} />
    </span>
  );
}

export function institutionTypeIconNode(
  type: string | null | undefined,
  iconSize: IconProps["size"] = "xs",
): ReactNode {
  const Icon = institutionTypeIcon(type);
  return createElement(Icon, { size: iconSize });
}

export function buildInstitutionSelectOptions(
  institutions: SerializedInstitution[],
): SelectOption[] {
  return institutions
    .filter((institution) => institution.active)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .map((institution) => ({
      key: institution.id,
      value: institution.id,
      label: institution.name,
      description: institution.exchangeRatesCount
        ? `${institution.exchangeRatesCount} cotação(ões)`
        : institutionTypeLabel(institution.type),
      icon: institutionTypeIconNode(institution.type),
      ...(institution.brandColor ? { color: institution.brandColor } : {}),
    }));
}
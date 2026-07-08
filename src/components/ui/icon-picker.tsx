"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { HoverTooltip } from "@/components/ui/tooltip";
import { iconCategories, icons, type IconProps } from "@/components/ui/icons";
import { ICON_LABELS } from "@/lib/icon-aliases";
import { isIconName, type IconName } from "@/lib/icon-utils";
import { useMemo } from "react";

type IconPickerProps = {
  value: string | null | undefined;
  onChange: (icon: IconName) => void;
  label?: string;
  className?: string;
  size?: IconProps["size"];
};

export function IconPicker({
  value,
  onChange,
  label,
  className,
  size = "sm",
}: IconPickerProps) {
  const selected: IconName = isIconName(value) ? value : "tag";

  const options = useMemo(
    () =>
      iconCategories.flatMap((category) =>
        (category.keys as readonly string[]).filter((key) => key in icons) as IconName[],
      ),
    [],
  );

  return (
    <div className={cn("space-y-2", className)}>
      {label ? <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</p> : null}
      <div className="flex flex-wrap gap-1.5">
        {options.map((key) => {
          const Icon = icons[key];
          const active = key === selected;
          return (
            <HoverTooltip
              key={key}
              label={ICON_LABELS[key as keyof typeof ICON_LABELS] ?? key}
            >
              <button
                type="button"
                onClick={() => onChange(key)}
                className={cn(
                  "flex h-9 w-9 cursor-pointer items-center justify-center transition-colors",
                  ui.innerRadius,
                  active
                    ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700",
                )}
              >
                <Icon size={size} />
              </button>
            </HoverTooltip>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { IconX } from "@/components/ui/icons";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { SelectOption } from "@/components/ui/select";

type MultiSelectProps = {
  options: SelectOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  menuZIndex?: number;
};

const MENU_MAX_HEIGHT = 224;
const MENU_GAP = 6;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  placement: "above" | "below";
};

function OptionVisual({ option }: { option: SelectOption }) {
  if (option.image) {
    return (
      <span className="inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={option.image} alt={option.label} className="h-full w-full object-cover" />
      </span>
    );
  }

  if (option.icon) {
    return (
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
          ui.innerRadius,
        )}
      >
        {option.icon}
      </span>
    );
  }

  return null;
}

function getMenuPosition(trigger: HTMLElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const placement =
    spaceBelow < MENU_MAX_HEIGHT + MENU_GAP && spaceAbove > spaceBelow ? "above" : "below";

  return {
    top: placement === "below" ? rect.bottom + MENU_GAP : rect.top - MENU_GAP,
    left: rect.left,
    width: rect.width,
    placement,
  };
}

function RemovableTag({
  label,
  onRemove,
  disabled,
}: {
  label: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-100 py-0.5 pl-2 pr-0.5 text-xs font-medium text-zinc-700",
        "dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
      )}
    >
      <span className="truncate">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-label={`Remover ${label}`}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className={cn(
          "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-zinc-500 transition-colors",
          "hover:bg-zinc-200 hover:text-zinc-800 dark:hover:bg-zinc-700 dark:hover:text-zinc-100",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <IconX size="sm" />
      </button>
    </span>
  );
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = "Selecione…",
  label,
  disabled,
  className,
  size = "md",
  menuZIndex = ui.dropdownZIndex,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selectedSet = new Set(value);
  const selectedOptions = options.filter((option) => selectedSet.has(option.value));

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      if (!triggerRef.current) return;
      setMenuPosition(getMenuPosition(triggerRef.current));
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, options.length, value.length]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listboxRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function toggleOption(optionValue: string) {
    const next = selectedSet.has(optionValue)
      ? value.filter((item) => item !== optionValue)
      : [...value, optionValue];
    onChange?.(next);
  }

  function removeOption(optionValue: string) {
    onChange?.(value.filter((item) => item !== optionValue));
  }

  const menu =
    mounted && open && menuPosition
      ? createPortal(
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              zIndex: menuZIndex,
              transform: menuPosition.placement === "above" ? "translateY(-100%)" : undefined,
            }}
            className={cn(
              "origin-top overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950",
              "animate-dropdown-in",
            )}
          >
            <div className="max-h-56 overflow-y-auto overscroll-contain">
              {options.map((option, index) => {
                const isSelected = selectedSet.has(option.value);
                const optionKey = option.key ?? `${option.value}-${index}`;

                return (
                  <button
                    key={optionKey}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      "flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors cursor-pointer",
                      "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                      isSelected && "bg-zinc-100/80 dark:bg-zinc-800/80",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                        isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                          : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-950",
                      )}
                      aria-hidden
                    >
                      {isSelected ? (
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </span>
                    <OptionVisual option={option} />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          isSelected
                            ? "font-medium text-zinc-900 dark:text-zinc-100"
                            : "text-zinc-700 dark:text-zinc-300",
                        )}
                      >
                        {option.label}
                      </span>
                      {option.description ? (
                        <span className="block truncate text-xs text-zinc-500">{option.description}</span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label ? <label className={ui.label}>{label}</label> : null}

      <div
        ref={triggerRef}
        role="combobox"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        className={cn(
          "flex w-full min-h-9 cursor-pointer items-start justify-between gap-2 transition-all duration-200",
          ui.controlPadding,
          ui.controlText,
          ui.controlRadius,
          ui.fieldBorder,
          ui.fieldFocus,
          "hover:border-zinc-300 dark:hover:border-zinc-600",
          ui.fieldTrigger,
          disabled && "cursor-not-allowed opacity-60",
          open && ui.fieldOpen,
          size === "sm" && "text-xs",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-0.5">
          {selectedOptions.length === 0 ? (
            <span className="text-zinc-400">{placeholder}</span>
          ) : (
            selectedOptions.map((option, index) => (
              <RemovableTag
                key={option.key ?? `${option.value}-${index}`}
                label={option.label}
                disabled={disabled}
                onRemove={() => removeOption(option.value)}
              />
            ))
          )}
        </span>
        <svg
          className={cn(
            "mt-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200",
            open && "rotate-180",
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>

      {menu}
    </div>
  );
}

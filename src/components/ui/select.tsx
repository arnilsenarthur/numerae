"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { registerDropdownEscapeLock } from "@/hooks/use-dropdown-escape-lock";

export type SelectOption = {
  value: string;
  label: string;
  /** Unique React key when `value` repeats (e.g. same currency code in multiple countries). */
  key?: string;
  disabled?: boolean;
  icon?: ReactNode;
  image?: string;
  description?: string;
  /** Brand / accent color hex for coloring the icon background. */
  color?: string;
};

type SelectProps = {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Override portal z-index (default: above modals). */
  menuZIndex?: number;
};

const MENU_MAX_HEIGHT = 224;
const MENU_GAP = 6;
const SEARCH_MIN_OPTIONS = 1;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  placement: "above" | "below";
};

function OptionVisual({ option }: { option: SelectOption }) {
  if (option.image) {
    return (
      <span
        className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700"
        style={
          option.color
            ? { boxShadow: `inset 0 0 0 2px ${option.color}33` }
            : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={option.image} alt={option.label} className="h-full w-full object-cover" />
      </span>
    );
  }

  if (option.icon) {
    const bgStyle = option.color
      ? { backgroundColor: option.color + "22", color: option.color }
      : undefined;
    return (
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
          ui.innerRadius,
        )}
        style={bgStyle}
      >
        {option.icon}
      </span>
    );
  }

  return null;
}

function getMenuPosition(trigger: HTMLButtonElement): MenuPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  const placement =
    spaceBelow < MENU_MAX_HEIGHT + MENU_GAP && spaceAbove > spaceBelow
      ? "above"
      : "below";

  return {
    top: placement === "below" ? rect.bottom + MENU_GAP : rect.top - MENU_GAP,
    left: rect.left,
    width: rect.width,
    placement,
  };
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Selecione...",
  label,
  disabled,
  className,
  size = "md",
  searchable,
  searchPlaceholder = "Buscar...",
  menuZIndex = ui.dropdownZIndex,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const isSearchable = searchable ?? options.length >= SEARCH_MIN_OPTIONS;

  const selected = options.find((option) => option.value === value);
  const displayValue =
    selected?.label ?? (value !== undefined && value !== "" ? String(value) : placeholder);
  const hasSelection = Boolean(selected || (value !== undefined && value !== ""));

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized || !isSearchable) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.description?.toLowerCase().includes(normalized) ||
        option.value.toLowerCase().includes(normalized),
    );
  }, [isSearchable, options, query]);

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
  }, [open, options.length, filteredOptions.length]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    if (isSearchable) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open, isSearchable]);

  useEffect(() => {
    if (!open) return;
    return registerDropdownEscapeLock();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listboxRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  const menu =
    mounted && open && menuPosition
      ? createPortal(
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            style={{
              position: "fixed",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              minWidth: 220,
              zIndex: menuZIndex,
              transform:
                menuPosition.placement === "above"
                  ? "translateY(-100%)"
                  : undefined,
            }}
            className={cn(
              "origin-top overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-950",
              "animate-dropdown-in",
            )}
          >
            {isSearchable ? (
              <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-400"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </div>
            ) : null}

            <div className="max-h-56 overflow-y-auto overscroll-contain">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-zinc-500">
                  Nenhum resultado.
                </p>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = option.value === value;
                  const optionKey = option.key ?? `${option.value}-${index}`;

                  return (
                    <button
                      key={optionKey}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => {
                        onChange?.(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-left transition-colors",
                        "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                        isSelected && "bg-zinc-100/80 dark:bg-zinc-800/80",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
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
                          <span className="block truncate text-xs text-zinc-500">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-zinc-500"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          aria-hidden
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label ? <label className={ui.label}>{label}</label> : null}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center justify-between gap-2 transition-all duration-200",
          ui.controlHeight,
          ui.controlPadding,
          ui.controlText,
          ui.controlRadius,
          ui.fieldBorder,
          ui.fieldFocus,
          "hover:border-zinc-300 dark:hover:border-zinc-600",
          ui.fieldTrigger,
          disabled && "opacity-60",
          open && ui.fieldOpen,
          size === "sm" && "text-xs",
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected ? <OptionVisual option={selected} /> : null}
          <span
            className={cn(
              "truncate",
              hasSelection ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400",
            )}
          >
            {displayValue}
          </span>
        </span>
        <svg
          className={cn(
            "h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200",
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
      </button>

      {menu}
    </div>
  );
}

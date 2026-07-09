"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { Spinner } from "@/components/ui/loader";
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
import { useT } from "@/i18n/locale-provider";

export type RegistryPickerItem = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  image?: string;
  disabled?: boolean;
  /** Brand color hex for icon background tint. */
  color?: string;
};

export type RegistryPickerSpecialOption = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  image?: string;
};

type RegistryPickerProps = {
  label?: string;
  placeholder?: string;
  items: RegistryPickerItem[];
  valueId: string | null;
  onSelect: (id: string, item: RegistryPickerItem | null) => void;
  specialOptions?: RegistryPickerSpecialOption[];
  loading?: boolean;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  menuZIndex?: number;
  inlineCreate?: (helpers: {
    close: () => void;
    onCreated: (item: RegistryPickerItem) => void;
  }) => ReactNode;
};

const MENU_MAX_HEIGHT = 280;
const MENU_GAP = 6;

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  placement: "above" | "below";
};

function ItemVisual({
  icon,
  image,
  color,
}: {
  icon?: ReactNode;
  image?: string;
  color?: string;
}) {
  if (image) {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 overflow-hidden rounded-full ring-1 ring-zinc-200 dark:ring-zinc-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  if (!icon) return null;

  const bgStyle = color
    ? { backgroundColor: color + "22", color }
    : undefined;

  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        ui.innerRadius,
      )}
      style={bgStyle}
    >
      {icon}
    </span>
  );
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

export function RegistryPicker({
  label,
  placeholder,
  items,
  valueId,
  onSelect,
  specialOptions = [],
  loading,
  disabled,
  searchable = true,
  searchPlaceholder,
  emptyMessage,
  className,
  menuZIndex = ui.dropdownZIndex,
  inlineCreate,
}: RegistryPickerProps) {
  const t = useT();
  const resolvedPlaceholder = placeholder ?? t("ui.select.placeholder");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("ui.pickers.registry.search");
  const resolvedEmptyMessage = emptyMessage ?? t("ui.pickers.registry.empty");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected =
    items.find((item) => item.id === valueId) ??
    specialOptions.find((option) => option.id === valueId);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.description?.toLowerCase().includes(normalized),
    );
  }, [items, query]);

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
  }, [open, items.length, filteredItems.length]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    if (searchable) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open, searchable]);

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

  function handleSelect(id: string) {
    const item = items.find((entry) => entry.id === id) ?? null;
    onSelect(id, item);
    setOpen(false);
  }

  function handleCreated(item: RegistryPickerItem) {
    onSelect(item.id, item);
    setOpen(false);
  }

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
              minWidth: 260,
              zIndex: menuZIndex,
              transform:
                menuPosition.placement === "above"
                  ? "translateY(-100%)"
                  : undefined,
            }}
            className={cn(
              "origin-top overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-950",
              "animate-dropdown-in",
            )}
          >
            {searchable && items.length > 0 ? (
              <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={resolvedSearchPlaceholder}
                  className="w-full bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-400"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                />
              </div>
            ) : null}

            <div className="max-h-56 overflow-y-auto overscroll-contain">
              {filteredItems.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-zinc-500">{resolvedEmptyMessage}</p>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = item.id === valueId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={item.disabled}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "flex w-full cursor-pointer items-center gap-2 px-2.5 py-2 text-left transition-colors",
                        "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                        isSelected && "bg-zinc-100/80 dark:bg-zinc-800/80",
                        item.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <ItemVisual icon={item.icon} image={item.image} color={item.color} />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-sm",
                            isSelected
                              ? "font-medium text-zinc-900 dark:text-zinc-100"
                              : "text-zinc-700 dark:text-zinc-300",
                          )}
                        >
                          {item.label}
                        </span>
                        {item.description ? (
                          <span className="block truncate text-xs text-zinc-500">
                            {item.description}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <svg
                          className="h-3.5 w-3.5 shrink-0 text-emerald-600"
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

              {specialOptions.length ? (
                <>
                  <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                  {specialOptions.map((option) => {
                    const isSelected = option.id === valueId;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(option.id)}
                        className={cn(
                          "flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors",
                          "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                          isSelected && "bg-zinc-100/80 dark:bg-zinc-800/80",
                        )}
                      >
                        <ItemVisual icon={option.icon} image={option.image} color={"color" in option ? (option as { color?: string }).color : undefined} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-zinc-700 dark:text-zinc-300">
                            {option.label}
                          </span>
                          {option.description ? (
                            <span className="block truncate text-xs text-zinc-500">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : null}
            </div>

            {inlineCreate ? (
              <div
                className="border-t border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
              >
                {inlineCreate({
                  close: () => setOpen(false),
                  onCreated: handleCreated,
                })}
              </div>
            ) : null}
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
        disabled={disabled || loading}
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
          (disabled || loading) && "opacity-60",
          open && ui.fieldOpen,
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          {loading ? (
            <Spinner size="sm" />
          ) : selected ? (
            <ItemVisual
              icon={"icon" in selected ? selected.icon : undefined}
              image={"image" in selected ? selected.image : undefined}
              color={"color" in selected ? (selected as { color?: string }).color : undefined}
            />
          ) : null}
          <span className="min-w-0 flex-1 text-left">
            <span
              className={cn(
                "block truncate",
                selected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400",
              )}
            >
              {loading ? t("ui.loader.loading") : (selected?.label ?? resolvedPlaceholder)}
            </span>
            {selected?.description ? (
              <span className="block truncate text-xs text-zinc-500">
                {selected.description}
              </span>
            ) : null}
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

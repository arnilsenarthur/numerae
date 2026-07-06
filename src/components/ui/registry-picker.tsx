"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import { Spinner } from "@/components/ui/loader";
import {
  ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

export type RegistryPickerItem = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export type RegistryPickerSpecialOption = {
  id: string;
  label: string;
  description?: string;
  icon?: ReactNode;
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
  inlineCreate?: (helpers: {
    close: () => void;
    onCreated: (item: RegistryPickerItem) => void;
  }) => ReactNode;
};

function ItemVisual({ icon }: { icon?: ReactNode }) {
  if (!icon) return null;

  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        ui.innerRadius,
      )}
    >
      {icon}
    </span>
  );
}

export function RegistryPicker({
  label,
  placeholder = "Selecione...",
  items,
  valueId,
  onSelect,
  specialOptions = [],
  loading,
  disabled,
  searchable = true,
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum item cadastrado.",
  className,
  inlineCreate,
}: RegistryPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
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
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus();
    }
    if (!open) setQuery("");
  }, [open, searchable]);

  function handleSelect(id: string) {
    const item = items.find((entry) => entry.id === id) ?? null;
    onSelect(id, item);
    setOpen(false);
  }

  function handleCreated(item: RegistryPickerItem) {
    onSelect(item.id, item);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label ? <label className={ui.label}>{label}</label> : null}

      <button
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
          ) : selected?.icon ? (
            <ItemVisual icon={selected.icon} />
          ) : null}
          <span
            className={cn(
              "truncate",
              selected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400",
            )}
          >
            {loading ? "Carregando..." : (selected?.label ?? placeholder)}
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

      <div
        id={listboxId}
        role="listbox"
        className={cn(
          "absolute z-30 mt-1.5 w-full origin-top overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-950",
          open
            ? "animate-dropdown-in scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {searchable && items.length > 0 ? (
          <div className="border-b border-zinc-100 p-2 dark:border-zinc-800">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "w-full bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-400",
              )}
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        ) : null}

        <div className="max-h-56 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-zinc-500">{emptyMessage}</p>
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
                  <ItemVisual icon={item.icon} />
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
                    <ItemVisual icon={option.icon} />
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
      </div>
    </div>
  );
}

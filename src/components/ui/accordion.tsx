"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  createContext,
  ReactNode,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";

type AccordionContextValue = {
  type: "single" | "multiple";
  openItems: string[];
  toggle: (value: string) => void;
  grouped: boolean;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

type AccordionProps = {
  children: ReactNode;
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  grouped?: boolean;
  className?: string;
};

export function Accordion({
  children,
  type = "single",
  defaultValue,
  grouped = false,
  className,
}: AccordionProps) {
  const initial = Array.isArray(defaultValue)
    ? defaultValue
    : defaultValue
      ? [defaultValue]
      : [];

  const [openItems, setOpenItems] = useState<string[]>(initial);

  const toggle = (value: string) => {
    setOpenItems((current) => {
      if (type === "multiple") {
        return current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value];
      }

      return current.includes(value) ? [] : [value];
    });
  };

  const context = useMemo(
    () => ({ type, openItems, toggle, grouped }),
    [type, openItems, grouped],
  );

  return (
    <AccordionContext.Provider value={context}>
      <div
        className={cn(
          grouped
            ? cn("overflow-hidden border border-zinc-200 dark:border-zinc-800", ui.surfaceRadius)
            : cn("flex flex-col gap-2"),
          className,
        )}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export function AccordionGroup({
  children,
  type = "single",
  defaultValue,
  className,
}: {
  children: ReactNode;
  type?: "single" | "multiple";
  defaultValue?: string | string[];
  className?: string;
}) {
  return (
    <Accordion
      grouped
      type={type}
      defaultValue={defaultValue}
      className={className}
    >
      {children}
    </Accordion>
  );
}

type AccordionItemProps = {
  value: string;
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AccordionItem({
  value,
  title,
  children,
  className,
}: AccordionItemProps) {
  const context = useContext(AccordionContext);
  const contentId = useId();
  const open = context?.openItems.includes(value) ?? false;
  const grouped = context?.grouped ?? false;

  if (!context) {
    throw new Error("AccordionItem must be used within Accordion");
  }

  return (
    <div
      className={cn(
        grouped
          ? "overflow-hidden border-b border-zinc-200 bg-white last:border-b-0 dark:border-zinc-800 dark:bg-zinc-950"
          : cn("overflow-hidden border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950", ui.surfaceRadius),
        open && "shadow-sm",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => context.toggle(value)}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-medium transition-colors",
          "hover:bg-zinc-50 dark:hover:bg-zinc-900/50",
          open && "bg-zinc-50 dark:bg-zinc-900/40",
        )}
      >
        <span className="min-w-0 flex-1">{title}</span>
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center text-zinc-400 transition-transform duration-200",
            open && "rotate-180 text-zinc-600 dark:text-zinc-300",
          )}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      <div
        id={contentId}
        className={cn(
          "grid transition-all duration-250 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-zinc-100 px-3 pb-2.5 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

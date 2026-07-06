"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  ReactElement,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = {
  defaultValue: string;
  children: ReactNode;
  className?: string;
  onValueChange?: (value: string) => void;
};

export function Tabs({
  defaultValue,
  children,
  className,
  onValueChange,
}: TabsProps) {
  const [value, setValueState] = useState(defaultValue);

  const setValue = (next: string) => {
    setValueState(next);
    onValueChange?.(next);
  };

  const context = useMemo(() => ({ value, setValue }), [value]);

  return (
    <TabsContext.Provider value={context}>
      <div className={cn("flex flex-col gap-3", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <div
      className={cn(
        "inline-flex w-full max-w-full overflow-x-auto border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60",
        ui.controlRadius,
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
    >
      {items.map((child, index) => {
        if (!isValidElement(child)) return child;

        const element = child as ReactElement<{ className?: string }>;
        const isFirst = index === 0;
        const isLast = index === items.length - 1;
        const isOnly = items.length === 1;

        return cloneElement(element, {
          className: cn(
            element.props.className,
            "!rounded-none",
            isOnly && "!rounded-lg",
            !isOnly && isFirst && "!rounded-l-lg",
            !isOnly && isLast && "!rounded-r-lg",
            index > 0 && "border-l border-zinc-200 dark:border-zinc-700",
          ),
        });
      })}
    </div>
  );
}

type TabsTriggerProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const active = context.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => context.setValue(value)}
      className={cn(
        "min-w-[4.5rem] flex-1 shrink-0 cursor-pointer whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors duration-200 sm:flex-none sm:px-4",
        active
          ? "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          : "text-zinc-500 hover:bg-white/60 hover:text-zinc-800 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200",
        className,
      )}
    >
      {children}
    </button>
  );
}

type TabsContentProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function TabsContent({ value, children, className }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  const active = context.value === value;

  if (!active) return null;

  return (
    <div
      role="tabpanel"
      className={cn(
        "animate-fade-in-up border border-zinc-200 bg-white p-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 sm:p-4",
        ui.surfaceRadius,
        className,
      )}
    >
      {children}
    </div>
  );
}

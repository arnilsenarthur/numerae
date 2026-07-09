"use client";

import { cn } from "@/lib/utils";
import { ui } from "@/components/ui/tokens";
import {
  createContext,
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
  return (
    <div
      className={cn(
        "flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-700",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
    >
      {children}
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
        "-mb-px shrink-0 cursor-pointer whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-emerald-500 text-zinc-900 dark:border-emerald-400 dark:text-zinc-100"
          : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300",
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

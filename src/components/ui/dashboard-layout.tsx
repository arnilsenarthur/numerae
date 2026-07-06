import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type DashboardPageProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardPage({ children, className }: DashboardPageProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl space-y-6", className)}>
      {children}
    </div>
  );
}

type DashboardHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function DashboardHeader({
  title,
  description,
  actions,
  className,
}: DashboardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-sm text-zinc-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

type DashboardGridProps = {
  children: ReactNode;
  className?: string;
  variant?: "stats" | "cards" | "split" | "sidebar";
};

const gridVariants = {
  stats: "grid gap-4 sm:grid-cols-2 xl:grid-cols-4",
  cards: "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
  split: "grid gap-4 lg:grid-cols-2",
  sidebar: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]",
};

export function DashboardGrid({
  children,
  className,
  variant = "cards",
}: DashboardGridProps) {
  return (
    <div className={cn(gridVariants[variant], className)}>{children}</div>
  );
}

type DashboardSectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function DashboardSection({
  title,
  description,
  actions,
  children,
  className,
}: DashboardSectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {title || description || actions ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

type DashboardSpanProps = {
  children: ReactNode;
  className?: string;
  cols?: 1 | 2 | 3 | "full";
};

const spanClasses = {
  1: "",
  2: "md:col-span-2",
  3: "md:col-span-2 xl:col-span-3",
  full: "col-span-full",
};

export function DashboardSpan({
  children,
  className,
  cols = 1,
}: DashboardSpanProps) {
  return <div className={cn(spanClasses[cols], className)}>{children}</div>;
}

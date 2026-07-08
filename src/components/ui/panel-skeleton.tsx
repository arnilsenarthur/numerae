import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCardsSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TableRowsSkeleton({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="ml-auto h-4 w-20" />
        <Skeleton className="h-4 w-16" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800"
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  count = 4,
  columns = "md:grid-cols-2",
  className,
}: {
  count?: number;
  columns?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4", columns, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          <div className="flex items-start gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 p-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartCardSkeleton({
  height = "h-52",
  className,
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-zinc-200 p-4 dark:border-zinc-800",
        className,
      )}
    >
      <Skeleton className="mb-3 h-4 w-36" />
      <Skeleton className={cn("w-full", height)} />
    </div>
  );
}

export function FinanceOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <StatCardsSkeleton count={4} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-44" />
        <ChartCardSkeleton height="h-44" />
      </div>
      <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
        <Skeleton className="mb-3 h-4 w-40" />
        <div className="flex flex-wrap gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GoalListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="mt-3 h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

export function PlanChipsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-24 rounded-lg" />
      ))}
    </div>
  );
}

export function InlineResultSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mt-4 rounded-lg border border-zinc-200 bg-zinc-50/60 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/30",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="ml-auto h-5 w-24" />
      </div>
    </div>
  );
}

export function InstitutionListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 dark:border-zinc-800"
        >
          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function MarketDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>
        <Skeleton className="h-7 w-20" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
      <ChartCardSkeleton height="h-64" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <StatCardsSkeleton count={3} className="sm:grid-cols-2 lg:grid-cols-3" />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCardSkeleton height="h-32" />
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <Skeleton className="mb-3 h-4 w-36" />
          <TableRowsSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}

export function PositionsPanelSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCardSkeleton height="h-36" />
        <StatCardsSkeleton count={4} className="grid-cols-2 content-start" />
      </div>
      <GoalListSkeleton count={2} />
    </div>
  );
}

export function InvestmentPlansSkeleton() {
  return (
    <div className="space-y-4">
      <PlanChipsSkeleton />
      <ChartCardSkeleton />
      <StatCardsSkeleton count={3} className="lg:grid-cols-3" />
    </div>
  );
}

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
    <div className={cn("grid gap-3", columns, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          {/* Header: avatar + title + subtitle */}
          <div className="flex items-start gap-2.5 p-3 pb-1">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          {/* Content rows */}
          <div className="space-y-1.5 px-3 pb-3 pt-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* Action strip */}
          <div className="flex gap-1.5 border-t border-zinc-200 p-2 dark:border-zinc-800">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
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
          className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
        >
          {/* Header: icon + title + badges */}
          <div className="flex items-start gap-2.5 p-3 pb-2">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          {/* Content: amounts + progress */}
          <div className="space-y-2 px-3 pb-3 pt-0">
            <div className="flex items-baseline gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-5" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="ml-auto h-3.5 w-9" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
          {/* Action strip: 3 flex-1 buttons */}
          <div className="flex gap-1.5 border-t border-zinc-200 p-2 dark:border-zinc-800">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
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
      {/* Row 1: patrimônio — 3 stat cards */}
      <StatCardsSkeleton count={3} className="sm:grid-cols-2 lg:grid-cols-3" />

      {/* Row 2: composição + movimentações */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-36" />
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <Skeleton className="mb-3 h-4 w-36" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: metas — section header + goal cards (clickable, no action strip) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-28" />
                </div>
                <Skeleton className="h-3.5 w-9 shrink-0" />
              </div>
              <Skeleton className="mt-2 h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: contas — section header + account cards */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="mt-2 h-5 w-28" />
              <Skeleton className="mt-1 h-2.5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PositionsPanelSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header row — title + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>

      {/* Stat cards row */}
      <StatCardsSkeleton count={4} className="grid-cols-2 lg:grid-cols-4" />

      {/* Chart + allocation side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCardSkeleton height="h-44" />
        <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          <Skeleton className="mb-3 h-4 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Position cards section */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-start gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Skeleton className="h-2.5 w-14" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="space-y-1 text-right">
                  <Skeleton className="ml-auto h-2.5 w-14" />
                  <Skeleton className="ml-auto h-4 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InvestmentPlansSkeleton() {
  return (
    <div className="space-y-4">
      {/* Plan selector chips */}
      <PlanChipsSkeleton />
      {/* Mini stat chips row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50"
          >
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <div className="space-y-1">
              <Skeleton className="h-2 w-10" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
      {/* Main chart */}
      <ChartCardSkeleton height="h-52" />
      {/* Bottom stat cards */}
      <StatCardsSkeleton count={3} className="lg:grid-cols-3" />
    </div>
  );
}

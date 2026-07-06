import { cn } from "@/lib/utils";

type AuthStepIndicatorProps = {
  current: number;
  total: number;
  labels?: string[];
  className?: string;
};

export function AuthStepIndicator({
  current,
  total,
  labels,
  className,
}: AuthStepIndicatorProps) {
  return (
    <div className={cn("mb-6", className)}>
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, index) => {
          const step = index + 1;
          const active = step === current;
          const completed = step < current;

          return (
            <div key={step} className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                  active &&
                    "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25",
                  completed && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                  !active &&
                    !completed &&
                    "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
                )}
              >
                {completed ? "✓" : step}
              </span>
              {step < total ? (
                <span
                  className={cn(
                    "h-px w-8 transition-colors sm:w-12",
                    completed
                      ? "bg-emerald-300 dark:bg-emerald-700"
                      : "bg-zinc-200 dark:bg-zinc-800",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {labels?.length ? (
        <p className="mt-2 text-center text-xs text-zinc-500">
          {labels[current - 1]}
        </p>
      ) : null}
    </div>
  );
}

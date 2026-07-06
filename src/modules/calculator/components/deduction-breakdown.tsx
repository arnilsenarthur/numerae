import { cn } from "@/lib/utils";
import { formatCountryMoney } from "@/lib/locale";
import type { CountryCode } from "@/lib/locale";
import type { DeductionLine } from "@/modules/calculator/types";

type DeductionBreakdownProps = {
  gross: number;
  net: number;
  deductions: DeductionLine[];
  notes?: string[];
  countryCode?: CountryCode;
  className?: string;
};

export function DeductionBreakdown({
  gross,
  net,
  deductions,
  notes,
  countryCode = "BR",
  className,
}: DeductionBreakdownProps) {
  const totalDeductions = deductions.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Bruto</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {formatCountryMoney(gross, countryCode)}
          </p>
        </div>
        <div className="rounded-xl border border-red-200/80 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
          <p className="text-xs font-medium uppercase tracking-wide text-red-500">Descontos</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-red-700 dark:text-red-300">
            −{formatCountryMoney(totalDeductions, countryCode)}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">Líquido</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
            {formatCountryMoney(net, countryCode)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50">
          Detalhamento
        </div>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {deductions.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-zinc-800 dark:text-zinc-200">{item.label}</p>
                {item.hint ? (
                  <p className="mt-0.5 text-xs text-zinc-500">{item.hint}</p>
                ) : null}
              </div>
              <span className="shrink-0 tabular-nums text-red-600 dark:text-red-400">
                −{formatCountryMoney(item.amount, countryCode)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {notes?.length ? (
        <ul className="space-y-1.5 text-xs leading-relaxed text-zinc-500">
          {notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

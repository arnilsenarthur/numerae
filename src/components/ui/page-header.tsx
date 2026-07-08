import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import type { PageHeaderMeta } from "@/lib/page-meta";

export function PageHeader({
  meta,
  className,
  actions,
}: {
  meta: PageHeaderMeta;
  className?: string;
  actions?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {meta.breadcrumbs?.length ? (
          <Breadcrumbs className="mb-2" items={meta.breadcrumbs} />
        ) : null}
        <p className="text-sm text-emerald-600">{meta.kicker}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{meta.title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">{meta.subtitle}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

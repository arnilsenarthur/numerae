"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, cardClickable } from "@/components/ui/card";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { tipCategoryLabel, type SerializedTip } from "@/types/tips";

type TipListCardProps = {
  tip: SerializedTip;
};

export function TipListCard({ tip }: TipListCardProps) {
  const t = useT();

  const content = (
    <Card className={cn(tip.sourceUrl && cardClickable)}>
      <CardContent className="space-y-2 py-5">
        <p className="text-sm leading-relaxed">
          <span className="font-medium">{tip.author}:</span> &ldquo;{tip.quote}&rdquo;
        </p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {tip.sourceUrl ? (
            <span className="text-sm text-emerald-600 dark:text-emerald-400">
              {tip.sourceLabel ?? t("tips.openSource")}
            </span>
          ) : null}
          <Badge variant="outline">{tipCategoryLabel(tip.category, t)}</Badge>
        </div>
      </CardContent>
    </Card>
  );

  if (!tip.sourceUrl) {
    return content;
  }

  return (
    <a
      href={tip.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      aria-label={`${t("tips.openSource")}: ${tip.sourceLabel ?? tip.author}`}
    >
      {content}
    </a>
  );
}

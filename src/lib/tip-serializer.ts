import type { Tip } from "@/generated/prisma/client";
import type { SerializedTip, TipCategory } from "@/types/tips";

export function serializeTip(record: Tip): SerializedTip {
  return {
    id: record.id,
    quote: record.quote,
    author: record.author,
    category: record.category as TipCategory,
    sourceUrl: record.sourceUrl,
    sourceLabel: record.sourceLabel,
    active: record.active,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

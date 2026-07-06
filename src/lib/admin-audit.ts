import "server-only";

import type { AdminAuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { AdminEntityType } from "@/lib/admin-audit.shared";

export * from "@/lib/admin-audit.shared";

type LogAdminActionInput = {
  userId: string;
  action: AdminAuditAction;
  entityType: AdminEntityType | string;
  entityId: string;
  entityLabel?: string;
  parentType?: string;
  parentId?: string;
  before?: unknown;
  after?: unknown;
};

function isDecimalLike(value: unknown): value is { toNumber: () => number } {
  return (
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value &&
    typeof (value as { toNumber: unknown }).toNumber === "function"
  );
}

/** Normalizes Prisma records / decimals for JSON audit storage. */
export function toAuditSnapshot(value: unknown): unknown {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isDecimalLike(value)) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map(toAuditSnapshot);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(record)) {
      if (key.startsWith("_")) continue;
      output[key] = toAuditSnapshot(nested);
    }

    return output;
  }

  return value;
}

export async function logAdminAction(input: LogAdminActionInput) {
  const before =
    input.before === undefined ? undefined : (toAuditSnapshot(input.before) as Prisma.InputJsonValue);
  const after =
    input.after === undefined ? undefined : (toAuditSnapshot(input.after) as Prisma.InputJsonValue);

  await prisma.adminAuditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      parentType: input.parentType,
      parentId: input.parentId,
      before,
      after,
    },
  });
}

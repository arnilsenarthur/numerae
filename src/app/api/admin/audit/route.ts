import { NextResponse } from "next/server";
import { serializeAdminAuditLog } from "@/lib/admin-audit.shared";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 100), 200);
  const entityType = searchParams.get("entityType")?.trim();
  const entityId = searchParams.get("entityId")?.trim();

  const logs = await prisma.adminAuditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    logs: logs.map(serializeAdminAuditLog),
  });
}

import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/db";

export async function syncTokenWithUser(token: JWT): Promise<JWT> {
  if (!token.id) return token;

  try {
    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { role: true, active: true, name: true, email: true },
    });

    if (!user) return token;

    token.role = user.role;
    token.active = user.active;
    token.name = user.name;
    token.email = user.email;
  } catch (error) {
    console.error("[auth] Failed to sync session user:", error);
  }

  return token;
}

import type { JWT } from "next-auth/jwt";
import { prisma } from "@/lib/db";

/** Marks token as invalid — session callbacks should treat this as logged out. */
export function invalidateToken(token: JWT): JWT {
  delete token.id;
  delete token.role;
  delete token.active;
  token.error = "SessionExpired";
  return token;
}

export function isTokenValid(token: JWT): boolean {
  return Boolean(token.id) && token.error !== "SessionExpired";
}

export async function syncTokenWithUser(token: JWT): Promise<JWT> {
  if (!token.id) return token;

  try {
    const user = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { role: true, active: true, name: true, email: true },
    });

    if (!user || !user.active) {
      return invalidateToken(token);
    }

    token.role = user.role;
    token.active = user.active;
    token.name = user.name;
    token.email = user.email;
    delete token.error;
  } catch (error) {
    console.error("[auth] Failed to sync session user:", error);
  }

  return token;
}

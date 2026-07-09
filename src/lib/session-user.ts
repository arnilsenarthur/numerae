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

// Short-lived in-memory cache for user DB lookups inside the JWT callback.
// Each API request triggers auth() → jwt() → syncTokenWithUser(), so without
// caching this adds 1 DB query per HTTP request. 60 s TTL is a safe trade-off:
// role/active changes take at most 60 s to propagate.
type CachedUser = {
  role: string;
  active: boolean;
  name: string | null;
  email: string | null;
  expiresAt: number;
};
const userCache = new Map<string, CachedUser>();
const USER_CACHE_TTL_MS = 60_000;

export async function syncTokenWithUser(token: JWT): Promise<JWT> {
  if (!token.id) return token;

  const userId = token.id as string;
  const now = Date.now();
  const cached = userCache.get(userId);

  if (cached && cached.expiresAt > now) {
    if (!cached.active) return invalidateToken(token);
    token.role = cached.role;
    token.active = cached.active;
    token.name = cached.name;
    token.email = cached.email;
    delete token.error;
    return token;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, active: true, name: true, email: true },
    });

    if (!user || !user.active) {
      userCache.delete(userId);
      return invalidateToken(token);
    }

    userCache.set(userId, {
      role: user.role,
      active: user.active,
      name: user.name,
      email: user.email,
      expiresAt: now + USER_CACHE_TTL_MS,
    });

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

/** Call this whenever a user's role or active status changes so the next
 *  request re-reads from the DB rather than serving stale cached data. */
export function invalidateUserCache(userId: string): void {
  userCache.delete(userId);
}

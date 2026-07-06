const STORAGE_KEY = "numerae:pending-auth";
const MAX_AGE_MS = 30 * 60 * 1000;

type PendingAuth = {
  email: string;
  password: string;
  ts: number;
};

export function storePendingAuth(email: string, password: string) {
  if (typeof window === "undefined") return;

  const payload: PendingAuth = {
    email: email.trim().toLowerCase(),
    password,
    ts: Date.now(),
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function consumePendingAuth(email: string): string | null {
  if (typeof window === "undefined") return null;

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw) as PendingAuth;
    const normalizedEmail = email.trim().toLowerCase();
    const expired = Date.now() - data.ts > MAX_AGE_MS;

    if (data.email === normalizedEmail && !expired) {
      sessionStorage.removeItem(STORAGE_KEY);
      return data.password;
    }
  } catch {
    // Ignore malformed storage entries.
  }

  sessionStorage.removeItem(STORAGE_KEY);
  return null;
}

export function clearPendingAuth() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export const USER_ROLES = ["USER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isAdminRole(role?: string | null): role is "ADMIN" {
  return role === "ADMIN";
}

export function resolveBootstrapRole(email: string): UserRole {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && email === adminEmail) return "ADMIN";
  return "USER";
}

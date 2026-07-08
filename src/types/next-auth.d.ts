import { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/user-roles";

declare module "next-auth" {
  interface User {
    role: UserRole;
    active: boolean;
  }

  interface Session {
    user: {
      id: string;
      role: UserRole;
      active: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    active?: boolean;
    error?: "SessionExpired";
  }
}

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-roles";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) };
  }

  if (!isAdminRole(session.user.role)) {
    return { error: NextResponse.json({ error: "Acesso negado." }, { status: 403 }) };
  }

  return { session };
}

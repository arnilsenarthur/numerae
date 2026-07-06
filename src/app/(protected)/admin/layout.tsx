import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/admin/institutions");
  }

  if (!session.user.active) {
    redirect("/login?error=disabled");
  }

  if (!isAdminRole(session.user.role)) {
    redirect("/dashboard");
  }

  return children;
}

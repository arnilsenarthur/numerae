import { redirect } from "next/navigation";
import { PublicShell } from "@/components/layout/public-shell";
import { auth } from "@/lib/auth";
import { HomePageContent } from "@/modules/landing/components/home-page-content";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <PublicShell>
      <HomePageContent />
    </PublicShell>
  );
}
